from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db, socketio
from app.models import Collaboration, BrandProfile, CreatorProfile, User
from app.utils.notifications import notify_collaboration_status, notify_collaboration_update

bp = Blueprint('collaborations', __name__)



def emit_collaboration_update(collaboration_id):
    """Emit Socket.IO event when collaboration is updated"""
    try:
        socketio.emit('collaboration_updated', {
            'collaboration_id': collaboration_id
        }, namespace='/')
    except Exception as e:
        print(f"Socket.IO emit error: {e}")


@bp.route('/', methods=['GET'])
@jwt_required()
def get_collaborations():
    """Get all collaborations for current user (brand or creator)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status_filter = request.args.get('status')  # in_progress, completed, cancelled
        collab_type = request.args.get('type')  # campaign, package

        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            query = Collaboration.query.filter_by(creator_id=creator.id)
        else:
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            query = Collaboration.query.filter_by(brand_id=brand.id)

        if status_filter:
            query = query.filter_by(status=status_filter)

        if collab_type:
            query = query.filter_by(collaboration_type=collab_type)

        pagination = query.order_by(Collaboration.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        collaborations = [collab.to_dict(include_relations=True) for collab in pagination.items]

        return jsonify({
            'collaborations': collaborations,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>', methods=['GET'])
@jwt_required()
def get_collaboration(collab_id):
    """Get details of a specific collaboration"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Check authorization
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if collaboration.creator_id != creator.id:
                return jsonify({'error': 'Unauthorized'}), 403
        else:
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            if collaboration.brand_id != brand.id:
                return jsonify({'error': 'Unauthorized'}), 403

        return jsonify(collaboration.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/progress', methods=['PATCH'])
@jwt_required()
def update_progress(collab_id):
    """Update collaboration progress (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Update progress percentage
        if 'progress_percentage' in data:
            progress = int(data['progress_percentage'])
            if 0 <= progress <= 100:
                collaboration.progress_percentage = progress
            else:
                return jsonify({'error': 'Progress must be between 0 and 100'}), 400

        # Update latest progress note
        if 'update' in data:
            collaboration.last_update = data['update']
            collaboration.last_update_date = datetime.utcnow()

        # Update notes
        if 'notes' in data:
            collaboration.notes = data['notes']

        collaboration.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Progress updated successfully',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/deliverables/draft', methods=['POST'])
@jwt_required()
def submit_draft_deliverable(collab_id):
    """Submit a deliverable for review (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Check deliverable limit (max 3 total deliverables)
        total_deliverables = (len(collaboration.draft_deliverables or []) +
                             len(collaboration.submitted_deliverables or []))
        if total_deliverables >= 3:
            return jsonify({'error': 'Maximum of 3 deliverables allowed per collaboration'}), 400

        # Create deliverable object
        deliverable = {
            'id': len(collaboration.draft_deliverables or []) + 1,
            'title': data['title'],
            'url': data['url'],
            'description': data.get('description', ''),
            'submitted_at': datetime.utcnow().isoformat(),
            'type': data.get('type', 'file'),
            'status': 'pending_review'
        }

        # Add to draft deliverables
        if collaboration.draft_deliverables is None:
            collaboration.draft_deliverables = []

        collaboration.draft_deliverables.append(deliverable)

        # Update last update
        collaboration.last_update = f"Submitted deliverable for review: {data['title']}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flag as modified for JSON field
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'draft_deliverables')

        db.session.commit()

        # Notify brand about new deliverable for review
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"New deliverable submitted for review: {data['title']}"
            )

        return jsonify({
            'message': 'Deliverable submitted for review',
            'deliverable': deliverable,
            'collaboration': collaboration.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_deliverable(collab_id, deliverable_id):
    """Approve a draft deliverable (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Find the draft deliverable
        draft_deliverables = collaboration.draft_deliverables or []
        deliverable_to_approve = None
        remaining_drafts = []

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                deliverable_to_approve = d.copy()
                deliverable_to_approve['status'] = 'approved'
                deliverable_to_approve['approved_at'] = datetime.utcnow().isoformat()
            else:
                remaining_drafts.append(d)

        if not deliverable_to_approve:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Move to submitted deliverables
        if collaboration.submitted_deliverables is None:
            collaboration.submitted_deliverables = []

        collaboration.submitted_deliverables.append(deliverable_to_approve)
        collaboration.draft_deliverables = remaining_drafts

        # Auto-calculate progress
        collaboration.progress_percentage = collaboration.calculate_progress()

        # Update last update
        collaboration.last_update = f"Deliverable approved: {deliverable_to_approve['title']}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flags as modified for JSON fields
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'submitted_deliverables')
        flag_modified(collaboration, 'draft_deliverables')

        db.session.commit()

        # Notify creator about approval
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Your deliverable '{deliverable_to_approve['title']}' has been approved!"
            )

        return jsonify({
            'message': 'Deliverable approved successfully',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/deliverables/<int:deliverable_id>/request-revision', methods=['POST'])
@jwt_required()
def request_revision(collab_id, deliverable_id):
    """Request revision on a draft deliverable (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        revision_notes = data.get('notes', '')

        if not revision_notes:
            return jsonify({'error': 'Revision notes are required'}), 400

        # Find the draft deliverable
        draft_deliverables = collaboration.draft_deliverables or []
        deliverable_found = False

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                d['status'] = 'revision_requested'
                d['revision_notes'] = revision_notes
                d['revision_requested_at'] = datetime.utcnow().isoformat()
                deliverable_found = True
                deliverable_title = d['title']
                break

        if not deliverable_found:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Track revision request
        creator = collaboration.creator
        total_revisions = collaboration.total_revisions_used or 0
        free_revisions = creator.free_revisions or 2

        revision_request = {
            'deliverable_id': deliverable_id,
            'deliverable_title': deliverable_title,
            'notes': revision_notes,
            'requested_at': datetime.utcnow().isoformat(),
            'is_paid': total_revisions >= free_revisions,
            'fee': creator.revision_fee if total_revisions >= free_revisions else 0
        }

        if collaboration.revision_requests is None:
            collaboration.revision_requests = []

        collaboration.revision_requests.append(revision_request)
        collaboration.total_revisions_used = total_revisions + 1

        if revision_request['is_paid']:
            collaboration.paid_revisions = (collaboration.paid_revisions or 0) + 1

        # Update last update
        collaboration.last_update = f"Revision requested for: {deliverable_title}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flags as modified for JSON fields
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'draft_deliverables')
        flag_modified(collaboration, 'revision_requests')

        db.session.commit()

        # Notify creator about revision request
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Revision requested for '{deliverable_title}'"
            )

        return jsonify({
            'message': 'Revision requested successfully',
            'revision_request': revision_request,
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/deliverables/<int:deliverable_id>', methods=['PUT'])
@jwt_required()
def update_deliverable(collab_id, deliverable_id):
    """Update a deliverable with revision_requested status (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Find the draft deliverable
        draft_deliverables = collaboration.draft_deliverables or []
        deliverable_updated = False

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                # Only allow editing if status is revision_requested
                if d.get('status') != 'revision_requested':
                    return jsonify({'error': 'Can only edit deliverables with revision requested'}), 400

                # Update the deliverable
                d['title'] = data['title']
                d['url'] = data['url']
                d['description'] = data.get('description', '')
                d['type'] = data.get('type', 'file')
                d['status'] = 'pending_review'  # Reset to pending review after update
                d['submitted_at'] = datetime.utcnow().isoformat()
                # Clear revision notes
                d.pop('revision_notes', None)
                d.pop('revision_requested_at', None)
                deliverable_updated = True
                deliverable_title = d['title']
                break

        if not deliverable_updated:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Update last update
        collaboration.last_update = f"Updated deliverable: {deliverable_title}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flag as modified for JSON field
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'draft_deliverables')

        db.session.commit()

        # Notify brand about updated deliverable
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Deliverable '{deliverable_title}' has been updated and resubmitted"
            )

        return jsonify({
            'message': 'Deliverable updated successfully',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_deliverable(collab_id):
    """Submit a final deliverable directly (creator only) - Legacy endpoint"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Check deliverable limit (max 3 total deliverables)
        total_deliverables = (len(collaboration.draft_deliverables or []) +
                             len(collaboration.submitted_deliverables or []))
        if total_deliverables >= 3:
            return jsonify({'error': 'Maximum of 3 deliverables allowed per collaboration'}), 400

        # Create deliverable object
        deliverable = {
            'title': data['title'],
            'url': data['url'],
            'description': data.get('description', ''),
            'submitted_at': datetime.utcnow().isoformat(),
            'type': data.get('type', 'file')  # file, link, etc.
        }

        # Add to submitted deliverables
        if collaboration.submitted_deliverables is None:
            collaboration.submitted_deliverables = []

        collaboration.submitted_deliverables.append(deliverable)

        # Auto-calculate progress
        collaboration.progress_percentage = collaboration.calculate_progress()

        # Update last update
        collaboration.last_update = f"Submitted deliverable: {data['title']}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flag as modified for JSON field
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'submitted_deliverables')

        db.session.commit()

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable,
            'collaboration': collaboration.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/complete', methods=['PATCH'])
@jwt_required()
def complete_collaboration(collab_id):
    """Mark collaboration as completed (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        collaboration.status = 'completed'
        collaboration.actual_completion_date = datetime.utcnow()
        collaboration.progress_percentage = 100
        collaboration.updated_at = datetime.utcnow()

        # Also mark the related booking as completed if it exists
        if collaboration.booking_id:
            from app.models import Booking
            booking = Booking.query.get(collaboration.booking_id)
            if booking and booking.status != 'completed':
                booking.status = 'completed'
                booking.completion_date = datetime.utcnow()

        db.session.commit()

        # Notify creator that collaboration is completed
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_status(
                user_id=creator_user.id,
                status='completed',
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                user_type='creator'
            )

        return jsonify({
            'message': 'Collaboration marked as completed',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/cancel-request', methods=['POST'])
@jwt_required()
def request_cancellation(collab_id):
    """Request cancellation (brand only - requires support approval)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Check authorization
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if collaboration.creator_id != creator.id:
                return jsonify({'error': 'Unauthorized'}), 403
        else:
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            if collaboration.brand_id != brand.id:
                return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        cancellation_reason = data.get('reason', '')

        if not cancellation_reason:
            return jsonify({'error': 'Cancellation reason is required'}), 400

        # For brands, create a cancellation request that needs support approval
        if user.user_type == 'brand':
            if collaboration.cancellation_request and collaboration.cancellation_request.get('status') == 'pending':
                return jsonify({'error': 'Cancellation request already pending'}), 400

            cancellation_request = {
                'requested_by': 'brand',
                'user_id': user_id,
                'reason': cancellation_reason,
                'requested_at': datetime.utcnow().isoformat(),
                'status': 'pending'
            }

            collaboration.cancellation_request = cancellation_request
            collaboration.updated_at = datetime.utcnow()

            # Mark the flag as modified for JSON field
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(collaboration, 'cancellation_request')

            db.session.commit()

            # TODO: Send email/notification to support team
            # For now, notify the creator about the cancellation request
            creator_user = User.query.get(collaboration.creator.user_id)
            if creator_user:
                notify_collaboration_update(
                    user_id=creator_user.id,
                    collaboration_title=collaboration.title,
                    collaboration_id=collaboration.id,
                    update_message="Brand has requested to cancel this collaboration. Support team is reviewing."
                )

            return jsonify({
                'message': 'Cancellation request submitted to support team for review',
                'collaboration': collaboration.to_dict()
            }), 200

        else:
            # Creators can still cancel directly
            collaboration.status = 'cancelled'
            collaboration.notes = f"{collaboration.notes or ''}\n\nCancelled by creator: {cancellation_reason}"
            collaboration.updated_at = datetime.utcnow()

            db.session.commit()

            # Notify brand about cancellation
            brand_user = User.query.get(collaboration.brand.user_id)
            if brand_user:
                notify_collaboration_status(
                    user_id=brand_user.id,
                    status='cancelled',
                    collaboration_title=collaboration.title,
                    collaboration_id=collaboration.id,
                    user_type='brand'
                )

            return jsonify({
                'message': 'Collaboration cancelled',
                'collaboration': collaboration.to_dict()
            }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/cancel', methods=['PATCH'])
@jwt_required()
def cancel_collaboration(collab_id):
    """Cancel collaboration (creator only, or support admin)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        collaboration = Collaboration.query.get(collab_id)
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        data = request.get_json()
        cancellation_reason = data.get('reason', 'No reason provided')

        # Only creators can directly cancel, brands must use cancel-request endpoint
        if user.user_type == 'brand':
            return jsonify({
                'error': 'Brands cannot directly cancel collaborations. Please use the cancellation request endpoint.'
            }), 403

        # Check authorization for creator
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        if collaboration.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        collaboration.status = 'cancelled'
        collaboration.notes = f"{collaboration.notes or ''}\n\nCancelled by creator: {cancellation_reason}"
        collaboration.updated_at = datetime.utcnow()

        db.session.commit()

        # Notify brand about cancellation
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_status(
                user_id=brand_user.id,
                status='cancelled',
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                user_type='brand'
            )

        return jsonify({
            'message': 'Collaboration cancelled',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
