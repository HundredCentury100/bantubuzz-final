from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import CreatorProfile, User, Review, Package
from app.utils import save_profile_picture, delete_profile_picture
from sqlalchemy import or_, and_, func

bp = Blueprint('creators', __name__)


@bp.route('/', methods=['GET'])
def get_creators():
    """Get all creators with filters"""
    try:
        # Get query parameters
        category = request.args.get('category')
        location = request.args.get('location')
        min_followers = request.args.get('min_followers', type=int)
        max_price = request.args.get('max_price', type=float)
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)

        # Build query
        query = CreatorProfile.query.join(User).filter(User.is_active == True)

        # Apply filters
        if category:
            query = query.filter(CreatorProfile.categories.contains([category]))

        if location:
            query = query.filter(CreatorProfile.location.ilike(f'%{location}%'))

        if min_followers:
            query = query.filter(CreatorProfile.follower_count >= min_followers)

        if search:
            query = query.filter(
                or_(
                    CreatorProfile.bio.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )

        # Get all creators matching the filters (we'll sort them by reviews)
        all_creators = query.all()

        # Add review stats and cheapest package price
        creators_with_stats = []
        for creator in all_creators:
            creator_dict = creator.to_dict(include_user=True)

            # Get review stats
            reviews = Review.query.filter_by(creator_id=creator.id).all()
            if reviews:
                avg_rating = sum(r.rating for r in reviews) / len(reviews)
                creator_dict['review_stats'] = {
                    'average_rating': round(avg_rating, 1),
                    'total_reviews': len(reviews)
                }
            else:
                creator_dict['review_stats'] = {
                    'average_rating': 0,
                    'total_reviews': 0
                }

            # Get cheapest package price
            packages = Package.query.filter_by(creator_id=creator.id, is_active=True).all()
            if packages:
                prices = [p.price for p in packages]
                creator_dict['cheapest_package_price'] = min(prices)
            else:
                creator_dict['cheapest_package_price'] = None

            creators_with_stats.append(creator_dict)

        # Sort by total reviews (descending), then by average rating (descending)
        creators_with_stats.sort(
            key=lambda x: (x['review_stats']['total_reviews'], x['review_stats']['average_rating']),
            reverse=True
        )

        # Apply pagination manually after sorting
        total = len(creators_with_stats)
        start = (page - 1) * per_page
        end = start + per_page
        creators = creators_with_stats[start:end]

        # Calculate total pages
        import math
        total_pages = math.ceil(total / per_page) if total > 0 else 1

        return jsonify({
            'creators': creators,
            'total': total,
            'pages': total_pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:creator_id>', methods=['GET'])
def get_creator(creator_id):
    """Get a specific creator"""
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        return jsonify(creator.to_dict(include_user=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_own_profile():
    """Get current user's creator profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator profile not found'}), 404

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        return jsonify(creator.to_dict(include_user=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update creator profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()

        # Update fields if provided
        if 'bio' in data:
            creator.bio = data['bio']

        if 'profile_picture' in data:
            creator.profile_picture = data['profile_picture']

        if 'portfolio_url' in data:
            creator.portfolio_url = data['portfolio_url']

        if 'categories' in data:
            creator.categories = data['categories']

        if 'follower_count' in data:
            creator.follower_count = data['follower_count']

        if 'engagement_rate' in data:
            creator.engagement_rate = data['engagement_rate']

        if 'location' in data:
            creator.location = data['location']

        if 'languages' in data:
            creator.languages = data['languages']

        if 'availability_status' in data:
            if data['availability_status'] in ['available', 'busy', 'unavailable']:
                creator.availability_status = data['availability_status']

        if 'social_links' in data:
            creator.social_links = data['social_links']

        if 'success_stories' in data:
            creator.success_stories = data['success_stories']

        creator.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'creator': creator.to_dict(include_user=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload creator profile picture"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Delete old profile picture if exists
        if creator.profile_picture:
            delete_profile_picture(creator.profile_picture)

        # Save new profile picture
        try:
            file_path = save_profile_picture(file, folder='profiles/creators')
            creator.profile_picture = file_path
            creator.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'message': 'Profile picture uploaded successfully',
                'profile_picture': file_path
            }), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
