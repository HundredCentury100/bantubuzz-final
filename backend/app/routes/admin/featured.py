"""
Admin Featured Creators Management - Set and manage featured creators on homepage
"""
from flask import jsonify, request
from datetime import datetime
from app import db
from app.models import CreatorProfile, User, Notification
from app.decorators.admin import admin_required
from . import bp


@bp.route('/creators/featured', methods=['GET'])
@admin_required
def get_featured_creators():
    """Get list of all featured creators"""
    try:
        featured_type = request.args.get('featured_type')  # 'general', 'tiktok', 'instagram', or None for all

        # Check if featured field exists (may not be migrated yet)
        try:
            query = CreatorProfile.query.filter_by(is_featured=True)

            # Filter by featured type if specified
            if featured_type:
                query = query.filter_by(featured_type=featured_type)

            featured = query.order_by(
                CreatorProfile.featured_order,
                CreatorProfile.featured_since.desc()
            ).all()
        except Exception:
            # Featured fields don't exist yet
            return jsonify({
                'success': False,
                'error': 'Featured creators feature not enabled',
                'message': 'Please run database migration to add featured creator fields'
            }), 501

        featured_data = []
        for creator in featured:
            data = creator.to_dict()
            data['user'] = creator.user.to_dict()
            data['featured_info'] = {
                'is_featured': creator.is_featured,
                'featured_type': creator.featured_type,
                'featured_order': creator.featured_order,
                'featured_since': creator.featured_since.isoformat() if creator.featured_since else None
            }
            featured_data.append(data)

        return jsonify({
            'success': True,
            'data': {
                'featured_creators': featured_data,
                'total': len(featured_data)
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch featured creators',
            'message': str(e)
        }), 500


@bp.route('/creators/eligible-for-featured', methods=['GET'])
@admin_required
def get_eligible_creators():
    """
    Get list of creators eligible to be featured
    Eligible = verified and active, optionally filtered by platform
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        platform = request.args.get('platform')  # 'tiktok', 'instagram', or None for all

        # Base query - verified and active creators
        query = CreatorProfile.query.join(User).filter(
            User.is_verified == True,
            User.is_active == True
        )

        # Platform filter - check if creator has the platform in their social_links
        if platform:
            if platform.lower() == 'tiktok':
                query = query.filter(
                    db.cast(CreatorProfile.social_links, db.String).ilike('%tiktok%')
                )
            elif platform.lower() == 'instagram':
                query = query.filter(
                    db.cast(CreatorProfile.social_links, db.String).ilike('%instagram%')
                )

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    CreatorProfile.username.ilike(f'%{search}%'),
                    User.email.ilike(f'%{search}%')
                )
            )

        # Check if featured field exists
        try:
            # Order: non-featured first, then by follower count
            query = query.order_by(
                CreatorProfile.is_featured.asc(),
                CreatorProfile.follower_count.desc()
            )
        except Exception:
            # Featured field doesn't exist, just order by followers
            query = query.order_by(CreatorProfile.follower_count.desc())

        paginated = query.paginate(page=page, per_page=per_page, error_out=False)

        creators_data = []
        for creator in paginated.items:
            data = creator.to_dict()
            data['user'] = creator.user.to_dict()
            try:
                data['is_featured'] = creator.is_featured
                data['featured_type'] = creator.featured_type
            except:
                data['is_featured'] = False
                data['featured_type'] = None
            creators_data.append(data)

        return jsonify({
            'success': True,
            'data': {
                'creators': creators_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': paginated.total,
                    'pages': paginated.pages
                }
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch eligible creators',
            'message': str(e)
        }), 500


@bp.route('/creators/<int:creator_id>/feature', methods=['POST'])
@admin_required
def feature_creator(creator_id):
    """Set a creator as featured"""
    try:
        data = request.get_json() or {}
        featured_order = data.get('featured_order', 0)
        featured_type = data.get('featured_type', 'general')  # 'general', 'tiktok', 'instagram'

        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        # Check if creator is verified
        if not creator.user.is_verified:
            return jsonify({
                'error': 'Cannot feature unverified creator',
                'message': 'Creator must be verified before being featured'
            }), 400

        # Validate featured_type
        if featured_type not in ['general', 'tiktok', 'instagram']:
            return jsonify({
                'error': 'Invalid featured type',
                'message': 'featured_type must be one of: general, tiktok, instagram'
            }), 400

        # For platform-specific featuring, verify creator has that platform
        if featured_type != 'general':
            social_links = creator.social_links or {}
            if featured_type not in social_links:
                return jsonify({
                    'error': f'Creator does not have {featured_type.title()} account',
                    'message': f'Cannot feature creator for {featured_type.title()} without a connected account'
                }), 400

        # Check if featured fields exist
        try:
            creator.is_featured = True
            creator.featured_type = featured_type
            creator.featured_order = featured_order
            creator.featured_since = datetime.utcnow()
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Featured creators feature not enabled',
                'message': 'Please run database migration to add featured creator fields',
                'details': str(e)
            }), 501

        # Send notification to creator
        featured_text = f'{featured_type.title()} Featured' if featured_type != 'general' else 'Featured'
        notification = Notification(
            user_id=creator.user_id,
            title=f'You are now {featured_text}!',
            message=f'Congratulations! Your profile has been featured on the BantuBuzz homepage ({featured_text}). This will give you increased visibility to brands.',
            type='success'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Creator {creator.username or creator.user.email} is now {featured_text.lower()}',
            'data': {
                'creator_id': creator_id,
                'is_featured': creator.is_featured,
                'featured_type': creator.featured_type,
                'featured_order': creator.featured_order,
                'featured_since': creator.featured_since.isoformat()
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to feature creator',
            'message': str(e)
        }), 500


@bp.route('/creators/<int:creator_id>/unfeature', methods=['DELETE'])
@admin_required
def unfeature_creator(creator_id):
    """Remove featured status from a creator"""
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        try:
            if not creator.is_featured:
                return jsonify({'error': 'Creator is not featured'}), 400

            creator.is_featured = False
            creator.featured_type = None
            creator.featured_order = 0
            # Keep featured_since for historical record
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return jsonify({
                'success': False,
                'error': 'Featured creators feature not enabled',
                'message': str(e)
            }), 501

        # Send notification to creator
        notification = Notification(
            user_id=creator.user_id,
            title='Featured Status Removed',
            message='Your profile is no longer featured on the homepage. Keep creating great content!',
            type='info'
        )
        db.session.add(notification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Featured status removed from {creator.username or creator.user.email}',
            'data': {
                'creator_id': creator_id,
                'is_featured': False,
                'featured_type': None
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to unfeature creator',
            'message': str(e)
        }), 500


@bp.route('/creators/featured/reorder', methods=['PUT'])
@admin_required
def reorder_featured_creators():
    """
    Update the display order of featured creators
    Body: { creator_orders: [{creator_id: 1, order: 0}, {creator_id: 2, order: 1}] }
    """
    try:
        data = request.get_json()
        creator_orders = data.get('creator_orders', [])

        if not creator_orders:
            return jsonify({'error': 'No creator orders provided'}), 400

        # Update each creator's order
        for item in creator_orders:
            creator_id = item.get('creator_id')
            order = item.get('order', 0)

            creator = CreatorProfile.query.get(creator_id)
            if creator and creator.is_featured:
                creator.featured_order = order

        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Reordered {len(creator_orders)} featured creators',
            'data': creator_orders
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to reorder featured creators',
            'message': str(e)
        }), 500
