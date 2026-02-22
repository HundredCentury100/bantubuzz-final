from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db, socketio
from app.models import (
    Collaboration, CollaborationMilestone, MilestoneDeliverable,
    User, CreatorProfile, WalletTransaction, Wallet
)
from app.utils.notifications import create_notification

bp = Blueprint('milestones', __name__)


@bp.route('/<int:collaboration_id>/milestones', methods=['GET'])
@jwt_required()
def get_milestones(collaboration_id):
    """Get all milestones for a collaboration"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Check authorization
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if collaboration.creator_id != creator.id:
                return jsonify({'error': 'Unauthorized'}), 403
        else:
            if collaboration.brand.user_id != user_id:
                return jsonify({'error': 'Unauthorized'}), 403

        milestones = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id
        ).order_by(CollaborationMilestone.milestone_number).all()

        return jsonify({
            'milestones': [m.to_dict(include_deliverables=True) for m in milestones]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>', methods=['GET'])
@jwt_required()
def get_milestone(collaboration_id, milestone_number):
    """Get specific milestone details"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Check authorization
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if collaboration.creator_id != creator.id:
                return jsonify({'error': 'Unauthorized'}), 403
        else:
            if collaboration.brand.user_id != user_id:
                return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        return jsonify(milestone.to_dict(include_deliverables=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>/deliverables', methods=['POST'])
@jwt_required()
def submit_deliverable(collaboration_id, milestone_number):
    """Submit deliverable to milestone (Creator only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can submit deliverables'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        collaboration = Collaboration.query.get(collaboration_id)

        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if collaboration.status != 'in_progress':
            return jsonify({'error': 'Collaboration is not in progress'}), 400

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        # Check if milestone is in_progress
        if milestone.status not in ['pending', 'in_progress']:
            return jsonify({'error': 'Cannot submit deliverables to this milestone'}), 400

        # Mark milestone as in_progress if it was pending
        if milestone.status == 'pending':
            milestone.status = 'in_progress'

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Missing required fields: title, url'}), 400

        # Create deliverable
        deliverable = MilestoneDeliverable(
            collaboration_milestone_id=milestone.id,
            title=data['title'],
            url=data['url'],
            description=data.get('description'),
            status='pending_review'
        )
        db.session.add(deliverable)
        db.session.commit()

        # Notify brand
        create_notification(
            user_id=collaboration.brand.user_id,
            notification_type='deliverable_submitted',
            title='New Deliverable Submitted',
            message=f'{creator.username} submitted "{data["title"]}" for Milestone {milestone_number}',
            action_url=f'/brand/collaborations/{collaboration_id}'
        )

        # Emit socket event
        try:
            socketio.emit('collaboration_updated', {
                'collaboration_id': collaboration_id
            }, namespace='/')
        except:
            pass

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>/deliverables/<int:deliverable_id>', methods=['PATCH'])
@jwt_required()
def update_deliverable(collaboration_id, milestone_number, deliverable_id):
    """Update deliverable (Creator only, for revisions)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'creator':
            return jsonify({'error': 'Only creators can update deliverables'}), 403

        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        collaboration = Collaboration.query.get(collaboration_id)

        if not collaboration or collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        data = request.get_json()

        # Update fields
        if 'title' in data:
            deliverable.title = data['title']
        if 'url' in data:
            deliverable.url = data['url']
        if 'description' in data:
            deliverable.description = data['description']

        # Reset status to pending_review
        deliverable.status = 'pending_review'
        deliverable.submitted_at = datetime.utcnow()

        db.session.commit()

        # Notify brand
        create_notification(
            user_id=collaboration.brand.user_id,
            notification_type='deliverable_updated',
            title='Deliverable Updated',
            message=f'{creator.username} updated "{deliverable.title}" for Milestone {milestone_number}',
            action_url=f'/brand/collaborations/{collaboration_id}'
        )

        return jsonify({
            'message': 'Deliverable updated successfully',
            'deliverable': deliverable.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>/approve', methods=['POST'])
@jwt_required()
def approve_milestone(collaboration_id, milestone_number):
    """Approve milestone - triggers escrow (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can approve milestones'}), 403

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        # Check if all deliverables are approved
        total_deliverables = milestone.deliverables.count()
        if total_deliverables == 0:
            return jsonify({'error': 'No deliverables submitted yet'}), 400

        approved_deliverables = milestone.deliverables.filter_by(status='approved').count()
        if approved_deliverables != total_deliverables:
            return jsonify({'error': 'Not all deliverables are approved'}), 400

        # Mark milestone as approved
        milestone.status = 'approved'
        milestone.completed_at = datetime.utcnow()
        milestone.approved_at = datetime.utcnow()

        # Trigger escrow - start 30-day countdown
        milestone.trigger_escrow()

        # Create wallet transaction
        creator = collaboration.creator
        wallet = Wallet.query.filter_by(user_id=creator.user_id).first()
        if not wallet:
            wallet = Wallet(user_id=creator.user_id)
            db.session.add(wallet)
            db.session.flush()

        # Calculate platform fee (10%)
        gross_amount = float(milestone.price)
        platform_fee_percentage = 10.0
        platform_fee = gross_amount * (platform_fee_percentage / 100)
        net_amount = gross_amount - platform_fee

        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=creator.user_id,
            transaction_type='milestone',
            amount=net_amount,
            status='pending_clearance',
            clearance_required=True,
            clearance_days=30,
            completed_at=milestone.approved_at,
            available_at=milestone.approved_at + timedelta(days=30),
            escrow_release_date=milestone.escrow_release_date,
            milestone_id=milestone.id,
            collaboration_id=collaboration.id,
            gross_amount=gross_amount,
            platform_fee=platform_fee,
            platform_fee_percentage=platform_fee_percentage,
            net_amount=net_amount,
            description=f'Milestone {milestone_number} payment for "{collaboration.title}"',
            transaction_metadata={
                'collaboration_id': collaboration.id,
                'milestone_number': milestone_number,
                'brand_name': collaboration.brand.company_name
            }
        )
        db.session.add(transaction)

        # Update wallet pending clearance
        wallet.pending_clearance = float(wallet.pending_clearance or 0) + net_amount

        # Unlock next milestone if exists
        next_milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number + 1
        ).first()

        if next_milestone and next_milestone.status == 'pending':
            next_milestone.status = 'in_progress'

        # Update collaboration progress
        total_milestones = collaboration.milestones.count()
        approved_milestones = collaboration.milestones.filter_by(status='approved').count()
        collaboration.progress_percentage = int((approved_milestones / total_milestones) * 100)

        # Check if all milestones are complete
        if approved_milestones == total_milestones:
            collaboration.status = 'completed'
            collaboration.actual_completion_date = datetime.utcnow()

        db.session.commit()

        # Notify creator
        create_notification(
            user_id=creator.user_id,
            notification_type='milestone_approved',
            title='Milestone Approved!',
            message=f'Milestone {milestone_number} approved. ${net_amount:.2f} in escrow (30 days)',
            action_url=f'/creator/collaborations/{collaboration_id}'
        )

        # Emit socket event
        try:
            socketio.emit('collaboration_updated', {
                'collaboration_id': collaboration_id
            }, namespace='/')
        except:
            pass

        return jsonify({
            'message': 'Milestone approved and escrow triggered',
            'milestone': milestone.to_dict(include_deliverables=True),
            'next_milestone_unlocked': next_milestone.milestone_number if next_milestone else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_deliverable(collaboration_id, milestone_number, deliverable_id):
    """Approve individual deliverable (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can approve deliverables'}), 403

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration or collaboration.brand.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        deliverable.status = 'approved'
        deliverable.approved_at = datetime.utcnow()
        db.session.commit()

        # Notify creator
        create_notification(
            user_id=collaboration.creator.user_id,
            notification_type='deliverable_approved',
            title='Deliverable Approved',
            message=f'"{deliverable.title}" has been approved',
            action_url=f'/creator/collaborations/{collaboration_id}'
        )

        return jsonify({
            'message': 'Deliverable approved',
            'deliverable': deliverable.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collaboration_id>/milestones/<int:milestone_number>/request-revision', methods=['POST'])
@jwt_required()
def request_revision(collaboration_id, milestone_number):
    """Request revision on deliverable (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can request revisions'}), 403

        collaboration = Collaboration.query.get(collaboration_id)
        if not collaboration or collaboration.brand.user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403

        milestone = CollaborationMilestone.query.filter_by(
            collaboration_id=collaboration_id,
            milestone_number=milestone_number
        ).first()

        if not milestone:
            return jsonify({'error': 'Milestone not found'}), 404

        data = request.get_json()

        if 'deliverable_id' not in data or 'notes' not in data:
            return jsonify({'error': 'Missing required fields: deliverable_id, notes'}), 400

        deliverable = MilestoneDeliverable.query.get(data['deliverable_id'])
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        deliverable.status = 'revision_requested'
        deliverable.revision_notes = data['notes']
        deliverable.revision_requested_at = datetime.utcnow()
        db.session.commit()

        # Notify creator
        create_notification(
            user_id=collaboration.creator.user_id,
            notification_type='revision_requested',
            title='Revision Requested',
            message=f'Revision requested for "{deliverable.title}"',
            action_url=f'/creator/collaborations/{collaboration_id}'
        )

        return jsonify({
            'message': 'Revision requested',
            'deliverable': deliverable.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
