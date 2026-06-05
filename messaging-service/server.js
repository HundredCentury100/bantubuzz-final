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
      const {
        receiverId,
        content,
        bookingId,
        messageType,
        attachmentUrl,
        attachmentType,
        attachmentName,
        attachmentMimeType,
        attachmentSize,
        linkUrl,
        linkTitle,
        linkDescription,
        linkImage
      } = data;

      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Save message to database (PostgreSQL)
      const insertQuery = `
        INSERT INTO messages (
          sender_id, receiver_id, booking_id, message_type, content, is_read,
          attachment_url, attachment_type, attachment_name, attachment_mime_type, attachment_size,
          link_url, link_title, link_description, link_image, created_at
        )
        VALUES ($1, $2, $3, $4, $5, false, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING id
      `;

      const insertResult = await pool.query(insertQuery, [
        socket.userId,
        receiverId,
        bookingId || null,
        messageType || 'text',
        content || attachmentName || linkUrl || '',
        attachmentUrl || null,
        attachmentType || null,
        attachmentName || null,
        attachmentMimeType || null,
        attachmentSize || null,
        linkUrl || null,
        linkTitle || null,
        linkDescription || null,
        linkImage || null
      ]);
      const messageId = insertResult.rows[0].id;

      // Fetch the complete message with sender info
      const fetchQuery = `
        SELECT m.*,
               u.email as sender_email,
               u.user_type as sender_type,
               CASE
                 WHEN u.user_type = 'brand' THEN bp.company_name
                 WHEN u.user_type = 'creator' THEN cpr.username
                 ELSE NULL
               END as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        LEFT JOIN brand_profiles bp ON bp.user_id = u.id AND u.user_type = 'brand'
        LEFT JOIN creator_profiles cpr ON cpr.user_id = u.id AND u.user_type = 'creator'
        WHERE m.id = $1
      `;

      const fetchResult = await pool.query(fetchQuery, [messageId]);
      const message = fetchResult.rows[0];

      const messageData = {
        id: message.id,
        sender_id: message.sender_id,
        receiver_id: message.receiver_id,
        booking_id: message.booking_id,
        custom_request_id: message.custom_request_id,
        custom_offer_id: message.custom_offer_id,
        message_type: message.message_type || 'text',
        content: message.content,
        is_read: message.is_read,
        read_at: message.read_at,
        attachment_url: message.attachment_url,
        attachment_type: message.attachment_type,
        attachment_name: message.attachment_name,
        attachment_mime_type: message.attachment_mime_type,
        attachment_size: message.attachment_size,
        link_url: message.link_url,
        link_title: message.link_title,
        link_description: message.link_description,
        link_image: message.link_image,
        created_at: message.created_at,
        sender: {
          email: message.sender_email,
          user_type: message.sender_type,
          name: message.sender_name
        }
      };

      // Send to sender (confirmation)
      socket.emit('message_sent', messageData);

      // Send to receiver if online
      const receiverSocketId = activeUsers.get(receiverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', messageData);
      }

      try {
        const flaskBackendUrl = process.env.FLASK_BACKEND_URL || 'http://localhost:8002';
        const response = await fetch(`${flaskBackendUrl}/api/internal/trigger-email-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service': process.env.INTERNAL_SERVICE_SECRET || 'messaging-service-secret'
          },
          body: JSON.stringify({
            recipient_user_id: receiverId,
            sender_name: message.sender_name || 'A user',
            sender_type: message.sender_type,
            message_preview: content
          })
        });

        if (!response.ok) {
          console.error(`Failed to trigger message notification: ${response.status}`);
        }
      } catch (notificationError) {
        console.error(`Failed to trigger message notification: ${notificationError.message}`);
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
      const query = `
        UPDATE messages
        SET is_read = true, read_at = COALESCE(read_at, NOW())
        WHERE id IN (${placeholders}) AND receiver_id = $${messageIds.length + 1}
        RETURNING id, sender_id, receiver_id, read_at
      `;

      const result = await pool.query(query, [...messageIds, socket.userId]);
      const readAt = result.rows[0]?.read_at || new Date();
      socket.emit('messages_marked_read', { messageIds, readAt });

      const readsBySender = result.rows.reduce((acc, row) => {
        const senderId = row.sender_id.toString();
        if (!acc[senderId]) acc[senderId] = [];
        acc[senderId].push(row.id);
        return acc;
      }, {});

      Object.entries(readsBySender).forEach(([senderId, ids]) => {
        const senderSocketId = activeUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', {
            messageIds: ids,
            readBy: socket.userId,
            readAt
          });
        }
      });
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
             sender.email as sender_email,
             sender.user_type as sender_type,
             CASE
               WHEN sender.user_type = 'brand' THEN sender_bp.company_name
               WHEN sender.user_type = 'creator' THEN sender_cp.username
               ELSE NULL
             END as sender_name,
             receiver.email as receiver_email,
             receiver.user_type as receiver_type,
             CASE
               WHEN receiver.user_type = 'brand' THEN receiver_bp.company_name
               WHEN receiver.user_type = 'creator' THEN receiver_cp.username
               ELSE NULL
             END as receiver_name
      FROM messages m
      JOIN users sender ON m.sender_id = sender.id
      JOIN users receiver ON m.receiver_id = receiver.id
      LEFT JOIN brand_profiles sender_bp ON sender_bp.user_id = sender.id AND sender.user_type = 'brand'
      LEFT JOIN creator_profiles sender_cp ON sender_cp.user_id = sender.id AND sender.user_type = 'creator'
      LEFT JOIN brand_profiles receiver_bp ON receiver_bp.user_id = receiver.id AND receiver.user_type = 'brand'
      LEFT JOIN creator_profiles receiver_cp ON receiver_cp.user_id = receiver.id AND receiver.user_type = 'creator'
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
      custom_request_id: m.custom_request_id,
      custom_offer_id: m.custom_offer_id,
      message_type: m.message_type || 'text',
      content: m.content,
      is_read: m.is_read,
      attachment_url: m.attachment_url,
      attachment_type: m.attachment_type,
      attachment_name: m.attachment_name,
      attachment_mime_type: m.attachment_mime_type,
      attachment_size: m.attachment_size,
      link_url: m.link_url,
      link_title: m.link_title,
      link_description: m.link_description,
      link_image: m.link_image,
      read_at: m.read_at,
      created_at: m.created_at,
      sender: {
        email: m.sender_email,
        user_type: m.sender_type,
        name: m.sender_name
      },
      receiver: {
        email: m.receiver_email,
        user_type: m.receiver_type,
        name: m.receiver_name
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
        CASE
          WHEN u.user_type = 'brand' THEN bp.company_name
          WHEN u.user_type = 'creator' THEN cpr.username
          ELSE NULL
        END as display_name,
        CASE
          WHEN u.user_type = 'brand' THEN bp.company_name
          WHEN u.user_type = 'creator' THEN cpr.username
          ELSE NULL
        END as username,
        CASE
          WHEN u.user_type = 'brand' THEN bp.company_name
          ELSE NULL
        END as company_name,
        CASE
          WHEN u.user_type = 'brand' THEN bp.logo
          WHEN u.user_type = 'creator' THEN cpr.profile_picture
          ELSE NULL
        END as profile_picture,
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
      LEFT JOIN brand_profiles bp ON bp.user_id = u.id AND u.user_type = 'brand'
      LEFT JOIN creator_profiles cpr ON cpr.user_id = u.id AND u.user_type = 'creator'
      ORDER BY last_message_time DESC
    `;

    const result = await pool.query(query, [userId]);
    res.json({ conversations: result.rows });
  } catch (error) {
    console.error('Error in get conversations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark messages as read through REST fallback
app.post('/api/messages/read', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = decoded.sub;
    const messageIds = req.body.messageIds || req.body.message_ids || [];
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ message: 'No messages to mark as read', updated: 0 });
    }

    const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      UPDATE messages
      SET is_read = true, read_at = COALESCE(read_at, NOW())
      WHERE id IN (${placeholders}) AND receiver_id = $${messageIds.length + 1}
      RETURNING id, sender_id, receiver_id, read_at
    `;
    const result = await pool.query(query, [...messageIds, userId]);
    const readAt = result.rows[0]?.read_at || new Date();

    const readsBySender = result.rows.reduce((acc, row) => {
      const senderId = row.sender_id.toString();
      if (!acc[senderId]) acc[senderId] = [];
      acc[senderId].push(row.id);
      return acc;
    }, {});

    Object.entries(readsBySender).forEach(([senderId, ids]) => {
      const senderSocketId = activeUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages_read', {
          messageIds: ids,
          readBy: userId,
          readAt
        });
      }
    });

    res.json({
      message: 'Messages marked as read',
      updated: result.rowCount,
      messageIds,
      readAt
    });
  } catch (error) {
    console.error('Error in REST mark read:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Internal endpoint for Flask backend to broadcast messages via WebSocket
app.post('/api/internal/broadcast-message', async (req, res) => {
  try {
    const messageData = req.body;

    if (!messageData || !messageData.sender_id || !messageData.receiver_id) {
      return res.status(400).json({ error: 'Invalid message data' });
    }

    console.log('📢 Broadcasting message via internal API:', messageData.id);

    // Send to receiver
    const receiverSocketId = activeUsers.get(messageData.receiver_id.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('new_message', messageData);
      console.log(`  ✓ Sent to receiver ${messageData.receiver_id}`);
    }

    // Send confirmation to sender
    const senderSocketId = activeUsers.get(messageData.sender_id.toString());
    if (senderSocketId) {
      io.to(senderSocketId).emit('message_sent', messageData);
      console.log(`  ✓ Sent confirmation to sender ${messageData.sender_id}`);
    }

    res.json({ success: true, message: 'Message broadcast successfully' });
  } catch (error) {
    console.error('Error broadcasting message:', error);
    res.status(500).json({ error: 'Failed to broadcast message' });
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
