const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// CORS configuration - allow both development and production origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.CORS_ORIGIN // Production frontend URL from .env
].filter(Boolean); // Remove undefined values

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// Socket.IO setup with CORS
const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// PostgreSQL Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

// JWT Secret (should match Flask backend)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

// Store active socket connections
const activeUsers = new Map(); // userId -> socketId

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Authenticate user on connection
  socket.on('authenticate', (token) => {
    const decoded = verifyToken(token);

    if (decoded) {
      socket.userId = decoded.sub; // user_id from JWT
      activeUsers.set(socket.userId.toString(), socket.id);

      socket.emit('authenticated', {
        success: true,
        userId: socket.userId
      });

      console.log(`User ${socket.userId} authenticated and connected`);

      // Emit user online status
      io.emit('user_status', {
        userId: socket.userId,
        status: 'online'
      });
    } else {
      socket.emit('authenticated', {
        success: false,
        error: 'Invalid token'
      });
      socket.disconnect();
    }
  });

  // Handle sending messages
  socket.on('send_message', async (data) => {
    try {
      const { receiverId, content, bookingId } = data;

      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Save message to database (PostgreSQL)
      const insertQuery = `
        INSERT INTO messages (sender_id, receiver_id, booking_id, content, is_read, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;

      const insertResult = await pool.query(insertQuery, [socket.userId, receiverId, bookingId || null, content, false]);
      const messageId = insertResult.rows[0].id;

      // Fetch the complete message with sender info
      const fetchQuery = `
        SELECT m.*, u.email as sender_email, u.user_type as sender_type
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [messageId]);
      const message = fetchResult.rows[0];

      const messageData = {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        booking_id: message.booking_id,
        content: message.content,
        is_read: message.is_read,
        created_at: message.created_at,
        sender: {
          email: message.sender_email,
          user_type: message.sender_type
        }
      };

      // Send to sender (confirmation)
      socket.emit('message_sent', messageData);

      // Send to receiver if online
      const receiverSocketId = activeUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', messageData);
      }

      console.log(`Message ${messageId} sent from ${socket.userId} to ${receiverId}`);
    } catch (error) {
      console.error('Error in send_message:', error);
      socket.emit('error', { message: 'Server error' });
    }
  });

  // Handle marking messages as read
  socket.on('mark_read', async (data) => {
    try {
      const { messageIds } = data;

      if (!socket.userId || !messageIds || messageIds.length === 0) {
        return;
      }

      const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `UPDATE messages SET is_read = true WHERE id IN (${placeholders}) AND receiver_id = $${messageIds.length + 1}`;

      await pool.query(query, [...messageIds, socket.userId]);
      socket.emit('messages_marked_read', { messageIds });
    } catch (error) {
      console.error('Error in mark_read:', error);
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;
    const receiverSocketId = activeUsers.get(receiverId.toString());

    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user_typing', {
        userId: socket.userId,
        isTyping
      });
    }
  });

  // Handle real-time notifications
  socket.on('send_notification', (notification) => {
    const { userId, title, message, type, link } = notification;
    const targetSocketId = activeUsers.get(userId.toString());

    if (targetSocketId) {
      io.to(targetSocketId).emit('new_notification', {
        title,
        message,
        type,
        link,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    if (socket.userId) {
      activeUsers.delete(socket.userId.toString());

      // Emit user offline status
      io.emit('user_status', {
        userId: socket.userId,
        status: 'offline'
      });

      console.log(`User ${socket.userId} disconnected`);
    }
    console.log('Client disconnected:', socket.id);
  });
});

// REST API Endpoints

// Get conversation messages between two users
app.get('/api/conversations/:userId', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentUserId = decoded.sub;
    const otherUserId = req.params.userId;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const query = `
      SELECT m.*,
             sender.email as sender_email, sender.user_type as sender_type,
             receiver.email as receiver_email, receiver.user_type as receiver_type
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      WHERE (m.sender_id = $1 AND m.receiver_id = $2)
         OR (m.sender_id = $2 AND m.receiver_id = $1)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [currentUserId, otherUserId, limit, offset]);
    const messages = result.rows;

    const formattedMessages = messages.map(m => ({
      id: m.id,
      sender_id: m.sender_id,
      receiver_id: m.receiver_id,
      booking_id: m.booking_id,
      content: m.content,
      is_read: m.is_read,
      created_at: m.created_at,
      sender: {
        email: m.sender_email,
        user_type: m.sender_type
      },
      receiver: {
        email: m.receiver_email,
        user_type: m.receiver_type
      }
    }));

    res.json({ messages: formattedMessages.reverse() }); // Reverse to get chronological order
  } catch (error) {
    console.error('Error in get conversation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all conversations for a user
app.get('/api/conversations', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decoded.sub;

    // Get all unique conversations with basic info
    const query = `
      WITH conversation_partners AS (
        SELECT DISTINCT
          CASE
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END as other_user_id
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      )
      SELECT
        cp.other_user_id as id,
        u.email as email,
        u.user_type as user_type,
        (SELECT content FROM messages
         WHERE (sender_id = $1 AND receiver_id = cp.other_user_id)
            OR (sender_id = cp.other_user_id AND receiver_id = $1)
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages
         WHERE (sender_id = $1 AND receiver_id = cp.other_user_id)
            OR (sender_id = cp.other_user_id AND receiver_id = $1)
         ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages
         WHERE sender_id = cp.other_user_id AND receiver_id = $1 AND is_read = false) as unread_count
      FROM conversation_partners cp
      JOIN users u ON u.id = cp.other_user_id
      ORDER BY last_message_time DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error in get conversations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'messaging-service',
    activeUsers: activeUsers.size
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Messaging service running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    await pool.end();
    console.log('Server closed');
  });
});
