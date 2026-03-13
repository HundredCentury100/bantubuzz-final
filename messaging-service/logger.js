/**
 * Centralized Logging Configuration for BantuBuzz Messaging Service
 * Provides comprehensive error tracking and debugging capabilities
 */

const fs = require('fs');
const path = require('path');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, 'logs');
        this.ensureLogDirectory();

        this.levels = {
            ERROR: 'ERROR',
            WARN: 'WARN',
            INFO: 'INFO',
            DEBUG: 'DEBUG'
        };
    }

    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, metadata = {}) {
        const timestamp = new Date().toISOString();
        const metaStr = Object.keys(metadata).length > 0
            ? `\n${JSON.stringify(metadata, null, 2)}`
            : '';
        return `[${timestamp}] ${level}: ${message}${metaStr}\n`;
    }

    writeToFile(filename, content) {
        const filepath = path.join(this.logDir, filename);
        fs.appendFileSync(filepath, content);
    }

    error(message, error = null, metadata = {}) {
        const errorDetails = error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...metadata
        } : metadata;

        const logMessage = this.formatMessage(this.levels.ERROR, message, errorDetails);

        // Write to error log
        this.writeToFile('messaging_error.log', logMessage);

        // Also write to console
        console.error(`❌ ${message}`, error || '');

        return logMessage;
    }

    warn(message, metadata = {}) {
        const logMessage = this.formatMessage(this.levels.WARN, message, metadata);
        this.writeToFile('messaging_access.log', logMessage);
        console.warn(`⚠️  ${message}`);
        return logMessage;
    }

    info(message, metadata = {}) {
        const logMessage = this.formatMessage(this.levels.INFO, message, metadata);
        this.writeToFile('messaging_access.log', logMessage);
        console.log(`ℹ️  ${message}`);
        return logMessage;
    }

    debug(message, metadata = {}) {
        if (process.env.NODE_ENV !== 'production') {
            const logMessage = this.formatMessage(this.levels.DEBUG, message, metadata);
            this.writeToFile('messaging_debug.log', logMessage);
            console.log(`🔍 ${message}`);
            return logMessage;
        }
    }

    // Log socket events
    socketEvent(event, data = {}) {
        this.info(`Socket Event: ${event}`, {
            event,
            userId: data.userId || 'unknown',
            socketId: data.socketId || 'unknown',
            timestamp: new Date().toISOString()
        });
    }

    // Log HTTP requests
    httpRequest(req, res) {
        const logData = {
            method: req.method,
            url: req.url,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            statusCode: res.statusCode,
            timestamp: new Date().toISOString()
        };

        this.info(`HTTP ${req.method} ${req.url}`, logData);
    }

    // Log message events
    messageEvent(action, data = {}) {
        this.info(`Message ${action}`, {
            action,
            conversationId: data.conversationId || 'unknown',
            senderId: data.senderId || 'unknown',
            receiverId: data.receiverId || 'unknown',
            timestamp: new Date().toISOString()
        });
    }

    // Startup banner
    startup(port) {
        const banner = `
${'='.repeat(80)}
BantuBuzz Messaging Service Started
Port: ${port}
Environment: ${process.env.NODE_ENV || 'development'}
Log Directory: ${this.logDir}
Time: ${new Date().toISOString()}
${'='.repeat(80)}
`;
        console.log(banner);
        this.info('Messaging service started', { port, environment: process.env.NODE_ENV });
    }
}

// Create singleton instance
const logger = new Logger();

// Export logger instance and helper middleware
module.exports = logger;

// Express middleware for request logging
module.exports.requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path}`, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip
        });
    });

    next();
};

// Socket.io middleware for connection logging
module.exports.socketLogger = (socket, next) => {
    logger.info('Socket Connection', {
        socketId: socket.id,
        userId: socket.handshake.query.userId || 'unknown',
        transport: socket.conn.transport.name
    });

    next();
};
