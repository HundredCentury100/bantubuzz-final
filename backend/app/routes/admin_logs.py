"""
Admin Logs Routes - View system logs and errors
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt
from datetime import datetime, timedelta
from sqlalchemy import desc, and_, or_
from app import db
from app.models.request_log import RequestLog

bp = Blueprint('admin_logs', __name__)


def admin_required():
    """Decorator to require admin access"""
    claims = get_jwt()
    if not claims.get('is_admin'):
        return jsonify({'error': 'Admin access required'}), 403
    return None


@bp.route('/logs', methods=['GET'])
@jwt_required()
def get_logs():
    """
    Get system logs with filters
    Query params:
    - page: Page number (default 1)
    - per_page: Items per page (default 50, max 500)
    - level: error, warning, info (filters by status code)
    - service: backend, messaging, celery
    - user_id: Filter by user ID
    - method: GET, POST, PUT, DELETE
    - start_date: ISO format date
    - end_date: ISO format date
    - search: Search in endpoint or error message
    """
    admin_check = admin_required()
    if admin_check:
        return admin_check

    try:
        # Pagination
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 50, type=int), 500)

        # Filters
        level = request.args.get('level')  # error, warning, info
        service = request.args.get('service')
        user_id = request.args.get('user_id', type=int)
        method = request.args.get('method')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        search = request.args.get('search')

        # Build query
        query = RequestLog.query

        # Filter by level (based on status code)
        if level == 'error':
            query = query.filter(RequestLog.is_error == True)
        elif level == 'warning':
            query = query.filter(and_(
                RequestLog.response_status >= 400,
                RequestLog.response_status < 500
            ))
        elif level == 'info':
            query = query.filter(RequestLog.response_status < 400)

        # Filter by service
        if service:
            query = query.filter(RequestLog.service_name == service)

        # Filter by user
        if user_id:
            query = query.filter(RequestLog.user_id == user_id)

        # Filter by method
        if method:
            query = query.filter(RequestLog.method == method.upper())

        # Filter by date range
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(RequestLog.timestamp >= start)
            except:
                pass

        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(RequestLog.timestamp <= end)
            except:
                pass

        # Search in endpoint or error message
        if search:
            search_pattern = f'%{search}%'
            query = query.filter(or_(
                RequestLog.endpoint.ilike(search_pattern),
                RequestLog.error_message.ilike(search_pattern),
                RequestLog.full_url.ilike(search_pattern)
            ))

        # Order by timestamp descending (newest first)
        query = query.order_by(desc(RequestLog.timestamp))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        return jsonify({
            'success': True,
            'data': {
                'logs': [log.to_dict() for log in pagination.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': pagination.total,
                    'pages': pagination.pages,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch logs',
            'message': str(e)
        }), 500


@bp.route('/logs/<int:log_id>', methods=['GET'])
@jwt_required()
def get_log_details(log_id):
    """Get detailed information for a specific log entry"""
    admin_check = admin_required()
    if admin_check:
        return admin_check

    try:
        log = RequestLog.query.get_or_404(log_id)

        # Include full details
        log_dict = log.to_dict()
        log_dict['request_headers'] = log.request_headers
        log_dict['request_body'] = log.request_body
        log_dict['error_traceback'] = log.error_traceback
        log_dict['referrer'] = log.referrer

        return jsonify({
            'success': True,
            'data': log_dict
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch log details',
            'message': str(e)
        }), 500


@bp.route('/logs/stats', methods=['GET'])
@jwt_required()
def get_log_stats():
    """
    Get statistics about logs
    Returns counts of errors, requests by method, top endpoints, etc.
    """
    admin_check = admin_required()
    if admin_check:
        return admin_check

    try:
        # Time range filter (default: last 24 hours)
        hours = request.args.get('hours', 24, type=int)
        start_time = datetime.utcnow() - timedelta(hours=hours)

        # Total requests
        total_requests = RequestLog.query.filter(
            RequestLog.timestamp >= start_time
        ).count()

        # Total errors
        total_errors = RequestLog.query.filter(
            and_(
                RequestLog.timestamp >= start_time,
                RequestLog.is_error == True
            )
        ).count()

        # Requests by status code
        status_counts = db.session.query(
            RequestLog.response_status,
            db.func.count(RequestLog.id)
        ).filter(
            RequestLog.timestamp >= start_time
        ).group_by(RequestLog.response_status).all()

        # Requests by method
        method_counts = db.session.query(
            RequestLog.method,
            db.func.count(RequestLog.id)
        ).filter(
            RequestLog.timestamp >= start_time
        ).group_by(RequestLog.method).all()

        # Top endpoints
        top_endpoints = db.session.query(
            RequestLog.endpoint,
            db.func.count(RequestLog.id).label('count')
        ).filter(
            RequestLog.timestamp >= start_time
        ).group_by(RequestLog.endpoint).order_by(desc('count')).limit(10).all()

        # Average response time
        avg_response_time = db.session.query(
            db.func.avg(RequestLog.response_time_ms)
        ).filter(
            RequestLog.timestamp >= start_time
        ).scalar()

        # Recent errors (last 10)
        recent_errors = RequestLog.query.filter(
            and_(
                RequestLog.timestamp >= start_time,
                RequestLog.is_error == True
            )
        ).order_by(desc(RequestLog.timestamp)).limit(10).all()

        return jsonify({
            'success': True,
            'data': {
                'time_range_hours': hours,
                'total_requests': total_requests,
                'total_errors': total_errors,
                'error_rate': round((total_errors / total_requests * 100), 2) if total_requests > 0 else 0,
                'avg_response_time_ms': int(avg_response_time) if avg_response_time else 0,
                'status_codes': dict(status_counts),
                'methods': dict(method_counts),
                'top_endpoints': [{'endpoint': e, 'count': c} for e, c in top_endpoints],
                'recent_errors': [
                    {
                        'id': log.id,
                        'timestamp': log.timestamp.isoformat(),
                        'endpoint': log.endpoint,
                        'error_type': log.error_type,
                        'error_message': log.error_message,
                        'user_email': log.user_email
                    } for log in recent_errors
                ]
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch stats',
            'message': str(e)
        }), 500


@bp.route('/logs/cleanup', methods=['POST'])
@jwt_required()
def cleanup_old_logs():
    """Delete logs older than specified days (default: 30 days)"""
    admin_check = admin_required()
    if admin_check:
        return admin_check

    try:
        days = request.json.get('days', 30)
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        deleted_count = RequestLog.query.filter(
            RequestLog.timestamp < cutoff_date
        ).delete()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Deleted {deleted_count} log entries older than {days} days'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to cleanup logs',
            'message': str(e)
        }), 500
