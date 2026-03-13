"""
Centralized Logging Configuration for BantuBuzz Platform
Provides comprehensive error tracking and debugging capabilities
"""
import logging
from logging.handlers import RotatingFileHandler
import os
from datetime import datetime
import traceback
import sys


class RequestFormatter(logging.Formatter):
    """Custom formatter that includes request context"""

    def format(self, record):
        # Add request context if available
        try:
            from flask import has_request_context, request
            if has_request_context():
                record.url = request.url
                record.method = request.method
                record.ip = request.remote_addr
                record.user_agent = request.headers.get('User-Agent', 'Unknown')
            else:
                record.url = 'N/A'
                record.method = 'N/A'
                record.ip = 'N/A'
                record.user_agent = 'N/A'
        except:
            record.url = 'N/A'
            record.method = 'N/A'
            record.ip = 'N/A'
            record.user_agent = 'N/A'

        return super().format(record)


def setup_logging(app):
    """
    Configure comprehensive logging for the Flask application

    Creates multiple log files:
    - app_error.log: All errors and exceptions (ERROR level and above)
    - app_access.log: All API requests and responses (INFO level)
    - app_debug.log: Detailed debugging information (DEBUG level)
    """

    # Create logs directory if it doesn't exist
    log_dir = os.path.join(app.root_path, '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)

    # Remove default Flask handlers
    app.logger.handlers.clear()

    # Set base logging level
    app.logger.setLevel(logging.DEBUG if app.debug else logging.INFO)

    # 1. ERROR LOG - Rotating file handler for errors
    error_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app_error.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_formatter = RequestFormatter(
        '[%(asctime)s] %(levelname)s in %(module)s [%(funcName)s]:\n'
        'URL: %(url)s | Method: %(method)s | IP: %(ip)s\n'
        'Message: %(message)s\n'
        '---'
    )
    error_handler.setFormatter(error_formatter)
    app.logger.addHandler(error_handler)

    # 2. ACCESS LOG - All requests
    access_handler = RotatingFileHandler(
        os.path.join(log_dir, 'app_access.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    access_handler.setLevel(logging.INFO)
    access_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s: %(message)s'
    )
    access_handler.setFormatter(access_formatter)
    app.logger.addHandler(access_handler)

    # 3. DEBUG LOG - Detailed debugging (only in debug mode)
    if app.debug:
        debug_handler = RotatingFileHandler(
            os.path.join(log_dir, 'app_debug.log'),
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=3
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_formatter = RequestFormatter(
            '[%(asctime)s] %(levelname)s in %(module)s.%(funcName)s (line %(lineno)d):\n'
            'URL: %(url)s | Method: %(method)s\n'
            'Message: %(message)s\n'
        )
        debug_handler.setFormatter(debug_formatter)
        app.logger.addHandler(debug_handler)

    # 4. CONSOLE HANDLER - Print to stdout in development
    if app.debug:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_formatter = logging.Formatter(
            '[%(levelname)s] %(module)s: %(message)s'
        )
        console_handler.setFormatter(console_formatter)
        app.logger.addHandler(console_handler)

    app.logger.info('=' * 80)
    app.logger.info(f'BantuBuzz Application Started - {datetime.utcnow()}')
    app.logger.info(f'Environment: {"Development" if app.debug else "Production"}')
    app.logger.info(f'Log Directory: {log_dir}')
    app.logger.info('=' * 80)

    return app.logger


def log_exception(app, exception, context=""):
    """
    Log an exception with full traceback and context

    Args:
        app: Flask app instance
        exception: The exception object
        context: Additional context string
    """
    error_details = {
        'type': type(exception).__name__,
        'message': str(exception),
        'traceback': traceback.format_exc(),
        'context': context
    }

    app.logger.error(
        f"EXCEPTION CAUGHT:\n"
        f"Type: {error_details['type']}\n"
        f"Message: {error_details['message']}\n"
        f"Context: {error_details['context']}\n"
        f"Traceback:\n{error_details['traceback']}"
    )

    return error_details


def log_request(app):
    """Log incoming request details"""
    try:
        from flask import request
        app.logger.info(
            f"{request.method} {request.path} | "
            f"IP: {request.remote_addr} | "
            f"User-Agent: {request.headers.get('User-Agent', 'Unknown')[:50]}"
        )
    except:
        pass


def log_response(app, response):
    """Log response details"""
    try:
        from flask import request
        app.logger.info(
            f"Response: {response.status_code} | "
            f"{request.method} {request.path} | "
            f"Size: {response.content_length or 0} bytes"
        )
    except:
        pass
