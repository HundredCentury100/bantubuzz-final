"""
Request Log Model - Stores all API requests, errors, and system events
"""
from app import db
from datetime import datetime
import json


class RequestLog(db.Model):
    __tablename__ = 'request_logs'

    id = db.Column(db.Integer, primary_key=True)

    # Request Information
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    method = db.Column(db.String(10))  # GET, POST, PUT, DELETE, etc.
    endpoint = db.Column(db.String(500), index=True)  # /api/creators/profile
    full_url = db.Column(db.Text)  # Full URL with query params

    # Client Information
    ip_address = db.Column(db.String(50), index=True)
    user_agent = db.Column(db.Text)
    referrer = db.Column(db.Text)

    # User Information (if authenticated)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    user_email = db.Column(db.String(255))
    user_type = db.Column(db.String(20))  # brand, creator, admin

    # Request/Response Details
    request_body = db.Column(db.Text)  # JSON body (sanitized - no passwords)
    request_headers = db.Column(db.Text)  # JSON headers
    response_status = db.Column(db.Integer, index=True)  # 200, 404, 500, etc.
    response_time_ms = db.Column(db.Integer)  # Response time in milliseconds

    # Error Information
    is_error = db.Column(db.Boolean, default=False, index=True)
    error_type = db.Column(db.String(100))  # Exception class name
    error_message = db.Column(db.Text)
    error_traceback = db.Column(db.Text)

    # Service Information
    service_name = db.Column(db.String(50), default='backend', index=True)  # backend, messaging, celery
    worker_pid = db.Column(db.Integer)  # Process ID of worker

    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'method': self.method,
            'endpoint': self.endpoint,
            'full_url': self.full_url,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'user_id': self.user_id,
            'user_email': self.user_email,
            'user_type': self.user_type,
            'response_status': self.response_status,
            'response_time_ms': self.response_time_ms,
            'is_error': self.is_error,
            'error_type': self.error_type,
            'error_message': self.error_message,
            'service_name': self.service_name,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f'<RequestLog {self.method} {self.endpoint} - {self.response_status}>'
