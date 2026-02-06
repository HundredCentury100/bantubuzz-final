from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from app import db, socketio
from app.models import Collaboration, BrandProfile, CreatorProfile, User, CollaborationMilestone, MilestoneDeliverable
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
        print(f"[SUBMIT_DRAFT] Received data: {data}")

        # Validate required fields
        if not data:
            print("[SUBMIT_DRAFT] Error: No data received")
            return jsonify({'error': 'No data provided'}), 400

        if 'title' not in data or 'url' not in data:
            print(f"[SUBMIT_DRAFT] Error: Missing fields. Keys: {list(data.keys()) if data else 'None'}")
            return jsonify({'error': 'Title and URL are required'}), 400

        if not data.get('title') or not data.get('url'):
            print(f"[SUBMIT_DRAFT] Error: Empty values. Title: '{data.get('title')}', URL: '{data.get('url')}'")
            return jsonify({'error': 'Title and URL cannot be empty'}), 400

        # Check deliverable limit based on expected deliverables for this collaboration
        # The limit is determined by the number of deliverables specified in the package/campaign
        expected_deliverables_count = len(collaboration.deliverables or [])

        # Count only unique deliverables (not counting revision_requested status which are edits)
        draft_count = len([d for d in (collaboration.draft_deliverables or []) if d.get('status') != 'revision_requested'])
        submitted_count = len(collaboration.submitted_deliverables or [])
        total_unique_deliverables = draft_count + submitted_count

        print(f"[SUBMIT_DRAFT] Expected: {expected_deliverables_count}, Draft: {draft_count}, Submitted: {submitted_count}, Total: {total_unique_deliverables}")

        if total_unique_deliverables >= expected_deliverables_count:
            return jsonify({
                'error': f'Maximum of {expected_deliverables_count} deliverables allowed for this collaboration',
                'message': f'You have already submitted {total_unique_deliverables} of {expected_deliverables_count} expected deliverables. You can only edit existing deliverables that need revision.'
            }), 400

        # Generate unique ID for deliverable
        # Find the max ID from both draft and submitted deliverables
        existing_ids = []
        if collaboration.draft_deliverables:
            existing_ids.extend([d.get('id', 0) for d in collaboration.draft_deliverables])
        if collaboration.submitted_deliverables:
            existing_ids.extend([d.get('id', 0) for d in collaboration.submitted_deliverables])

        next_id = max(existing_ids) + 1 if existing_ids else 1

        # Create deliverable object
        deliverable = {
            'id': next_id,
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

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

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
        print(f"Error submitting draft deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
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

        # Auto-complete if progress reaches 100%
        if collaboration.progress_percentage >= 100 and collaboration.status == 'in_progress':
            collaboration.status = 'completed'
            collaboration.actual_completion_date = datetime.utcnow()
            collaboration.last_update = "Collaboration automatically completed (100% progress reached)"
            collaboration.escrow_status = 'escrowed'

            # Release escrow to creator wallet
            if collaboration.booking_id:
                from app.models import Booking
                booking = Booking.query.get(collaboration.booking_id)
                if booking and booking.status != 'completed':
                    booking.status = 'completed'
                    booking.completion_date = datetime.utcnow()
                    booking.escrow_status = 'escrowed'
                    booking.escrowed_at = datetime.utcnow()

            # Release funds to wallet
            try:
                from app.services.payment_service import release_escrow_to_wallet
                transaction = release_escrow_to_wallet(collaboration.id, platform_fee_percentage=15)
                print(f"Auto-completion: Escrow released for collaboration {collaboration.id}. Transaction: {transaction.id}")
            except Exception as e:
                print(f"Warning: Failed to auto-release escrow: {str(e)}")

            # Notify both parties
            creator_user = User.query.get(collaboration.creator.user_id)
            brand_user = User.query.get(collaboration.brand.user_id)

            if creator_user:
                notify_collaboration_status(
                    user_id=creator_user.id,
                    status='completed',
                    collaboration_title=collaboration.title,
                    collaboration_id=collaboration.id,
                    user_type='creator'
                )

            if brand_user:
                notify_collaboration_status(
                    user_id=brand_user.id,
                    status='completed',
                    collaboration_title=collaboration.title,
                    collaboration_id=collaboration.id,
                    user_type='brand'
                )
        else:
            # Normal update
            collaboration.last_update = f"Deliverable approved: {deliverable_to_approve['title']}"

        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flags as modified for JSON fields
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'submitted_deliverables')
        flag_modified(collaboration, 'draft_deliverables')

        db.session.commit()

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

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

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

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


@bp.route('/<int:collab_id>/revision/create-booking', methods=['POST'])
@jwt_required()
def create_revision_booking(collab_id):
    """Create a booking for paid revision (brand only)"""
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
        deliverable_id = data.get('deliverable_id')
        notes = data.get('notes')
        fee = data.get('fee', 0)

        if not deliverable_id or not notes:
            return jsonify({'error': 'Deliverable ID and notes are required'}), 400

        # Find the deliverable
        draft_deliverables = collaboration.draft_deliverables or []
        deliverable_found = False
        deliverable_title = None

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                deliverable_found = True
                deliverable_title = d['title']
                break

        if not deliverable_found:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Create booking for revision fee
        from app.models import Booking
        booking = Booking(
            brand_id=brand.id,
            creator_id=collaboration.creator_id,
            package_id=None,
            campaign_id=None,
            booking_type='paid_revision',
            amount=float(fee),
            total_price=float(fee),
            status='pending',
            payment_status='pending',
            notes=f"Paid revision for deliverable: {deliverable_title}"
        )
        db.session.add(booking)
        db.session.flush()  # Get the booking ID

        # Store revision data in booking notes as JSON
        import json
        revision_data = {
            'collaboration_id': collab_id,
            'deliverable_id': deliverable_id,
            'deliverable_title': deliverable_title,
            'revision_notes': notes
        }
        booking.notes = json.dumps(revision_data)

        db.session.commit()

        return jsonify({
            'message': 'Booking created for revision. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to_payment': True
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"ERROR in create_revision_booking: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/revision/complete-payment', methods=['POST'])
@jwt_required()
def complete_revision_payment(collab_id):
    """Complete revision payment and request the revision (brand only)"""
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
        booking_id = data.get('booking_id')

        if not booking_id:
            return jsonify({'error': 'Booking ID is required'}), 400

        # Verify booking is paid
        from app.models import Booking
        booking = Booking.query.get(booking_id)
        if not booking or booking.payment_status != 'verified':
            return jsonify({'error': 'Payment not verified'}), 400

        # Extract revision data from booking notes
        import json
        revision_data = json.loads(booking.notes)
        deliverable_id = revision_data['deliverable_id']
        revision_notes = revision_data['revision_notes']
        deliverable_title = revision_data['deliverable_title']

        # Now request the revision
        draft_deliverables = collaboration.draft_deliverables or []

        for d in draft_deliverables:
            if d.get('id') == deliverable_id:
                d['status'] = 'revision_requested'
                d['revision_notes'] = revision_notes
                d['revision_requested_at'] = datetime.utcnow().isoformat()
                break

        # Track revision request
        creator = collaboration.creator
        total_revisions = collaboration.total_revisions_used or 0

        revision_request = {
            'deliverable_id': deliverable_id,
            'deliverable_title': deliverable_title,
            'notes': revision_notes,
            'requested_at': datetime.utcnow().isoformat(),
            'is_paid': True,
            'fee': booking.amount,
            'booking_id': booking_id
        }

        if collaboration.revision_requests is None:
            collaboration.revision_requests = []

        collaboration.revision_requests.append(revision_request)
        collaboration.total_revisions_used = total_revisions + 1
        collaboration.paid_revisions = (collaboration.paid_revisions or 0) + 1

        # Update last update
        collaboration.last_update = f"Paid revision requested for: {deliverable_title}"
        collaboration.last_update_date = datetime.utcnow()
        collaboration.updated_at = datetime.utcnow()

        # Mark the flags as modified for JSON fields
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(collaboration, 'draft_deliverables')
        flag_modified(collaboration, 'revision_requests')

        db.session.commit()

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

        # Notify creator about revision request
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Paid revision requested for '{deliverable_title}'"
            )

        return jsonify({
            'message': 'Revision requested successfully after payment',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"ERROR in complete_revision_payment: {str(e)}")
        traceback.print_exc()
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

        # Emit Socket.IO update
        emit_collaboration_update(collaboration.id)

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

        # Check if payment has been made before allowing completion
        # For package-based collaborations, check booking payment status
        if collaboration.booking_id:
            from app.models import Booking, Payment
            booking = Booking.query.get(collaboration.booking_id)
            if not booking:
                return jsonify({
                    'error': 'Booking not found',
                    'message': 'Associated booking not found for this collaboration'
                }), 404

            # Check if booking payment is verified/paid
            if booking.payment_status not in ['paid', 'verified']:
                return jsonify({
                    'error': 'Cannot complete collaboration - booking payment not verified',
                    'message': f'Booking payment status is "{booking.payment_status}". Please ensure payment is verified before marking collaboration as complete'
                }), 400

            # Check if Payment record exists - if not, create it retroactively for old bookings
            payment = Payment.query.filter_by(booking_id=booking.id).first()
            if not payment:
                # Create Payment record for old bookings that were verified before Payment table existed
                print(f"Creating retroactive Payment record for booking {booking.id}")
                payment = Payment(
                    booking_id=booking.id,
                    user_id=brand.user_id,
                    amount=booking.total_price if hasattr(booking, 'total_price') else booking.amount,
                    payment_method=booking.payment_method or 'manual',
                    payment_type='manual',
                    status='completed',
                    completed_at=booking.created_at,
                    escrow_status='escrowed',
                    held_amount=booking.total_price if hasattr(booking, 'total_price') else booking.amount
                )
                db.session.add(payment)
                db.session.flush()  # Get the payment ID

            # Ensure payment status is correct
            if payment.status not in ['paid', 'completed']:
                return jsonify({
                    'error': 'Cannot complete collaboration - payment not completed',
                    'message': f'Payment status is "{payment.status}". Please ensure payment is completed before marking collaboration as complete'
                }), 400

        # For campaign-based collaborations, check Payment table
        elif collaboration.collaboration_type == 'campaign':
            from app.models import Payment
            payment = Payment.query.filter_by(collaboration_id=collaboration.id).first()
            if not payment or payment.status not in ['paid', 'completed']:
                return jsonify({
                    'error': 'Cannot complete collaboration - payment not received',
                    'message': 'Please ensure payment is completed before marking collaboration as complete'
                }), 400

        collaboration.status = 'completed'
        collaboration.actual_completion_date = datetime.utcnow()
        collaboration.progress_percentage = 100
        collaboration.updated_at = datetime.utcnow()

        # Trigger escrow when brand completes collaboration
        collaboration.escrow_status = 'escrowed'

        # Also mark the related booking as completed if it exists
        if collaboration.booking_id:
            from app.models import Booking
            booking = Booking.query.get(collaboration.booking_id)
            if booking and booking.status != 'completed':
                booking.status = 'completed'
                booking.completion_date = datetime.utcnow()
                # Mark escrow on booking as well
                booking.escrow_status = 'escrowed'
                booking.escrowed_at = datetime.utcnow()

        db.session.commit()

        # Release escrow to creator wallet with 24-hour countdown
        try:
            from app.services.payment_service import release_escrow_to_wallet
            transaction = release_escrow_to_wallet(collaboration.id, platform_fee_percentage=15)

            # Transaction created successfully with 24-hour countdown
            print(f"Escrow released to wallet for collaboration {collaboration.id}. Transaction ID: {transaction.id}")
        except Exception as e:
            # Log error but don't fail the completion
            print(f"Warning: Failed to release escrow to wallet: {str(e)}")
            # We don't rollback here because the collaboration is still completed
            # Admin can manually release escrow later if needed

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


# ============================================================================
# MILESTONE DELIVERABLE ENDPOINTS (for Brief/Campaign Collaborations)
# ============================================================================

@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_milestone_deliverable(collab_id, milestone_id):
    """Submit deliverable to a specific milestone (creator only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Create deliverable
        deliverable = MilestoneDeliverable(
            collaboration_milestone_id=milestone.id,
            title=data['title'],
            url=data['url'],
            description=data.get('description', ''),
            status='pending_review'
        )
        db.session.add(deliverable)
        
        # Update milestone status if it's pending
        if milestone.status == 'pending':
            milestone.status = 'in_progress'
        
        db.session.commit()

        # Update collaboration
        collaboration.last_update = f"Deliverable submitted for {milestone.title}"
        collaboration.last_update_date = datetime.utcnow()
        db.session.commit()

        # Notify brand
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"New deliverable submitted for milestone: {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_milestone_deliverable(collab_id, milestone_id, deliverable_id):
    """Approve milestone deliverable (brand only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Approve deliverable
        deliverable.status = 'approved'
        deliverable.approved_at = datetime.utcnow()
        db.session.commit()

        # Check if milestone is now complete (all deliverables approved)
        if milestone.is_complete():
            milestone.status = 'completed'
            milestone.completed_at = datetime.utcnow()
            milestone.approved_at = datetime.utcnow()

            # Trigger escrow for this milestone
            milestone.escrow_triggered_at = datetime.utcnow()
            milestone.escrow_release_date = (datetime.utcnow() + timedelta(days=30)).date()

            # Release escrow for this specific milestone
            from app.services.payment_service import release_milestone_escrow
            try:
                transaction = release_milestone_escrow(milestone.id, platform_fee_percentage=15)
                print(f"Milestone {milestone.id} escrow released. Transaction: {transaction.id}")
            except Exception as e:
                print(f"Warning: Failed to release milestone escrow: {str(e)}")

            # Check if all milestones are complete
            all_milestones = collaboration.milestones.all()
            all_complete = all(m.status == 'completed' for m in all_milestones)
            
            if all_complete:
                collaboration.status = 'completed'
                collaboration.actual_completion_date = datetime.utcnow()
                collaboration.progress_percentage = 100
                
                # Notify both parties
                creator_user = User.query.get(collaboration.creator.user_id)
                if creator_user:
                    notify_collaboration_status(
                        user_id=creator_user.id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='creator'
                    )
                
                if brand.user_id:
                    notify_collaboration_status(
                        user_id=brand.user_id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='brand'
                    )

        db.session.commit()

        # Notify creator about approval
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Deliverable approved for {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable approved successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True),
            'collaboration': collaboration.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error approving milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/request-revision', methods=['POST


# ============================================================================
# MILESTONE DELIVERABLE ENDPOINTS (for Brief/Campaign Collaborations)
# ============================================================================

@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_milestone_deliverable(collab_id, milestone_id):
    """Submit deliverable to a specific milestone (creator only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        data = request.get_json()

        # Validate required fields
        if 'title' not in data or 'url' not in data:
            return jsonify({'error': 'Title and URL are required'}), 400

        # Create deliverable
        deliverable = MilestoneDeliverable(
            collaboration_milestone_id=milestone.id,
            title=data['title'],
            url=data['url'],
            description=data.get('description', ''),
            status='pending_review'
        )
        db.session.add(deliverable)

        # Update milestone status if it's pending
        if milestone.status == 'pending':
            milestone.status = 'in_progress'

        db.session.commit()

        # Update collaboration
        collaboration.last_update = f"Deliverable submitted for {milestone.title}"
        collaboration.last_update_date = datetime.utcnow()
        db.session.commit()

        # Notify brand
        brand_user = User.query.get(collaboration.brand.user_id)
        if brand_user:
            notify_collaboration_update(
                user_id=brand_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"New deliverable submitted for milestone: {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable submitted successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error submitting milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/approve', methods=['POST'])
@jwt_required()
def approve_milestone_deliverable(collab_id, milestone_id, deliverable_id):
    """Approve milestone deliverable (brand only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        # Approve deliverable
        deliverable.status = 'approved'
        deliverable.approved_at = datetime.utcnow()
        db.session.commit()

        # Check if milestone is now complete (all deliverables approved)
        if milestone.is_complete():
            milestone.status = 'completed'
            milestone.completed_at = datetime.utcnow()
            milestone.approved_at = datetime.utcnow()

            # Trigger escrow for this milestone
            milestone.escrow_triggered_at = datetime.utcnow()
            milestone.escrow_release_date = (datetime.utcnow() + timedelta(days=30)).date()

            # Release escrow for this specific milestone
            from app.services.payment_service import release_milestone_escrow
            try:
                transaction = release_milestone_escrow(milestone.id, platform_fee_percentage=15)
                print(f"Milestone {milestone.id} escrow released. Transaction: {transaction.id}")
            except Exception as e:
                print(f"Warning: Failed to release milestone escrow: {str(e)}")

            # Check if all milestones are complete
            all_milestones = collaboration.milestones.all()
            all_complete = all(m.status == 'completed' for m in all_milestones)

            if all_complete:
                collaboration.status = 'completed'
                collaboration.actual_completion_date = datetime.utcnow()
                collaboration.progress_percentage = 100

                # Notify both parties
                creator_user = User.query.get(collaboration.creator.user_id)
                if creator_user:
                    notify_collaboration_status(
                        user_id=creator_user.id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='creator'
                    )

                brand_user = User.query.get(collaboration.brand.user_id)
                if brand_user:
                    notify_collaboration_status(
                        user_id=brand_user.id,
                        status='completed',
                        collaboration_title=collaboration.title,
                        collaboration_id=collaboration.id,
                        user_type='brand'
                    )

        db.session.commit()

        # Notify creator about approval
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Deliverable approved for {milestone.title}"
            )

        return jsonify({
            'message': 'Deliverable approved successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True),
            'collaboration': collaboration.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error approving milestone deliverable: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/milestones/<int:milestone_id>/deliverables/<int:deliverable_id>/request-revision', methods=['POST'])
@jwt_required()
def request_milestone_deliverable_revision(collab_id, milestone_id, deliverable_id):
    """Request revision on milestone deliverable (brand only)"""
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

        milestone = CollaborationMilestone.query.get(milestone_id)
        if not milestone or milestone.collaboration_id != collab_id:
            return jsonify({'error': 'Milestone not found'}), 404

        deliverable = MilestoneDeliverable.query.get(deliverable_id)
        if not deliverable or deliverable.collaboration_milestone_id != milestone.id:
            return jsonify({'error': 'Deliverable not found'}), 404

        data = request.get_json()
        revision_notes = data.get('notes', '')

        if not revision_notes:
            return jsonify({'error': 'Revision notes are required'}), 400

        # Update deliverable
        deliverable.status = 'revision_requested'
        deliverable.revision_notes = revision_notes
        deliverable.revision_requested_at = datetime.utcnow()

        db.session.commit()

        # Notify creator
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            notify_collaboration_update(
                user_id=creator_user.id,
                collaboration_title=collaboration.title,
                collaboration_id=collaboration.id,
                update_message=f"Revision requested for deliverable in {milestone.title}"
            )

        return jsonify({
            'message': 'Revision requested successfully',
            'deliverable': deliverable.to_dict(),
            'milestone': milestone.to_dict(include_deliverables=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error requesting milestone deliverable revision: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
'''
