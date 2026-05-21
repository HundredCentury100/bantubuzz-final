from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import PortfolioItem, CreatorProfile, User

bp = Blueprint('portfolio', __name__)


@bp.route('/creator/portfolio', methods=['GET'])
@jwt_required()
def get_my_portfolio():
    """Get current creator's portfolio items"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        portfolio_items = PortfolioItem.query.filter_by(
            creator_profile_id=creator.id
        ).order_by(PortfolioItem.display_order.asc(), PortfolioItem.created_at.desc()).all()

        return jsonify({
            'success': True,
            'portfolio_items': [item.to_dict() for item in portfolio_items]
        }), 200

    except Exception as e:
        print(f"Error fetching portfolio: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/creator/portfolio', methods=['POST'])
@jwt_required()
def create_portfolio_item():
    """Create a new portfolio item"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()

        # Validate required fields
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400

        # Parse project_date safely
        project_date = None
        if data.get('project_date') and data['project_date'].strip():
            try:
                project_date = datetime.fromisoformat(data['project_date'])
            except (ValueError, AttributeError):
                project_date = None

        # Create portfolio item
        portfolio_item = PortfolioItem(
            creator_profile_id=creator.id,
            title=data['title'],
            description=data.get('description'),
            brand_name=data.get('brand_name'),
            platform=data.get('platform'),
            collaboration_type=data.get('collaboration_type'),
            campaign_objective=data.get('campaign_objective'),
            image_url=data.get('image_url'),
            media_urls=data.get('media_urls', []),
            post_url=data.get('post_url'),
            views=data.get('views'),
            likes=data.get('likes'),
            comments=data.get('comments'),
            shares=data.get('shares'),
            engagement_rate=data.get('engagement_rate'),
            reach=data.get('reach'),
            result_description=data.get('result_description'),
            client_testimonial=data.get('client_testimonial'),
            project_date=project_date,
            is_featured=data.get('is_featured', False),
            display_order=data.get('display_order', 0),
            is_visible=data.get('is_visible', True)
        )

        db.session.add(portfolio_item)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Portfolio item created successfully',
            'portfolio_item': portfolio_item.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating portfolio item: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/creator/portfolio/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_portfolio_item(item_id):
    """Update a portfolio item"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        portfolio_item = PortfolioItem.query.filter_by(
            id=item_id,
            creator_profile_id=creator.id
        ).first()

        if not portfolio_item:
            return jsonify({'error': 'Portfolio item not found'}), 404

        data = request.get_json()

        # Update fields
        if 'title' in data:
            portfolio_item.title = data['title']
        if 'description' in data:
            portfolio_item.description = data['description']
        if 'brand_name' in data:
            portfolio_item.brand_name = data['brand_name']
        if 'platform' in data:
            portfolio_item.platform = data['platform']
        if 'collaboration_type' in data:
            portfolio_item.collaboration_type = data['collaboration_type']
        if 'campaign_objective' in data:
            portfolio_item.campaign_objective = data['campaign_objective']
        if 'image_url' in data:
            portfolio_item.image_url = data['image_url']
        if 'media_urls' in data:
            portfolio_item.media_urls = data['media_urls']
        if 'post_url' in data:
            portfolio_item.post_url = data['post_url']
        if 'views' in data:
            portfolio_item.views = data['views']
        if 'likes' in data:
            portfolio_item.likes = data['likes']
        if 'comments' in data:
            portfolio_item.comments = data['comments']
        if 'shares' in data:
            portfolio_item.shares = data['shares']
        if 'engagement_rate' in data:
            portfolio_item.engagement_rate = data['engagement_rate']
        if 'reach' in data:
            portfolio_item.reach = data['reach']
        if 'result_description' in data:
            portfolio_item.result_description = data['result_description']
        if 'client_testimonial' in data:
            portfolio_item.client_testimonial = data['client_testimonial']
        if 'project_date' in data:
            if data['project_date'] and data['project_date'].strip():
                try:
                    portfolio_item.project_date = datetime.fromisoformat(data['project_date'])
                except (ValueError, AttributeError):
                    portfolio_item.project_date = None
            else:
                portfolio_item.project_date = None
        if 'is_featured' in data:
            portfolio_item.is_featured = data['is_featured']
        if 'display_order' in data:
            portfolio_item.display_order = data['display_order']
        if 'is_visible' in data:
            portfolio_item.is_visible = data['is_visible']

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Portfolio item updated successfully',
            'portfolio_item': portfolio_item.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating portfolio item: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/creator/portfolio/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_portfolio_item(item_id):
    """Delete a portfolio item"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        portfolio_item = PortfolioItem.query.filter_by(
            id=item_id,
            creator_profile_id=creator.id
        ).first()

        if not portfolio_item:
            return jsonify({'error': 'Portfolio item not found'}), 404

        db.session.delete(portfolio_item)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Portfolio item deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting portfolio item: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/creators/<int:creator_id>/portfolio', methods=['GET'])
def get_creator_portfolio(creator_id):
    """Get a creator's public portfolio items (visible only)"""
    try:
        creator = CreatorProfile.query.get(creator_id)

        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        portfolio_items = PortfolioItem.query.filter_by(
            creator_profile_id=creator.id,
            is_visible=True
        ).order_by(
            PortfolioItem.is_featured.desc(),
            PortfolioItem.display_order.asc(),
            PortfolioItem.created_at.desc()
        ).all()

        return jsonify({
            'success': True,
            'portfolio_items': [item.to_dict() for item in portfolio_items]
        }), 200

    except Exception as e:
        print(f"Error fetching creator portfolio: {e}")
        return jsonify({'error': str(e)}), 500
