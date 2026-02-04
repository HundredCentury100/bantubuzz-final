from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db
from app.models import (
    Proposal, ProposalMilestone, Brief, User, CreatorProfile,
    BrandProfile, Booking, Collaboration, CollaborationMilestone
)
from app.utils.brief_matching import matches_brief_criteria
from app.utils.notifications import create_notification

bp = Blueprint('proposals', __name__)


@bp.route('/', methods=['POST'])
@jwt_required()
def create_proposal():
    """Submit a proposal to a brief (Creator only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can submit proposals'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        required = ['brief_id', 'message', 'total_price', 'pricing_type', 'timeline_days', 'milestones']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        brief_id = int(data['brief_id'])
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.status != 'open':
            return jsonify({'error': 'Brief is not accepting proposals'}), 400

        # Check if creator meets criteria
        if not matches_brief_criteria(creator, brief):
            return jsonify({'error': 'You do not meet the criteria for this brief'}), 403

        # Check if already submitted
        existing = Proposal.query.filter_by(brief_id=brief_id, creator_id=creator.id).first()
        if existing:
            return jsonify({'error': 'You have already submitted a proposal for this brief'}), 400

        # Validate pricing type
        pricing_type = data['pricing_type']
        if pricing_type not in ['total', 'per_milestone']:
            return jsonify({'error': 'Invalid pricing_type. Must be "total" or "per_milestone"'}), 400

        # Validate milestones count matches brief
        milestones_data = data['milestones']
        brief_milestones_count = brief.milestones.count()

        if len(milestones_data) != brief_milestones_count:
            return jsonify({'error': f'Must provide exactly {brief_milestones_count} milestones'}), 400

        # Create proposal
        proposal = Proposal(
            brief_id=brief_id,
            creator_id=creator.id,
            status='pending',
            message=data['message'],
            total_price=float(data['total_price']),
            pricing_type=pricing_type,
            timeline_days=int(data['timeline_days'])
        )
        db.session.add(proposal)
        db.session.flush()

        # Create proposal milestones
        for idx, milestone_data in enumerate(milestones_data, start=1):
            milestone = ProposalMilestone(
                proposal_id=proposal.id,
                milestone_number=idx,
                title=milestone_data['title'],
                deliverables=milestone_data['deliverables'],
                duration_days=int(milestone_data['duration_days']),
                price=float(milestone_data['price']) if milestone_data.get('price') else None,
                notes=milestone_data.get('notes')
            )
            db.session.add(milestone)

        db.session.commit()

        # Notify brand
        create_notification(
            user_id=brief.brand.user_id,
            notification_type='proposal_received',
            title='New Proposal Received',
            message=f'{creator.username} submitted a proposal for "{brief.title}"',
            action_url=f'/brand/briefs/{brief_id}/proposals'
        )

        return jsonify({
            'message': 'Proposal submitted successfully',
            'proposal': proposal.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
@jwt_required()
def get_proposals():
    """Get my proposals (Creator only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can view their proposals'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        query = Proposal.query.filter_by(creator_id=creator.id)

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(Proposal.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'proposals': [p.to_dict(include_relations=True) for p in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:proposal_id>', methods=['GET'])
@jwt_required()
def get_proposal(proposal_id):
    """Get proposal details"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        proposal = Proposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        # Check authorization
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if proposal.creator_id != creator.id:
                return jsonify({'error': 'Unauthorized'}), 403
        else:
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            if proposal.brief.brand_id != brand.id:
                return jsonify({'error': 'Unauthorized'}), 403

        return jsonify(proposal.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:proposal_id>', methods=['PATCH'])
@jwt_required()
def update_proposal(proposal_id):
    """Update proposal (Creator only, pending status only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can update proposals'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        proposal = Proposal.query.get(proposal_id)

        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Can only update pending proposals'}), 400

        data = request.get_json()

        # Update fields
        if 'message' in data:
            proposal.message = data['message']
        if 'total_price' in data:
            proposal.total_price = float(data['total_price'])
        if 'pricing_type' in data:
            proposal.pricing_type = data['pricing_type']
        if 'timeline_days' in data:
            proposal.timeline_days = int(data['timeline_days'])

        # Update milestones if provided
        if 'milestones' in data:
            # Delete existing milestones
            ProposalMilestone.query.filter_by(proposal_id=proposal.id).delete()

            # Create new milestones
            for idx, milestone_data in enumerate(data['milestones'], start=1):
                milestone = ProposalMilestone(
                    proposal_id=proposal.id,
                    milestone_number=idx,
                    title=milestone_data['title'],
                    deliverables=milestone_data['deliverables'],
                    duration_days=int(milestone_data['duration_days']),
                    price=float(milestone_data['price']) if milestone_data.get('price') else None,
                    notes=milestone_data.get('notes')
                )
                db.session.add(milestone)

        proposal.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Proposal updated successfully',
            'proposal': proposal.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:proposal_id>', methods=['DELETE'])
@jwt_required()
def delete_proposal(proposal_id):
    """Withdraw proposal (Creator only, pending status only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can withdraw proposals'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        proposal = Proposal.query.get(proposal_id)

        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Can only withdraw pending proposals'}), 400

        db.session.delete(proposal)
        db.session.commit()

        return jsonify({'message': 'Proposal withdrawn successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:proposal_id>/accept', methods=['POST'])
@jwt_required()
def accept_proposal(proposal_id):
    """Accept proposal and create booking (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can accept proposals'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        proposal = Proposal.query.get(proposal_id)

        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Proposal has already been processed'}), 400

        # Mark proposal as accepted
        proposal.status = 'accepted'

        # Close the brief
        brief = proposal.brief
        brief.status = 'closed'
        brief.closed_at = datetime.utcnow()

        # Create booking
        booking = Booking(
            brand_id=brand.id,
            creator_id=proposal.creator_id,
            booking_type='brief',
            amount=float(proposal.total_price),
            total_price=float(proposal.total_price),
            status='pending',
            payment_status='pending',
            booking_date=datetime.utcnow(),
            notes=f'Brief: {brief.title}'
        )
        db.session.add(booking)
        db.session.flush()

        db.session.commit()

        # Notify creator
        create_notification(
            user_id=proposal.creator.user_id,
            notification_type='proposal_accepted',
            title='Proposal Accepted!',
            message=f'Your proposal for "{brief.title}" has been accepted',
            action_url=f'/creator/proposals/{proposal_id}'
        )

        return jsonify({
            'message': 'Proposal accepted. Redirecting to payment.',
            'booking_id': booking.id,
            'redirect_to_payment': True
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:proposal_id>/reject', methods=['POST'])
@jwt_required()
def reject_proposal(proposal_id):
    """Reject proposal (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can reject proposals'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        proposal = Proposal.query.get(proposal_id)

        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Proposal has already been processed'}), 400

        proposal.status = 'rejected'
        db.session.commit()

        # Notify creator
        create_notification(
            user_id=proposal.creator.user_id,
            notification_type='proposal_rejected',
            title='Proposal Not Selected',
            message=f'Your proposal for "{proposal.brief.title}" was not selected',
            action_url=f'/creator/proposals/{proposal_id}'
        )

        return jsonify({'message': 'Proposal rejected'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
