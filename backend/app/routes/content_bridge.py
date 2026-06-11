import hashlib
import hmac
import json
import logging
import time

import requests
from flask import Blueprint, current_app, jsonify, request


bp = Blueprint('content_bridge', __name__)
logger = logging.getLogger(__name__)


def _signature(secret, timestamp, method, path, body):
    body_hash = hashlib.sha256(body).hexdigest()
    message = f'{timestamp}.{method.upper()}.{path}.{body_hash}'.encode('utf-8')
    return hmac.new(secret.encode('utf-8'), message, hashlib.sha256).hexdigest()


def _verify_request():
    secret = current_app.config.get('CONTENT_BRIDGE_SECRET')
    timestamp = request.headers.get('X-BantuBuzz-Timestamp', '')
    supplied = request.headers.get('X-BantuBuzz-Signature', '')

    if not secret or not timestamp or not supplied:
        return False

    try:
        request_time = int(timestamp)
    except ValueError:
        return False

    max_skew = current_app.config.get('CONTENT_BRIDGE_MAX_SKEW_SECONDS', 300)
    if abs(int(time.time()) - request_time) > max_skew:
        return False

    expected = _signature(
        secret,
        timestamp,
        request.method,
        request.path,
        request.get_data(cache=True),
    )
    return hmac.compare_digest(expected, supplied)


@bp.route('/content-changed', methods=['POST'])
def content_changed():
    if not _verify_request():
        logger.warning('Rejected unsigned or expired CMS content webhook')
        return jsonify({'error': 'Unauthorized'}), 401

    payload = request.get_json(silent=True) or {}
    required = {'event', 'collection', 'document_id'}
    if not required.issubset(payload):
        return jsonify({'error': 'event, collection, and document_id are required'}), 400

    logger.info(
        'CMS content event: event=%s collection=%s id=%s slug=%s status=%s',
        payload.get('event'),
        payload.get('collection'),
        payload.get('document_id'),
        payload.get('slug'),
        payload.get('status'),
    )

    return jsonify({
        'success': True,
        'received_at': int(time.time()),
        'canonical_url': payload.get('canonical_url'),
    })


@bp.route('/content-health', methods=['GET'])
def content_health():
    secret = current_app.config.get('CONTENT_BRIDGE_SECRET')
    cms_url = current_app.config.get('CMS_INTERNAL_URL', '').rstrip('/')
    if not secret or not cms_url:
        return jsonify({'status': 'unconfigured'}), 503

    path = '/api/integration/v1/health'
    timestamp = str(int(time.time()))
    signature = _signature(secret, timestamp, 'GET', path, b'')

    try:
        response = requests.get(
            f'{cms_url}{path}',
            headers={
                'X-BantuBuzz-Timestamp': timestamp,
                'X-BantuBuzz-Signature': signature,
                'Accept': 'application/json',
            },
            timeout=5,
        )
        response.raise_for_status()
        cms_payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning('CMS health check failed: %s', error)
        return jsonify({'status': 'unhealthy', 'cms': None}), 503

    return jsonify({'status': 'healthy', 'cms': cms_payload})
