from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Review, BrandProfile, CreatorProfile, Collaboration, User
from app.utils.brand_identity import public_brand_for_collaboration
from app.utils.notifications import notify_new_review, notify_review_response

bp = Blueprint('reviews', __name__)


def _average(values):
    valid_values = [value for value in values if value is not None]
    if not valid_values:
        return None
    return sum(valid_values) / len(valid_values)


def _parse_required_rating(value, field_name):
    if value is None:
        raise ValueError(f'{field_name} is required')

    try:
        rating = int(value)
    except (TypeError, ValueError):
        raise ValueError(f'{field_name} must be a number between 1 and 5')

    if not 1 <= rating <= 5:
        raise ValueError(f'{field_name} must be between 1 and 5')

    return rating


@bp.route('/', methods=['POST'])
@jwt_required()
def create_review():
    """Create a review for a creator (brand only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        required_fields = ['collaboration_id', 'comment']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        collaboration = Collaboration.query.get(data['collaboration_id'])
        if not collaboration:
            return jsonify({'error': 'Collaboration not found'}), 404

        # Verify brand owns this collaboration
        if collaboration.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Verify collaboration is completed
        if collaboration.status != 'completed':
            return jsonify({'error': 'Can only review completed collaborations'}), 400

        # Check if review already exists
        existing_review = Review.query.filter_by(collaboration_id=collaboration.id).first()
        if existing_review:
            return jsonify({'error': 'Review already exists for this collaboration'}), 400

        try:
            communication_rating = _parse_required_rating(
                data.get('communication_rating'),
                'Communication rating'
            )
            quality_rating = _parse_required_rating(
                data.get('quality_rating'),
                'Quality rating'
            )
            professionalism_rating = _parse_required_rating(
                data.get('professionalism_rating'),
                'Professionalism rating'
            )
            timeliness_rating = _parse_required_rating(
                data.get('timeliness_rating'),
                'Timeliness rating'
            )
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 400

        sub_ratings = [
            communication_rating,
            quality_rating,
            professionalism_rating,
            timeliness_rating
        ]
        average_rating = sum(sub_ratings) / len(sub_ratings)
        rating = int(average_rating + 0.5)

        # Create review
        review = Review(
            brand_id=brand.id,
            creator_id=collaboration.creator_id,
            collaboration_id=collaboration.id,
            rating=rating,
            title=data.get('title', ''),
            comment=data['comment'],
            communication_rating=communication_rating,
            quality_rating=quality_rating,
            professionalism_rating=professionalism_rating,
            timeliness_rating=timeliness_rating,
            would_recommend=data.get('would_recommend', True)
        )

        db.session.add(review)
        db.session.commit()

        try:
            from app.services.creator_score_service import queue_creator_score_recalculation
            queue_creator_score_recalculation(collaboration.creator_id)
        except Exception:
            pass

        # Notify creator of new review
        creator_user = User.query.get(collaboration.creator.user_id)
        if creator_user:
            display_brand = public_brand_for_collaboration(collaboration)
            notify_new_review(
                creator_id=creator_user.id,
                brand_name=display_brand.get('company_name') or display_brand.get('display_name') or 'A brand',
                review_id=review.id
            )

        return jsonify({
            'message': 'Review created successfully',
            'review': review.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/creator/<int:creator_id>', methods=['GET'])
def get_creator_reviews(creator_id):
    """Get all reviews for a creator (public)"""
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        pagination = Review.query.filter_by(creator_id=creator_id).order_by(
            Review.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        reviews = [review.to_dict(include_relations=True) for review in pagination.items]

        # Calculate average ratings
        all_reviews = Review.query.filter_by(creator_id=creator_id).all()
        if all_reviews:
            avg_rating = sum(r.get_calculated_rating() for r in all_reviews) / len(all_reviews)
            avg_communication = _average(r.communication_rating for r in all_reviews)
            avg_quality = _average(r.quality_rating for r in all_reviews)
            avg_professionalism = _average(r.professionalism_rating for r in all_reviews)
            avg_timeliness = _average(r.timeliness_rating for r in all_reviews)
        else:
            avg_rating = None
            avg_communication = None
            avg_quality = None
            avg_professionalism = None
            avg_timeliness = None

        return jsonify({
            'reviews': reviews,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page,
            'average_ratings': {
                'overall': round(avg_rating, 2) if avg_rating is not None else None,
                'communication': round(avg_communication, 2) if avg_communication is not None else None,
                'quality': round(avg_quality, 2) if avg_quality is not None else None,
                'professionalism': round(avg_professionalism, 2) if avg_professionalism is not None else None,
                'timeliness': round(avg_timeliness, 2) if avg_timeliness is not None else None,
                'total_reviews': len(all_reviews)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:review_id>', methods=['GET'])
def get_review(review_id):
    """Get a specific review"""
    try:
        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404

        return jsonify(review.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:review_id>/response', methods=['PATCH'])
@jwt_required()
def add_creator_response(review_id):
    """Add creator response to a review (creator only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        review = Review.query.get(review_id)
        if not review:
            return jsonify({'error': 'Review not found'}), 404

        if review.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        if 'response' not in data:
            return jsonify({'error': 'Response is required'}), 400

        review.creator_response = data['response']
        review.creator_response_date = datetime.utcnow()
        review.updated_at = datetime.utcnow()

        db.session.commit()

        # Notify brand that creator responded
        brand_user = User.query.get(review.brand.user_id)
        if brand_user:
            notify_review_response(
                user_id=brand_user.id,
                creator_name=creator.user.email,
                review_id=review.id
            )

        return jsonify({
            'message': 'Response added successfully',
            'review': review.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/brand', methods=['GET'])
@jwt_required()
def get_brand_reviews():
    """Get all reviews created by the current brand"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        pagination = Review.query.filter_by(brand_id=brand.id).order_by(
            Review.created_at.desc()
        ).paginate(page=page, per_page=per_page, error_out=False)

        reviews = [review.to_dict(include_relations=True) for review in pagination.items]

        return jsonify({
            'reviews': reviews,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
