"""
Admin Moderation routes - Trust & Safety report review and enforcement
"""
from flask import jsonify, request
from sqlalchemy import or_, and_
from datetime import datetime, timedelta
from app import db
from app.models.user import User
from app.models.message_report import MessageReport
from app.models.user_block import UserBlock
from app.models.message_safety_warning import MessageSafetyWarning
from app.models.user_violation import UserViolation
from app.models.admin_activity_log import AdminActivityLog
from app.decorators.admin import admin_required
from flask_jwt_extended import get_jwt_identity
from . import bp


def log_admin_action(admin_id, action_type, target_type, target_id, action_data):
    """Helper function to log admin actions"""
    try:
        log = AdminActivityLog(
            admin_id=admin_id,
            action_type=action_type,
            target_type=target_type,
            target_id=target_id,
            action_data=action_data,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Error logging admin action: {str(e)}")


@bp.route('/moderation/stats', methods=['GET'])
@admin_required
def get_moderation_stats():
    """Get moderation dashboard statistics"""
    try:
        # Count pending reports
        pending_reports = MessageReport.query.filter_by(status='pending').count()

        # Count total reports
        total_reports = MessageReport.query.count()

        # Count reports by status
        reviewed_reports = MessageReport.query.filter_by(status='reviewed').count()
        action_taken_reports = MessageReport.query.filter_by(status='action_taken').count()
        dismissed_reports = MessageReport.query.filter_by(status='dismissed').count()

        # Count active violations
        active_violations = UserViolation.query.filter_by(status='active').count()

        # Count restricted users
        restricted_users = User.query.filter_by(is_messaging_restricted=True).count()
        suspended_users = User.query.filter_by(is_account_suspended=True).count()

        return jsonify({
            'success': True,
            'stats': {
                'pending_reports': pending_reports,
                'total_reports': total_reports,
                'reviewed_reports': reviewed_reports,
                'action_taken_reports': action_taken_reports,
                'dismissed_reports': dismissed_reports,
                'active_violations': active_violations,
                'restricted_users': restricted_users,
                'suspended_users': suspended_users
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/moderation/reports', methods=['GET'])
@admin_required
def get_reports():
    """List all message reports with filtering and pagination"""
    try:
        # Query parameters
        status = request.args.get('status')  # pending, reviewed, action_taken, dismissed
        category = request.args.get('category')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        # Build query
        query = MessageReport.query

        if status:
            query = query.filter(MessageReport.status == status)
        if category:
            query = query.filter(MessageReport.report_category == category)

        # Order by created_at DESC (newest first)
        query = query.order_by(MessageReport.created_at.desc())

        # Paginate
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        reports = []
        for report in paginated.items:
            reporter = User.query.get(report.reporter_id)
            reported_user = User.query.get(report.reported_user_id)

            # Get violation count
            violation_count = UserViolation.query.filter_by(
                user_id=report.reported_user_id,
                status='active'
            ).count()

            # Get block count
            block_count = UserBlock.query.filter_by(
                blocked_user_id=report.reported_user_id,
                is_active=True
            ).count()

            reports.append({
                'id': report.id,
                'report_number': report.report_number,
                'conversation_id': report.conversation_id,
                'report_category': report.report_category,
                'description': report.description,
                'status': report.status,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'reporter': {
                    'id': reporter.id,
                    'email': reporter.email,
                    'user_type': reporter.user_type
                } if reporter else None,
                'reported_user': {
                    'id': reported_user.id,
                    'email': reported_user.email,
                    'user_type': reported_user.user_type,
                    'violation_count': violation_count,
                    'block_count': block_count,
                    'is_messaging_restricted': reported_user.is_messaging_restricted,
                    'is_account_suspended': reported_user.is_account_suspended
                } if reported_user else None,
                'reviewed_by': report.reviewed_by,
                'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
                'action_taken': report.action_taken,
                'action_notes': report.action_notes
            })

        return jsonify({
            'success': True,
            'reports': reports,
            'pagination': {
                'page': paginated.page,
                'per_page': paginated.per_page,
                'total': paginated.total,
                'pages': paginated.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/moderation/reports/<int:report_id>', methods=['GET'])
@admin_required
def get_report_details(report_id):
    """Get detailed information about a specific report"""
    try:
        report = MessageReport.query.get(report_id)

        if not report:
            return jsonify({'error': 'Report not found'}), 404

        reporter = User.query.get(report.reporter_id)
        reported_user = User.query.get(report.reported_user_id)

        # Get reported user's violation history
        violations = UserViolation.query.filter_by(
            user_id=report.reported_user_id
        ).order_by(UserViolation.created_at.desc()).limit(10).all()

        # Get block count
        block_count = UserBlock.query.filter_by(
            blocked_user_id=report.reported_user_id,
            is_active=True
        ).count()

        # Get report count
        report_count = MessageReport.query.filter_by(
            reported_user_id=report.reported_user_id
        ).count()

        # Get safety warnings count
        warning_count = MessageSafetyWarning.query.filter_by(
            sender_user_id=report.reported_user_id
        ).count()

        return jsonify({
            'success': True,
            'report': {
                'id': report.id,
                'report_number': report.report_number,
                'conversation_id': report.conversation_id,
                'message_id': report.message_id,
                'report_category': report.report_category,
                'description': report.description,
                'status': report.status,
                'is_emergency': report.is_emergency,
                'created_at': report.created_at.isoformat() if report.created_at else None,
                'reporter': {
                    'id': reporter.id,
                    'email': reporter.email,
                    'user_type': reporter.user_type
                } if reporter else None,
                'reported_user': {
                    'id': reported_user.id,
                    'email': reported_user.email,
                    'user_type': reported_user.user_type,
                    'is_messaging_restricted': reported_user.is_messaging_restricted,
                    'messaging_restricted_until': reported_user.messaging_restricted_until.isoformat() if reported_user.messaging_restricted_until else None,
                    'is_account_suspended': reported_user.is_account_suspended,
                    'account_suspended_until': reported_user.account_suspended_until.isoformat() if reported_user.account_suspended_until else None
                } if reported_user else None,
                'reviewed_by': report.reviewed_by,
                'reviewed_at': report.reviewed_at.isoformat() if report.reviewed_at else None,
                'action_taken': report.action_taken,
                'action_notes': report.action_notes,
                'action_taken_at': report.action_taken_at.isoformat() if report.action_taken_at else None
            },
            'user_profile': {
                'violation_history': [v.to_dict() for v in violations],
                'total_violations': len(violations),
                'block_count': block_count,
                'report_count': report_count,
                'warning_count': warning_count
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/moderation/reports/<int:report_id>/action', methods=['POST'])
@admin_required
def take_enforcement_action(report_id):
    """Take enforcement action on a report"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        report = MessageReport.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404

        action_type = data.get('action_type')  # warn, restrict_messaging, suspend_account, dismiss
        action_duration_days = data.get('action_duration_days')
        action_reason = data.get('reason', '')
        severity = data.get('severity', 'moderate')

        if not action_type:
            return jsonify({'error': 'Action type required'}), 400

        # Handle dismiss
        if action_type == 'dismiss':
            report.status = 'dismissed'
            report.action_taken = 'dismissed'
            report.action_notes = action_reason
            report.action_taken_at = datetime.utcnow()
            report.reviewed_by = current_user_id
            report.reviewed_at = datetime.utcnow()

            db.session.commit()

            log_admin_action(
                admin_id=current_user_id,
                action_type='report_dismissed',
                target_type='report',
                target_id=report_id,
                action_data={'reason': action_reason}
            )

            return jsonify({
                'success': True,
                'message': 'Report dismissed'
            }), 200

        # Create user violation
        violation = UserViolation(
            user_id=report.reported_user_id,
            violation_type=action_type,
            severity=severity,
            description=f"Report #{report.report_number}: {report.report_category} - {action_reason}",
            source_type='message_report',
            source_id=report.id,
            action_taken=action_type,
            action_duration_days=action_duration_days,
            issued_by=current_user_id,
            notes=action_reason,
            status='active'
        )

        # Calculate expiration if duration provided
        if action_duration_days:
            violation.action_expires_at = datetime.utcnow() + timedelta(days=action_duration_days)

        db.session.add(violation)

        # Update reported user's status
        reported_user = User.query.get(report.reported_user_id)
        if action_type == 'restrict_messaging':
            reported_user.is_messaging_restricted = True
            if action_duration_days:
                reported_user.messaging_restricted_until = datetime.utcnow() + timedelta(days=action_duration_days)

        elif action_type == 'suspend_account':
            reported_user.is_account_suspended = True
            if action_duration_days:
                reported_user.account_suspended_until = datetime.utcnow() + timedelta(days=action_duration_days)

        # Update report status
        report.status = 'action_taken'
        report.action_taken = action_type
        report.action_notes = action_reason
        report.action_taken_at = datetime.utcnow()
        report.reviewed_by = current_user_id
        report.reviewed_at = datetime.utcnow()

        db.session.commit()

        # Log admin action
        log_admin_action(
            admin_id=current_user_id,
            action_type='enforcement_action',
            target_type='user',
            target_id=report.reported_user_id,
            action_data={
                'action_type': action_type,
                'report_id': report_id,
                'duration_days': action_duration_days,
                'reason': action_reason
            }
        )

        return jsonify({
            'success': True,
            'message': f'Enforcement action taken: {action_type}',
            'violation_id': violation.id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/moderation/users/<int:user_id>/profile', methods=['GET'])
@admin_required
def get_user_moderation_profile(user_id):
    """Get user moderation profile with violation history and statistics"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get violations
        violations = UserViolation.query.filter_by(user_id=user_id).order_by(UserViolation.created_at.desc()).all()

        # Get reports (as reported user)
        reports_against = MessageReport.query.filter_by(reported_user_id=user_id).order_by(MessageReport.created_at.desc()).all()

        # Get block count
        block_count = UserBlock.query.filter_by(blocked_user_id=user_id, is_active=True).count()

        # Get safety warnings count
        warning_count = MessageSafetyWarning.query.filter_by(sender_user_id=user_id).count()

        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'user_type': user.user_type,
                'is_messaging_restricted': user.is_messaging_restricted,
                'messaging_restricted_until': user.messaging_restricted_until.isoformat() if user.messaging_restricted_until else None,
                'is_account_suspended': user.is_account_suspended,
                'account_suspended_until': user.account_suspended_until.isoformat() if user.account_suspended_until else None
            },
            'statistics': {
                'total_violations': len(violations),
                'active_violations': len([v for v in violations if v.status == 'active']),
                'reports_received': len(reports_against),
                'blocks_received': block_count,
                'safety_warnings': warning_count
            },
            'violations': [v.to_dict() for v in violations],
            'recent_reports': [{
                'id': r.id,
                'report_number': r.report_number,
                'report_category': r.report_category,
                'status': r.status,
                'created_at': r.created_at.isoformat() if r.created_at else None,
                'action_taken': r.action_taken
            } for r in reports_against[:5]]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
