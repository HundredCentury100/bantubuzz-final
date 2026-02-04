from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Brief, BriefMilestone, User, BrandProfile, CreatorProfile, Proposal
from app.utils.notifications import create_notification

bp = Blueprint('briefs', __name__)


@bp.route('/', methods=['POST'])
@jwt_required()
def create_brief():
    """Create a new brief (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can create briefs'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        required = ['title', 'description', 'goal', 'platform', 'budget_min', 'budget_max',
                   'timeline_days', 'milestones']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate milestones
        milestones_data = data['milestones']
        if not milestones_data or len(milestones_data) == 0:
            return jsonify({'error': 'At least one milestone is required'}), 400

        # Calculate total duration
        total_duration = sum(m.get('duration_days', 0) for m in milestones_data)

        # Validate milestone requirement: >10 days must have milestones
        if total_duration > 10 and len(milestones_data) < 1:
            return jsonify({'error': 'Campaigns longer than 10 days must have milestones'}), 400

        # Create brief
        brief = Brief(
            brand_id=brand.id,
            title=data['title'],
            description=data['description'],
            goal=data['goal'],
            platform=data['platform'],
            budget_min=float(data['budget_min']),
            budget_max=float(data['budget_max']),
            timeline_days=int(data['timeline_days']),
            total_duration_days=total_duration,
            status='draft',
            target_categories=data.get('target_categories', []),
            target_min_followers=data.get('target_min_followers'),
            target_max_followers=data.get('target_max_followers'),
            target_locations=data.get('target_locations', [])
        )
        db.session.add(brief)
        db.session.flush()

        # Create milestones
        for idx, milestone_data in enumerate(milestones_data, start=1):
            milestone = BriefMilestone(
                brief_id=brief.id,
                milestone_number=idx,
                title=milestone_data['title'],
                description=milestone_data.get('description'),
                expected_deliverables=milestone_data['expected_deliverables'],
                duration_days=int(milestone_data['duration_days']),
                price=float(milestone_data['price']) if milestone_data.get('price') else None
            )
            db.session.add(milestone)

        db.session.commit()

        return jsonify({
            'message': 'Brief created successfully',
            'brief': brief.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
@jwt_required()
def get_briefs():
    """Get briefs - brands see their own, creators see all open briefs"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        status = request.args.get('status', 'open')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        if user.user_type == 'brand':
            # Brand sees their own briefs
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            query = Brief.query.filter_by(brand_id=brand.id)

            if status != 'all':
                query = query.filter_by(status=status)

        else:
            # Creator sees ALL open briefs (not filtered)
            query = Brief.query.filter_by(status='open')

            # Get creator profile for eligibility checking
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            from app.utils.brief_matching import matches_brief_criteria

            # Get all briefs and add meets_criteria flag
            all_briefs = query.order_by(Brief.created_at.desc()).all()

            # Manual pagination
            start = (page - 1) * per_page
            end = start + per_page
            briefs_page = all_briefs[start:end]

            # Add eligibility flag to each brief
            briefs_with_eligibility = []
            for b in briefs_page:
                brief_dict = b.to_dict(include_relations=True)
                brief_dict['meets_criteria'] = matches_brief_criteria(creator, b)
                briefs_with_eligibility.append(brief_dict)

            return jsonify({
                'briefs': briefs_with_eligibility,
                'total': len(all_briefs),
                'pages': (len(all_briefs) + per_page - 1) // per_page,
                'current_page': page
            }), 200

        # Brand query with pagination
        pagination = query.order_by(Brief.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        return jsonify({
            'briefs': [b.to_dict(include_relations=True) for b in pagination.items],
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>', methods=['GET'])
@jwt_required()
def get_brief(brief_id):
    """Get brief details - All authenticated users can view briefs"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        brief = Brief.query.get(brief_id)
        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        # Check if creator meets criteria (for frontend to show eligibility status)
        meets_criteria = True
        if user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            from app.utils.brief_matching import matches_brief_criteria
            meets_criteria = matches_brief_criteria(creator, brief)

        # Return brief data with eligibility flag
        brief_data = brief.to_dict(include_relations=True)
        brief_data['meets_criteria'] = meets_criteria

        return jsonify(brief_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>', methods=['PATCH'])
@jwt_required()
def update_brief(brief_id):
    """Update brief (Brand only, draft status only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can update briefs'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if brief.status != 'draft':
            return jsonify({'error': 'Can only update draft briefs'}), 400

        data = request.get_json()

        # Update basic fields
        if 'title' in data:
            brief.title = data['title']
        if 'description' in data:
            brief.description = data['description']
        if 'goal' in data:
            brief.goal = data['goal']
        if 'platform' in data:
            brief.platform = data['platform']
        if 'budget_min' in data:
            brief.budget_min = float(data['budget_min'])
        if 'budget_max' in data:
            brief.budget_max = float(data['budget_max'])
        if 'timeline_days' in data:
            brief.timeline_days = int(data['timeline_days'])
        if 'target_categories' in data:
            brief.target_categories = data['target_categories']
        if 'target_min_followers' in data:
            brief.target_min_followers = data['target_min_followers']
        if 'target_max_followers' in data:
            brief.target_max_followers = data['target_max_followers']
        if 'target_locations' in data:
            brief.target_locations = data['target_locations']

        # Update milestones if provided
        if 'milestones' in data:
            # Delete existing milestones
            BriefMilestone.query.filter_by(brief_id=brief.id).delete()

            # Create new milestones
            milestones_data = data['milestones']
            total_duration = sum(m.get('duration_days', 0) for m in milestones_data)
            brief.total_duration_days = total_duration

            for idx, milestone_data in enumerate(milestones_data, start=1):
                milestone = BriefMilestone(
                    brief_id=brief.id,
                    milestone_number=idx,
                    title=milestone_data['title'],
                    description=milestone_data.get('description'),
                    expected_deliverables=milestone_data['expected_deliverables'],
                    duration_days=int(milestone_data['duration_days']),
                    price=float(milestone_data['price']) if milestone_data.get('price') else None
                )
                db.session.add(milestone)

        brief.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Brief updated successfully',
            'brief': brief.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>', methods=['DELETE'])
@jwt_required()
def delete_brief(brief_id):
    """Delete brief (Brand only, draft status only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can delete briefs'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if brief.status != 'draft':
            return jsonify({'error': 'Can only delete draft briefs'}), 400

        db.session.delete(brief)
        db.session.commit()

        return jsonify({'message': 'Brief deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>/publish', methods=['POST'])
@jwt_required()
def publish_brief(brief_id):
    """Publish brief (draft -> open)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can publish briefs'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if brief.status != 'draft':
            return jsonify({'error': 'Brief is not in draft status'}), 400

        brief.status = 'open'
        brief.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Brief published successfully',
            'brief': brief.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>/close', methods=['POST'])
@jwt_required()
def close_brief(brief_id):
    """Close brief manually"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can close briefs'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        brief.status = 'closed'
        brief.closed_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Brief closed successfully',
            'brief': brief.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:brief_id>/proposals', methods=['GET'])
@jwt_required()
def get_brief_proposals(brief_id):
    """Get all proposals for a brief (Brand only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if user.user_type != 'brand':
            return jsonify({'error': 'Only brands can view proposals'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        brief = Brief.query.get(brief_id)

        if not brief:
            return jsonify({'error': 'Brief not found'}), 404

        if brief.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        proposals = Proposal.query.filter_by(brief_id=brief_id).order_by(Proposal.created_at.desc()).all()

        return jsonify({
            'proposals': [p.to_dict(include_relations=True) for p in proposals]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
