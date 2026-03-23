"""
Production-Ready Logging Utility
Simple, direct file writing with guaranteed output
"""
import json
import traceback
from datetime import datetime
import os


# Log file paths
LOG_DIR = '/var/www/bantubuzz/backend/logs'
REQUEST_LOG = os.path.join(LOG_DIR, 'requests.log')
EXTERNAL_API_LOG = os.path.join(LOG_DIR, 'external_apis.log')
ERROR_LOG = os.path.join(LOG_DIR, 'errors.log')


def _ensure_log_dir():
    """Ensure log directory exists"""
    os.makedirs(LOG_DIR, exist_ok=True)


def _write_log(filepath, content):
    """Write to log file directly"""
    try:
        _ensure_log_dir()
        with open(filepath, 'a', encoding='utf-8') as f:
            timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
            f.write(f"\n[{timestamp}] {content}\n")
            f.flush()
    except Exception as e:
        # Fallback to stdout if file write fails
        print(f"[LOGGER ERROR] {e}: {content}")


def log_incoming_request(method, path, body=None, user_id=None):
    """
    Log incoming API request

    Args:
        method: HTTP method (GET, POST, etc)
        path: Request path
        body: Request body (dict or str)
        user_id: Current user ID if available
    """
    try:
        log_data = {
            'type': 'INCOMING_REQUEST',
            'method': method,
            'path': path,
            'user_id': user_id
        }

        if body:
            # Mask sensitive fields
            if isinstance(body, dict):
                masked_body = body.copy()
                for key in ['password', 'access_token', 'refresh_token', 'token']:
                    if key in masked_body:
                        masked_body[key] = '***MASKED***'
                log_data['body'] = masked_body
            else:
                log_data['body'] = str(body)[:500]

        content = f"{json.dumps(log_data, indent=2, default=str)}"
        _write_log(REQUEST_LOG, content)
    except Exception as e:
        _write_log(ERROR_LOG, f"log_incoming_request error: {e}")


def log_response(method, path, status_code, response_body=None, error=None):
    """
    Log API response

    Args:
        method: HTTP method
        path: Request path
        status_code: HTTP status code
        response_body: Response body (dict or str)
        error: Error message if any
    """
    try:
        log_data = {
            'type': 'RESPONSE',
            'method': method,
            'path': path,
            'status_code': status_code
        }

        if error:
            log_data['error'] = error

        if response_body:
            if isinstance(response_body, dict):
                log_data['response'] = response_body
            else:
                log_data['response'] = str(response_body)[:500]

        content = f"{json.dumps(log_data, indent=2, default=str)}"
        _write_log(REQUEST_LOG, content)
    except Exception as e:
        _write_log(ERROR_LOG, f"log_response error: {e}")


def log_external_api_call(service, method, url, payload=None, headers=None):
    """
    Log outgoing external API call

    Args:
        service: Service name (e.g., 'ThunziAI', 'YouTube')
        method: HTTP method
        url: Full URL
        payload: Request payload
        headers: Request headers (sensitive data will be masked)
    """
    try:
        log_data = {
            'type': 'EXTERNAL_API_CALL',
            'service': service,
            'method': method,
            'url': url
        }

        if payload:
            log_data['payload'] = payload

        if headers:
            masked_headers = headers.copy()
            for key in ['Authorization', 'Cookie', 'Token']:
                if key in masked_headers:
                    masked_headers[key] = '***MASKED***'
            log_data['headers'] = masked_headers

        content = f"{json.dumps(log_data, indent=2, default=str)}"
        _write_log(EXTERNAL_API_LOG, content)
    except Exception as e:
        _write_log(ERROR_LOG, f"log_external_api_call error: {e}")


def log_external_api_response(service, method, url, status_code, response_body=None, error=None):
    """
    Log external API response

    Args:
        service: Service name
        method: HTTP method
        url: Full URL
        status_code: HTTP status code
        response_body: Response body
        error: Error message if any
    """
    try:
        log_data = {
            'type': 'EXTERNAL_API_RESPONSE',
            'service': service,
            'method': method,
            'url': url,
            'status_code': status_code
        }

        if error:
            log_data['error'] = error

        if response_body:
            if isinstance(response_body, str):
                log_data['response'] = response_body[:1000]
            else:
                log_data['response'] = response_body

        content = f"{json.dumps(log_data, indent=2, default=str)}"
        _write_log(EXTERNAL_API_LOG, content)
    except Exception as e:
        _write_log(ERROR_LOG, f"log_external_api_response error: {e}")


def log_error(context, error, tb=None):
    """
    Log error with full traceback

    Args:
        context: Context string (e.g., 'connect_platform', 'ThunziAI.login')
        error: Error object or message
        tb: Traceback string (optional, will auto-capture if not provided)
    """
    try:
        log_data = {
            'type': 'ERROR',
            'context': context,
            'error': str(error),
            'error_type': type(error).__name__ if hasattr(error, '__class__') else 'Unknown'
        }

        if tb is None:
            tb = traceback.format_exc()

        log_data['traceback'] = tb

        content = f"{json.dumps(log_data, indent=2, default=str)}"
        _write_log(ERROR_LOG, content)
    except Exception as e:
        # Last resort fallback
        print(f"[CRITICAL LOGGER ERROR] {e}: {error}")
