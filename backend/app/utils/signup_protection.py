import hashlib
import threading
import time

import redis
from flask import current_app, request


class SignupProtectionError(Exception):
    """Raised when local signup abuse controls reject a request."""

    def __init__(self, message, status_code=429):
        super().__init__(message)
        self.status_code = status_code


_memory_lock = threading.Lock()
_memory_counters = {}


def _client_ip():
    forwarded_for = request.headers.get('X-Forwarded-For', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.headers.get('X-Real-IP') or request.remote_addr or 'unknown'


def _safe_key(value):
    normalized = (value or 'unknown').strip().lower()
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()[:32]


def _redis_client():
    redis_url = current_app.config.get('REDIS_URL')
    if not redis_url:
        return None
    try:
        return redis.from_url(redis_url, socket_connect_timeout=1, socket_timeout=1)
    except redis.RedisError as exc:
        current_app.logger.warning('Signup rate-limit Redis client unavailable: %s', exc)
        return None


def _increment_counter(key, window_seconds):
    client = _redis_client()
    if client:
        try:
            value = client.incr(key)
            if value == 1:
                client.expire(key, window_seconds)
            ttl = client.ttl(key)
            return value, max(ttl, 0)
        except redis.RedisError as exc:
            current_app.logger.warning('Signup rate-limit Redis write failed: %s', exc)

    now = time.time()
    expires_at = now + window_seconds
    with _memory_lock:
        value, current_expires_at = _memory_counters.get(key, (0, expires_at))
        if current_expires_at <= now:
            value = 0
            current_expires_at = expires_at
        value += 1
        _memory_counters[key] = (value, current_expires_at)
        return value, int(max(current_expires_at - now, 0))


def check_signup_honeypot(data):
    fields = current_app.config.get('SIGNUP_HONEYPOT_FIELDS') or []
    for field in fields:
        if str((data or {}).get(field) or '').strip():
            current_app.logger.warning(
                'Signup honeypot triggered: field=%s ip=%s',
                field,
                _client_ip(),
            )
            raise SignupProtectionError(
                'Registration could not be completed. Please try again.',
                status_code=400,
            )


def enforce_signup_rate_limit(email=None, action='signup'):
    ip = _client_ip()
    ip_limit = int(current_app.config.get('SIGNUP_RATE_LIMIT_IP_MAX', 5))
    ip_window = int(current_app.config.get('SIGNUP_RATE_LIMIT_IP_WINDOW_SECONDS', 900))
    email_limit = int(current_app.config.get('SIGNUP_RATE_LIMIT_EMAIL_MAX', 3))
    email_window = int(current_app.config.get('SIGNUP_RATE_LIMIT_EMAIL_WINDOW_SECONDS', 3600))

    ip_key = f"signup-rate:{action}:ip:{_safe_key(ip)}"
    ip_count, ip_ttl = _increment_counter(ip_key, ip_window)
    if ip_count > ip_limit:
        current_app.logger.warning(
            'Signup IP rate limit exceeded: action=%s ip=%s count=%s ttl=%s',
            action,
            ip,
            ip_count,
            ip_ttl,
        )
        raise SignupProtectionError(
            'Too many signup attempts. Please wait a few minutes and try again.',
            status_code=429,
        )

    if email:
        email_key = f"signup-rate:{action}:email:{_safe_key(email)}"
        email_count, email_ttl = _increment_counter(email_key, email_window)
        if email_count > email_limit:
            current_app.logger.warning(
                'Signup email rate limit exceeded: action=%s email=%s count=%s ttl=%s',
                action,
                email,
                email_count,
                email_ttl,
            )
            raise SignupProtectionError(
                'Too many signup attempts for this email. Please try again later.',
                status_code=429,
            )
