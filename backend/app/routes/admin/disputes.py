"""
Admin Disputes routes - Full case management
"""
from flask import jsonify, request
from datetime import datetime, timedelta
from sqlalchemy import func
from app import db
from app.models import User, Collaboration, Notification
from app.models.dispute import Dispute
from app.decorators.admin import admin_required
from flask_jwt_extended import get_jwt_identity
from . import bp


@bp.route('/disputes', methods=['GET'])
@admin_required
def list_disputes():
    """
    List all disputes with filters.
    Query params: status, issue_type, page, per_page
    """
    try:
        status = request.args.get('status', '')
        issue_type = request.args.get('issue_type', '')
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 25)), 100)

        query = Dispute.query

        if status:
            query = query.filter_by(status=status)
        if issue_type:
            query = query.filter_by(issue_type=issue_type)

        query = query.order_by(Dispute.created_at.desc())
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        disputes = [d.to_dict(include_details=True) for d in paginated.items]

        return jsonify({
            'success': True,
            'data': {
                'disputes': disputes,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages,
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/disputes/stats', methods=['GET'])
@admin_required
def dispute_stats():
    """Dispute counts by status + avg resolution time"""
    try:
        open_count = Dispute.query.filter_by(status='open').count()
        review_count = Dispute.query.filter_by(status='under_review').count()
        total = Dispute.query.count()

        # Resolved this month
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0)
        resolved_month = Dispute.query.filter(
            Dispute.status == 'resolved',
            Dispute.resolved_at >= month_start
        ).count()

        # Avg resolution time (days)
        resolved = Dispute.query.filter(
            Dispute.status == 'resolved',
            Dispute.resolved_at.isnot(None)
        ).all()
        avg_days = 0
        if resolved:
            total_days = sum(
                (d.resolved_at - d.created_at).total_seconds() / 86400
                for d in resolved
                if d.resolved_at and d.created_at
            )
            avg_days = round(total_days / len(resolved), 1)

        return jsonify({
            'success': True,
            'data': {
                'open': open_count,
                'under_review': review_count,
                'resolved_this_month': resolved_month,
                'total': total,
                'avg_resolution_days': avg_days,
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/disputes/<int:dispute_id>', methods=['GET'])
@admin_required
def get_dispute(dispute_id):
    """Full dispute detail including collaboration context"""
    try:
        dispute = Dispute.query.get_or_404(dispute_id)
        data = dispute.to_dict(include_details=True)

        # Add collaboration timeline context
        if dispute.collaboration:
            c = dispute.collaboration
            data['collaboration_detail'] = {
                'id': c.id,
                'title': c.title,
                'amount': c.amount,
                'status': c.status,
                'start_date': c.start_date.isoformat() if c.start_date else None,
                'expected_completion_date': c.expected_completion_date.isoformat() if c.expected_completion_date else None,
                'actual_completion_date': c.actual_completion_date.isoformat() if c.actual_completion_date else None,
                'progress_percentage': c.progress_percentage,
                'cancellation_request': c.cancellation_request,
            }

        # Past disputes for each party
        raised_by_history = Dispute.query.filter_by(
            raised_by_user_id=dispute.raised_by_user_id
        ).filter(Dispute.id != dispute_id).count()

        against_history = Dispute.query.filter_by(
            against_user_id=dispute.against_user_id
        ).filter(Dispute.id != dispute_id).count()

        data['history'] = {
            'raised_by_total_disputes': raised_by_history,
            'against_user_total_disputes': against_history,
        }

        return jsonify({'success': True, 'data': dispute_to_return(data)}), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def dispute_to_return(data):
    return data


@bp.route('/disputes/<int:dispute_id>/assign', methods=['PUT'])
@admin_required
def assign_dispute(dispute_id):
    """Assign dispute to an admin"""
    try:
        dispute = Dispute.query.get_or_404(dispute_id)
        current_admin_id = get_jwt_identity()

        dispute.assigned_admin_id = current_admin_id
        dispute.status = 'under_review'
        dispute.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Dispute assigned and moved to under review'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/disputes/<int:dispute_id>/resolve', methods=['PUT'])
@admin_required
def resolve_dispute(dispute_id):
    """
    Resolve a dispute.
    Body: { resolution, resolution_notes, payout_percentage }
    """
    try:
        dispute = Dispute.query.get_or_404(dispute_id)
        data = request.get_json()

        resolution = data.get('resolution')
        if not resolution:
            return jsonify({'success': False, 'error': 'Resolution is required'}), 400

        valid_resolutions = ['release_funds', 'partial_release', 'refund', 'warning', 'suspension', 'no_action']
        if resolution not in valid_resolutions:
            return jsonify({'success': False, 'error': f'Invalid resolution. Choose from: {valid_resolutions}'}), 400

        dispute.resolution = resolution
        dispute.resolution_notes = data.get('resolution_notes', '')
        dispute.payout_percentage = data.get('payout_percentage')
        dispute.status = 'resolved'
        dispute.resolved_at = datetime.utcnow()
        dispute.updated_at = datetime.utcnow()

        db.session.commit()

        # Notify both parties
        resolution_label = resolution.replace('_', ' ').title()
        for user_id in [dispute.raised_by_user_id, dispute.against_user_id]:
            notif = Notification(
                user_id=user_id,
                title='Dispute Resolved',
                message=f'Your dispute {dispute.reference} has been resolved: {resolution_label}. {dispute.resolution_notes or ""}',
                type='dispute',
                reference_id=dispute.id,
            )
            db.session.add(notif)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Dispute {dispute.reference} resolved as: {resolution_label}'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
