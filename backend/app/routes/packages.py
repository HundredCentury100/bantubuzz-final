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
        creator_id = request.args.get('creator_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)

        query = Package.query.filter_by(is_active=True)

        if category:
            query = query.filter_by(category=category)
        if min_price:
            query = query.filter(Package.price >= min_price)
        if max_price:
            query = query.filter(Package.price <= max_price)
        if creator_id:
            query = query.filter_by(creator_id=creator_id)

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
