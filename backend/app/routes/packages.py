from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Package, CreatorProfile, Subscription, SubscriptionPlan, User

bp = Blueprint('packages', __name__)


@bp.route('/', methods=['GET'])
@jwt_required(optional=True)
def get_packages():
    """Get all packages with filters, or creator's own packages if authenticated"""
    try:
        # Check if this is a request for creator's own packages
        user_id = get_jwt_identity()
        my_packages = request.args.get('my_packages', 'false').lower() == 'true'

        if user_id and my_packages:
            # Get creator's own packages
            user_id = int(user_id)
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if not creator:
                return jsonify({'error': 'Creator profile not found'}), 404

            packages = Package.query.filter_by(creator_id=creator.id).order_by(Package.created_at.desc()).all()
            return jsonify({
                'packages': [pkg.to_dict(include_creator=False) for pkg in packages],
                'total': len(packages)
            }), 200

        # Public package browsing
        category = request.args.get('category')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        price_range = request.args.get('price_range')
        creator_id = request.args.get('creator_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        package_type = request.args.get('package_type')
        delivery_time = request.args.get('delivery_time')
        follower_range = request.args.get('follower_range')
        sort_by = request.args.get('sort_by', 'relevance')
        search = request.args.get('search', '')
        platform = request.args.get('platform')

        query = Package.query.filter_by(is_active=True)

        # Join with CreatorProfile for follower filtering or platform filtering
        if follower_range or platform:
            query = query.join(CreatorProfile, Package.creator_id == CreatorProfile.id)

        if category:
            query = query.filter_by(category=category)

        # Handle individual min/max price filters
        if min_price:
            query = query.filter(Package.price >= min_price)
        if max_price:
            query = query.filter(Package.price <= max_price)

        # Handle price_range filter (format: "$0-$50", "$1000+")
        if price_range:
            price_range = price_range.replace('$', '').strip()
            if '+' in price_range:
                # Format: "1000+"
                min_price_val = float(price_range.replace('+', ''))
                query = query.filter(Package.price >= min_price_val)
            elif '-' in price_range:
                # Format: "0-50"
                parts = price_range.split('-')
                if len(parts) == 2:
                    min_price_val = float(parts[0])
                    max_price_val = float(parts[1])
                    query = query.filter(Package.price >= min_price_val, Package.price <= max_price_val)

        if creator_id:
            query = query.filter_by(creator_id=creator_id)
        if package_type:
            query = query.filter(Package.title.ilike(f'%{package_type}%'))

        # Delivery time filter
        if delivery_time:
            if delivery_time == '1-3':
                query = query.filter(Package.duration_days >= 1, Package.duration_days <= 3)
            elif delivery_time == '3-7':
                query = query.filter(Package.duration_days >= 3, Package.duration_days <= 7)
            elif delivery_time == '7-14':
                query = query.filter(Package.duration_days >= 7, Package.duration_days <= 14)
            elif delivery_time == '14-30':
                query = query.filter(Package.duration_days >= 14, Package.duration_days <= 30)
            elif delivery_time == '30+':
                query = query.filter(Package.duration_days >= 30)

        # Follower range filter (format: "0-1000", "500000+")
        if follower_range:
            if '+' in follower_range:
                # Format: "500000+"
                min_followers = int(follower_range.replace('+', ''))
                query = query.filter(CreatorProfile.follower_count >= min_followers)
            elif '-' in follower_range:
                # Format: "0-1000"
                parts = follower_range.split('-')
                if len(parts) == 2:
                    min_followers = int(parts[0])
                    max_followers = int(parts[1])
                    query = query.filter(
                        CreatorProfile.follower_count >= min_followers,
                        CreatorProfile.follower_count <= max_followers
                    )

        # Platform filter (platforms is a JSON array field)
        if platform:
            # Check if platform exists in the platforms JSON array
            from sqlalchemy import cast, String
            query = query.filter(cast(CreatorProfile.platforms, String).like(f'%"{platform}"%'))

        # Search filter
        if search:
            query = query.filter(
                db.or_(
                    Package.title.ilike(f'%{search}%'),
                    Package.description.ilike(f'%{search}%')
                )
            )

        # Sorting
        if sort_by == 'price_low':
            query = query.order_by(Package.price.asc())
        elif sort_by == 'price_high':
            query = query.order_by(Package.price.desc())
        elif sort_by == 'newest':
            query = query.order_by(Package.created_at.desc())
        elif sort_by == 'popular':
            # Order by number of collaborations (we'll need to add this later)
            query = query.order_by(Package.created_at.desc())  # For now, same as newest
        else:  # relevance (default)
            query = query.order_by(Package.created_at.desc())

        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        packages = [pkg.to_dict(include_creator=True) for pkg in pagination.items]

        return jsonify({
            'packages': packages,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:package_id>', methods=['GET'])
def get_package(package_id):
    """Get a specific package"""
    try:
        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        return jsonify(package.to_dict(include_creator=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_package():
    """Create a new package (creators only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Check subscription limits
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if subscription and subscription.plan:
            # Get current package count for this creator
            current_packages = Package.query.filter_by(creator_id=creator.id).count()
            max_packages = subscription.plan.max_packages

            # Check if user has reached their package limit (-1 means unlimited)
            if max_packages != -1 and current_packages >= max_packages:
                return jsonify({
                    'error': f'Package limit reached. Your {subscription.plan.name} plan allows {max_packages} packages.',
                    'limit_reached': True,
                    'current_count': current_packages,
                    'max_allowed': max_packages,
                    'upgrade_required': True
                }), 403

        data = request.get_json()
        required_fields = ['title', 'description', 'price', 'duration_days', 'category']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        package = Package(
            creator_id=creator.id,
            title=data['title'],
            description=data['description'],
            price=data['price'],
            duration_days=data['duration_days'],
            category=data['category'],
            deliverables=data.get('deliverables', [])
        )

        db.session.add(package)
        db.session.commit()

        return jsonify({
            'message': 'Package created successfully',
            'package': package.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:package_id>', methods=['PUT'])
@jwt_required()
def update_package(package_id):
    """Update a package (owner only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        if package.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        updatable_fields = ['title', 'description', 'price', 'duration_days',
                          'deliverables', 'category', 'is_active']

        for field in updatable_fields:
            if field in data:
                setattr(package, field, data[field])

        db.session.commit()

        return jsonify({
            'message': 'Package updated successfully',
            'package': package.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:package_id>', methods=['DELETE'])
@jwt_required()
def delete_package(package_id):
    """Delete a package (owner only)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        if package.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        db.session.delete(package)
        db.session.commit()

        return jsonify({'message': 'Package deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
