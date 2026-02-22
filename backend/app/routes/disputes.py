"""
User-facing dispute routes (brand and creator)
"""
from flask import Blueprint, jsonify, request
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Collaboration, Notification
from app.models.dispute import Dispute

bp = Blueprint('disputes', __name__)

VALID_ISSUE_TYPES = ['non_delivery', 'quality', 'payment', 'behaviour', 'other']


@bp.route('/api/disputes', methods=['POST'])
@jwt_required()
def raise_dispute():
    """
    Raise a new dispute.
    Body: { collaboration_id, issue_type, description, evidence_urls }
    """
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()

        collab_id = data.get('collaboration_id')
        issue_type = data.get('issue_type')
        description = data.get('description', '').strip()

        if not issue_type or issue_type not in VALID_ISSUE_TYPES:
            return jsonify({'success': False, 'error': f'issue_type must be one of: {VALID_ISSUE_TYPES}'}), 400

        if not description or len(description) < 20:
            return jsonify({'success': False, 'error': 'Please provide a detailed description (min 20 characters)'}), 400

        # Resolve against_user from collaboration
        against_user_id = None
        if collab_id:
            collab = Collaboration.query.get(collab_id)
            if not collab:
                return jsonify({'success': False, 'error': 'Collaboration not found'}), 404

            # Only parties in the collaboration can raise a dispute
            if current_user_id not in [collab.brand_id, collab.creator_id]:
                return jsonify({'success': False, 'error': 'You are not a party to this collaboration'}), 403

            # Check no open dispute already exists for this collaboration
            existing = Dispute.query.filter_by(
                collaboration_id=collab_id,
                status='open'
            ).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': f'An open dispute ({existing.reference}) already exists for this collaboration'
                }), 409

            against_user_id = collab.creator_id if current_user_id == collab.brand_id else collab.brand_id
        else:
            against_user_id = data.get('against_user_id')
            if not against_user_id:
                return jsonify({'success': False, 'error': 'against_user_id is required when no collaboration_id provided'}), 400

        reference = Dispute.generate_reference()

        dispute = Dispute(
            reference=reference,
            collaboration_id=collab_id,
            raised_by_user_id=current_user_id,
            against_user_id=against_user_id,
            issue_type=issue_type,
            description=description,
            evidence_urls=data.get('evidence_urls', []),
            status='open',
        )
        db.session.add(dispute)
        db.session.commit()

        # Notify admin (user_type=admin)
        admins = User.query.filter_by(user_type='admin').all()
        for admin in admins:
            notif = Notification(
                user_id=admin.id,
                title='New Dispute Raised',
                message=f'Dispute {reference} has been raised: {issue_type.replace("_", " ").title()}',
                type='dispute',
                reference_id=dispute.id,
            )
            db.session.add(notif)

        # Notify the against_user
        notif_against = Notification(
            user_id=against_user_id,
            title='A dispute has been raised against you',
            message=f'Dispute {reference} has been filed regarding: {issue_type.replace("_", " ").title()}. Our team will review it shortly.',
            type='dispute',
            reference_id=dispute.id,
        )
        db.session.add(notif_against)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Dispute {reference} raised successfully. Our team will review it within 48 hours.',
            'data': dispute.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/api/disputes', methods=['GET'])
@jwt_required()
def my_disputes():
    """List all disputes I am involved in (raised or against me)"""
    try:
        current_user_id = get_jwt_identity()

        disputes = Dispute.query.filter(
            (Dispute.raised_by_user_id == current_user_id) |
            (Dispute.against_user_id == current_user_id)
        ).order_by(Dispute.created_at.desc()).all()

        return jsonify({
            'success': True,
            'data': [d.to_dict(include_details=True) for d in disputes]
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/api/disputes/<int:dispute_id>', methods=['GET'])
@jwt_required()
def get_dispute(dispute_id):
    """Get a single dispute (must be a party to it)"""
    try:
        current_user_id = get_jwt_identity()
        dispute = Dispute.query.get_or_404(dispute_id)

        if current_user_id not in [dispute.raised_by_user_id, dispute.against_user_id]:
            return jsonify({'success': False, 'error': 'Access denied'}), 403

        return jsonify({
            'success': True,
            'data': dispute.to_dict(include_details=True)
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
