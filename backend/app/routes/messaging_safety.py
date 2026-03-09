"""
Messaging Safety routes for BantuBuzz Trust & Safety system
Handles: Block/Unblock, Safety Checks, Message Reporting
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, UserBlock, MessageRiskSignal, MessageSafetyWarning, MessageReport
from datetime import datetime

bp = Blueprint('messaging_safety', __name__)


# ==================== BLOCK SYSTEM ====================

@bp.route('/block/<int:user_id>', methods=['POST'])
@jwt_required()
def block_user(user_id):
    """Block a user from messaging"""
    current_user_id = get_jwt_identity()

    # Prevent self-blocking
    if current_user_id == user_id:
        return jsonify({'error': 'Cannot block yourself'}), 400

    # Check if user exists
    user_to_block = User.query.get(user_id)
    if not user_to_block:
        return jsonify({'error': 'User not found'}), 404

    # Check if already blocked
    existing_block = UserBlock.query.filter_by(
        blocker_user_id=current_user_id,
        blocked_user_id=user_id,
        is_active=True
    ).first()

    if existing_block:
        return jsonify({'error': 'User is already blocked'}), 400

    # Create block record
    block = UserBlock(
        blocker_user_id=current_user_id,
        blocked_user_id=user_id,
        is_active=True
    )
    db.session.add(block)

    # Update risk signals for blocked user (they received a block)
    risk_signals = MessageRiskSignal.get_or_create(user_id)
    risk_signals.increment_signal('blocks_received')

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'User blocked successfully',
        'block': block.to_dict()
    }), 201


@bp.route('/block/<int:user_id>', methods=['DELETE'])
@jwt_required()
def unblock_user(user_id):
    """Unblock a user"""
    current_user_id = get_jwt_identity()

    # Find active block
    block = UserBlock.query.filter_by(
        blocker_user_id=current_user_id,
        blocked_user_id=user_id,
        is_active=True
    ).first()

    if not block:
        return jsonify({'error': 'No active block found'}), 404

    # Deactivate block
    block.is_active = False
    block.unblocked_at = datetime.utcnow()

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'User unblocked successfully'
    }), 200


@bp.route('/blocked', methods=['GET'])
@jwt_required()
def get_blocked_users():
    """Get list of users blocked by current user"""
    current_user_id = get_jwt_identity()

    blocks = UserBlock.query.filter_by(
        blocker_user_id=current_user_id,
        is_active=True
    ).all()

    blocked_users = []
    for block in blocks:
        user_info = {
            'id': block.blocked.id,
            'email': block.blocked.email,
            'user_type': block.blocked.user_type,
            'blocked_at': block.created_at.isoformat()
        }

        # Add profile info if available
        if block.blocked.user_type == 'creator' and block.blocked.creator_profile:
            user_info['username'] = block.blocked.creator_profile.username
            user_info['profile_picture'] = block.blocked.creator_profile.profile_picture
        elif block.blocked.user_type == 'brand' and block.blocked.brand_profile:
            user_info['company_name'] = block.blocked.brand_profile.company_name

        blocked_users.append(user_info)

    return jsonify({
        'success': True,
        'blocked_users': blocked_users,
        'count': len(blocked_users)
    }), 200


@bp.route('/check-block/<int:user_id>', methods=['GET'])
@jwt_required()
def check_block_status(user_id):
    """Check if current user has blocked or been blocked by another user"""
    current_user_id = get_jwt_identity()

    # Check if current user blocked the other user
    blocked_by_me = UserBlock.query.filter_by(
        blocker_user_id=current_user_id,
        blocked_user_id=user_id,
        is_active=True
    ).first() is not None

    # Check if other user blocked current user
    blocked_me = UserBlock.query.filter_by(
        blocker_user_id=user_id,
        blocked_user_id=current_user_id,
        is_active=True
    ).first() is not None

    return jsonify({
        'success': True,
        'blocked_by_me': blocked_by_me,
        'blocked_me': blocked_me,
        'can_message': not (blocked_by_me or blocked_me)
    }), 200


# ==================== SAFETY WARNINGS ====================

@bp.route('/safety/log-warning', methods=['POST'])
@jwt_required()
def log_safety_warning():
    """Log a safety warning (called from frontend when warning shown)"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ['conversation_id', 'warning_type']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Create warning log
    warning = MessageSafetyWarning(
        user_id=current_user_id,
        conversation_id=data['conversation_id'],
        warning_type=data['warning_type'],
        message_content=data.get('message_content'),
        detected_patterns=data.get('detected_patterns'),
        user_action=data.get('user_action'),  # edited, cancelled, sent_anyway
        final_message_sent=data.get('final_message_sent')
    )
    db.session.add(warning)

    # If user sent anyway, increment flagged messages count
    if data.get('user_action') == 'sent_anyway':
        risk_signals = MessageRiskSignal.get_or_create(current_user_id)
        risk_signals.increment_signal('flagged_messages')

    # If contact sharing, increment contact sharing attempts
    if data['warning_type'] == 'contact_sharing':
        risk_signals = MessageRiskSignal.get_or_create(current_user_id)
        risk_signals.increment_signal('contact_sharing')

    db.session.commit()

    return jsonify({
        'success': True,
        'message': 'Safety warning logged',
        'warning_id': warning.id
    }), 201


# ==================== MESSAGE REPORTING ====================

@bp.route('/report', methods=['POST'])
@jwt_required()
def report_message():
    """Report an inappropriate message"""
    current_user_id = get_jwt_identity()
    data = request.get_json()

    required_fields = ['reported_user_id', 'conversation_id', 'message_id', 'report_category']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    # Validate reported user exists
    reported_user = User.query.get(data['reported_user_id'])
    if not reported_user:
        return jsonify({'error': 'Reported user not found'}), 404

    # Prevent self-reporting
    if current_user_id == data['reported_user_id']:
        return jsonify({'error': 'Cannot report yourself'}), 400

    # Check for duplicate report (same message)
    existing_report = MessageReport.query.filter_by(
        reporter_id=current_user_id,
        message_id=data['message_id']
    ).first()

    if existing_report:
        return jsonify({'error': 'You have already reported this message'}), 400

    # Generate report number
    report_number = MessageReport.generate_report_number()

    # Check for emergency keywords
    message_content = data.get('message_content', '')
    is_emergency, detected_keywords = MessageReport.check_emergency_keywords(message_content)

    # Create report
    report = MessageReport(
        report_number=report_number,
        reporter_id=current_user_id,
        reported_user_id=data['reported_user_id'],
        conversation_id=data['conversation_id'],
        message_id=data['message_id'],
        message_content=message_content,
        message_context=data.get('message_context'),  # Messages before/after for context
        report_category=data['report_category'],
        description=data.get('description'),
        is_emergency=is_emergency,
        auto_escalated=is_emergency  # Auto-escalate if emergency
    )
    db.session.add(report)

    # Update risk signals for reported user
    if data['report_category'] in ['harassment', 'hate_speech', 'abusive']:
        risk_signals = MessageRiskSignal.get_or_create(data['reported_user_id'])
        risk_signals.increment_signal('harassment_reports')

    db.session.commit()

    response_data = {
        'success': True,
        'message': 'Report submitted successfully. Our team will review it within 24 hours.',
        'report': report.to_dict()
    }

    if is_emergency:
        response_data['message'] = 'Emergency report submitted. Our team has been notified immediately.'
        response_data['is_emergency'] = True

    return jsonify(response_data), 201


@bp.route('/reports', methods=['GET'])
@jwt_required()
def get_my_reports():
    """Get reports filed by current user"""
    current_user_id = get_jwt_identity()

    reports = MessageReport.query.filter_by(
        reporter_id=current_user_id
    ).order_by(MessageReport.created_at.desc()).all()

    return jsonify({
        'success': True,
        'reports': [report.to_dict() for report in reports],
        'count': len(reports)
    }), 200


@bp.route('/reports/<int:report_id>', methods=['GET'])
@jwt_required()
def get_report_status(report_id):
    """Get status of a specific report"""
    current_user_id = get_jwt_identity()

    report = MessageReport.query.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404

    # Only reporter can view their own report
    if report.reporter_id != current_user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    return jsonify({
        'success': True,
        'report': report.to_dict()
    }), 200


# ==================== RISK MONITORING (for admins) ====================

@bp.route('/risk-profile/<int:user_id>', methods=['GET'])
@jwt_required()
def get_risk_profile(user_id):
    """Get user's risk profile (admin only in production, open for development)"""
    # TODO: Add admin check in production
    # current_user = User.query.get(get_jwt_identity())
    # if not current_user.is_admin:
    #     return jsonify({'error': 'Unauthorized'}), 403

    risk_signals = MessageRiskSignal.query.filter_by(user_id=user_id).first()

    if not risk_signals:
        # No risk signals yet, return default
        return jsonify({
            'success': True,
            'risk_profile': {
                'user_id': user_id,
                'risk_score': 0,
                'risk_level': 'low',
                'blocks_received_count': 0,
                'harassment_reports_count': 0,
                'contact_sharing_attempts_count': 0,
                'flagged_messages_count': 0,
                'false_reports_count': 0
            }
        }), 200

    return jsonify({
        'success': True,
        'risk_profile': risk_signals.to_dict()
    }), 200
