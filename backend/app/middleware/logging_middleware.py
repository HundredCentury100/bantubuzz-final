"""
Comprehensive Logging Middleware
Logs every request, response, and error in the system
"""
from flask import request, g
from datetime import datetime
import time
import json
import traceback
import os
from app import db
from app.models.request_log import RequestLog


class LoggingMiddleware:
    """Middleware to log all requests and responses"""

    SENSITIVE_FIELDS = ['password', 'token', 'secret', 'api_key', 'authorization']

    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize the logging middleware"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.errorhandler(Exception)(self.handle_exception)

    def before_request(self):
        """Called before each request - start timer"""
        g.start_time = time.time()

    def after_request(self, response):
        """Called after each request - log the request"""
        try:
            # Calculate response time
            if hasattr(g, 'start_time'):
                response_time_ms = int((time.time() - g.start_time) * 1000)
            else:
                response_time_ms = 0

            # Get user information from JWT if available
            user_id = None
            user_email = None
            user_type = None

            try:
                from flask_jwt_extended import get_jwt_identity, get_jwt
                user_id = get_jwt_identity()
                jwt_data = get_jwt()
                user_type = jwt_data.get('user_type')

                if user_id:
                    from app.models import User
                    user = User.query.get(user_id)
                    if user:
                        user_email = user.email
            except:
                pass  # Not authenticated or JWT not available

            # Sanitize request body
            request_body = None
            if request.is_json:
                try:
                    body_data = request.get_json()
                    request_body = self._sanitize_data(body_data)
                except:
                    request_body = None

            # Get request headers (sanitized)
            headers = dict(request.headers)
            sanitized_headers = self._sanitize_data(headers)

            # Create log entry
            log_entry = RequestLog(
                timestamp=datetime.utcnow(),
                method=request.method,
                endpoint=request.endpoint or request.path,
                full_url=request.url,
                ip_address=self._get_client_ip(),
                user_agent=request.headers.get('User-Agent', ''),
                referrer=request.headers.get('Referer', ''),
                user_id=user_id,
                user_email=user_email,
                user_type=user_type,
                request_body=json.dumps(request_body) if request_body else None,
                request_headers=json.dumps(sanitized_headers),
                response_status=response.status_code,
                response_time_ms=response_time_ms,
                is_error=(response.status_code >= 400),
                service_name='backend',
                worker_pid=os.getpid()
            )

            db.session.add(log_entry)
            db.session.commit()

        except Exception as e:
            # Don't let logging errors break the application
            print(f"Logging error: {str(e)}")
            try:
                db.session.rollback()
            except:
                pass

        return response

    def handle_exception(self, error):
        """Handle exceptions and log them"""
        try:
            # Calculate response time
            if hasattr(g, 'start_time'):
                response_time_ms = int((time.time() - g.start_time) * 1000)
            else:
                response_time_ms = 0

            # Get user information
            user_id = None
            user_email = None
            user_type = None

            try:
                from flask_jwt_extended import get_jwt_identity, get_jwt
                user_id = get_jwt_identity()
                jwt_data = get_jwt()
                user_type = jwt_data.get('user_type')

                if user_id:
                    from app.models import User
                    user = User.query.get(user_id)
                    if user:
                        user_email = user.email
            except:
                pass

            # Get traceback
            tb = traceback.format_exc()

            # Sanitize request body
            request_body = None
            if request.is_json:
                try:
                    body_data = request.get_json()
                    request_body = self._sanitize_data(body_data)
                except:
                    request_body = None

            # Create error log entry
            log_entry = RequestLog(
                timestamp=datetime.utcnow(),
                method=request.method,
                endpoint=request.endpoint or request.path,
                full_url=request.url,
                ip_address=self._get_client_ip(),
                user_agent=request.headers.get('User-Agent', ''),
                referrer=request.headers.get('Referer', ''),
                user_id=user_id,
                user_email=user_email,
                user_type=user_type,
                request_body=json.dumps(request_body) if request_body else None,
                response_status=500,
                response_time_ms=response_time_ms,
                is_error=True,
                error_type=type(error).__name__,
                error_message=str(error),
                error_traceback=tb,
                service_name='backend',
                worker_pid=os.getpid()
            )

            db.session.add(log_entry)
            db.session.commit()

        except Exception as log_error:
            print(f"Error logging exception: {str(log_error)}")
            try:
                db.session.rollback()
            except:
                pass

        # Re-raise the exception to be handled by Flask's error handlers
        raise error

    def _get_client_ip(self):
        """Get the real client IP address"""
        if request.headers.get('X-Forwarded-For'):
            return request.headers.get('X-Forwarded-For').split(',')[0].strip()
        elif request.headers.get('X-Real-IP'):
            return request.headers.get('X-Real-IP')
        else:
            return request.remote_addr

    def _sanitize_data(self, data):
        """Remove sensitive fields from data"""
        if isinstance(data, dict):
            sanitized = {}
            for key, value in data.items():
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_FIELDS):
                    sanitized[key] = '***REDACTED***'
                elif isinstance(value, (dict, list)):
                    sanitized[key] = self._sanitize_data(value)
                else:
                    sanitized[key] = value
            return sanitized
        elif isinstance(data, list):
            return [self._sanitize_data(item) for item in data]
        else:
            return data
