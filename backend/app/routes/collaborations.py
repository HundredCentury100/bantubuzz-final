from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Collaboration, BrandProfile, CreatorProfile, User

bp = Blueprint('collaborations', __name__)


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


@bp.route('/<int:collab_id>/deliverables', methods=['POST'])
@jwt_required()
def submit_deliverable(collab_id):
    """Submit a deliverable (creator only)"""
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

        db.session.commit()

        return jsonify({
            'message': 'Collaboration marked as completed',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:collab_id>/cancel', methods=['PATCH'])
@jwt_required()
def cancel_collaboration(collab_id):
    """Cancel collaboration (brand or creator)"""
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
        cancellation_reason = data.get('reason', 'No reason provided')

        collaboration.status = 'cancelled'
        collaboration.notes = f"{collaboration.notes or ''}\n\nCancelled: {cancellation_reason}"
        collaboration.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'message': 'Collaboration cancelled',
            'collaboration': collaboration.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
