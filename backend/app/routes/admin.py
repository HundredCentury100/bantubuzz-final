from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from functools import wraps
from werkzeug.utils import secure_filename
import os
from datetime import datetime, timedelta
from sqlalchemy import func, or_, desc
from app import db
from app.models import (
    User, CreatorProfile, BrandProfile, Category, Niche,
    Campaign, Booking, Collaboration, Review, Package,
    Notification, Message, Payment, Wallet, CashoutRequest
)

bp = Blueprint('admin', __name__, url_prefix='/admin')

# Base upload directory
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
CATEGORY_UPLOAD_FOLDER = os.path.join(UPLOAD_FOLDER, 'categories')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'svg'}


def admin_required(fn):
    """Decorator to ensure only admins can access a route"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper


def super_admin_required(fn):
    """Decorator for super admin only routes"""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or not user.is_admin or user.admin_role != 'super_admin':
            return jsonify({'error': 'Super admin access required'}), 403

        return fn(*args, **kwargs)
    return wrapper


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================================================
# DASHBOARD STATISTICS
# ============================================================================

@bp.route('/dashboard/stats', methods=['GET'])
@admin_required
def get_dashboard_stats():
    """Get overview statistics for admin dashboard"""
    try:
        # User stats
        total_users = User.query.count()
        total_creators = User.query.filter_by(user_type='creator').count()
        total_brands = User.query.filter_by(user_type='brand').count()

        # New users this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        new_users_week = User.query.filter(User.created_at >= week_ago).count()

        # Collaboration stats
        total_collaborations = Collaboration.query.count()
        active_collaborations = Collaboration.query.filter_by(status='in_progress').count()
        completed_collaborations = Collaboration.query.filter_by(status='completed').count()

        # Booking stats
        total_bookings = Booking.query.count()
        pending_bookings = Booking.query.filter_by(status='pending').count()

        # Campaign stats
        total_campaigns = Campaign.query.count()
        active_campaigns = Campaign.query.filter_by(status='active').count()

        # Revenue stats (sum of completed bookings)
        total_revenue = db.session.query(func.sum(Booking.amount)).filter(
            Booking.payment_status == 'paid'
        ).scalar() or 0

        # Review stats
        total_reviews = Review.query.count()
        avg_rating = db.session.query(func.avg(Review.rating)).scalar() or 0

        # Pending verifications
        pending_verifications = User.query.filter_by(is_verified=False).count()

        # Financial stats
        pending_payments = Payment.query.filter_by(status='pending').count()
        pending_payments_amount = db.session.query(func.sum(Payment.amount)).filter_by(status='pending').scalar() or 0

        escrowed_amount = db.session.query(func.sum(Payment.amount)).filter_by(status='escrowed').scalar() or 0

        pending_cashouts = CashoutRequest.query.filter_by(status='pending').count()
        pending_cashouts_amount = db.session.query(func.sum(CashoutRequest.amount)).filter_by(status='pending').scalar() or 0

        # This month revenue
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_revenue = db.session.query(func.sum(Booking.amount)).filter(
            Booking.payment_status == 'paid',
            Booking.booking_date >= month_start
        ).scalar() or 0

        return jsonify({
            'users': {
                'total': total_users,
                'creators': total_creators,
                'brands': total_brands,
                'new_this_week': new_users_week,
                'pending_verifications': pending_verifications
            },
            'collaborations': {
                'total': total_collaborations,
                'active': active_collaborations,
                'completed': completed_collaborations
            },
            'bookings': {
                'total': total_bookings,
                'pending': pending_bookings
            },
            'campaigns': {
                'total': total_campaigns,
                'active': active_campaigns
            },
            'revenue': {
                'total': float(total_revenue),
                'this_month': float(this_month_revenue)
            },
            'reviews': {
                'total': total_reviews,
                'average_rating': round(float(avg_rating), 2)
            },
            'financial': {
                'total_revenue': float(total_revenue),
                'pending_payments_count': pending_payments,
                'pending_payments_amount': float(pending_payments_amount),
                'escrowed_amount': float(escrowed_amount),
                'pending_cashouts_count': pending_cashouts,
                'pending_cashouts_amount': float(pending_cashouts_amount)
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# USER MANAGEMENT
# ============================================================================

@bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """List all users with filters"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        user_type = request.args.get('type')  # 'creator', 'brand', 'admin'
        is_verified = request.args.get('is_verified')
        is_active = request.args.get('is_active')
        search = request.args.get('search')

        query = User.query

        # Apply filters
        if user_type:
            query = query.filter_by(user_type=user_type)
        if is_verified is not None:
            query = query.filter_by(is_verified=is_verified == 'true')
        if is_active is not None:
            query = query.filter_by(is_active=is_active == 'true')
        if search:
            query = query.filter(User.email.ilike(f'%{search}%'))

        # Order by created_at descending
        query = query.order_by(desc(User.created_at))

        # Paginate
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)

        users = []
        for user in pagination.items:
            user_data = user.to_dict()
            # Add profile info
            if user.user_type == 'creator' and user.creator_profile:
                user_data['profile'] = user.creator_profile.to_dict()
            elif user.user_type == 'brand' and user.brand_profile:
                user_data['profile'] = user.brand_profile.to_dict()
            users.append(user_data)

        return jsonify({
            'users': users,
            'pagination': {
                'page': pagination.page,
                'per_page': pagination.per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get detailed user information"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_data = user.to_dict()

        # Add profile
        if user.user_type == 'creator' and user.creator_profile:
            user_data['profile'] = user.creator_profile.to_dict(include_user=False)
            # Add creator stats
            user_data['stats'] = {
                'total_packages': user.creator_profile.packages.count(),
                'total_bookings': Booking.query.filter_by(creator_id=user.creator_profile.id).count(),
                'total_collaborations': Collaboration.query.filter_by(creator_id=user.creator_profile.id).count(),
                'total_reviews': Review.query.filter_by(creator_id=user.creator_profile.id).count(),
                'average_rating': db.session.query(func.avg(Review.rating)).filter_by(
                    creator_id=user.creator_profile.id
                ).scalar() or 0
            }
        elif user.user_type == 'brand' and user.brand_profile:
            user_data['profile'] = user.brand_profile.to_dict(include_user=False)
            # Add brand stats
            user_data['stats'] = {
                'total_campaigns': Campaign.query.filter_by(brand_id=user.brand_profile.id).count(),
                'total_bookings': Booking.query.filter_by(brand_id=user.brand_profile.id).count(),
                'total_collaborations': Collaboration.query.filter_by(brand_id=user.brand_profile.id).count(),
                'total_spent': db.session.query(func.sum(Booking.amount)).filter(
                    Booking.brand_id == user.brand_profile.id,
                    Booking.payment_status == 'paid'
                ).scalar() or 0
            }

        return jsonify(user_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@admin_required
def toggle_user_active(user_id):
    """Activate or deactivate a user account"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_active = not user.is_active
        db.session.commit()

        return jsonify({
            'message': f'User {"activated" if user.is_active else "deactivated"} successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/users/<int:user_id>/verify', methods=['PUT'])
@admin_required
def verify_user(user_id):
    """Manually verify a user"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user.is_verified = True
        db.session.commit()

        return jsonify({
            'message': 'User verified successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/users/<int:user_id>/status', methods=['PUT'])
@admin_required
def update_user_status(user_id):
    """Update user active status"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        is_active = data.get('is_active')

        if is_active is None:
            return jsonify({'error': 'is_active field is required'}), 400

        user.is_active = is_active
        db.session.commit()

        return jsonify({
            'message': f'User {"activated" if is_active else "deactivated"} successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/users/<int:user_id>', methods=['DELETE'])
@super_admin_required
def delete_user(user_id):
    """Delete a user account (super admin only)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Prevent deleting admin users
        if user.is_admin:
            return jsonify({'error': 'Cannot delete admin users'}), 403

        db.session.delete(user)
        db.session.commit()

        return jsonify({'message': 'User deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# CATEGORY MANAGEMENT
# ============================================================================

@bp.route('/categories', methods=['GET'])
@admin_required
def list_categories():
    """List all categories"""
    try:
        include_niches = request.args.get('include_niches', 'false') == 'true'

        categories = Category.query.order_by(Category.display_order, Category.name).all()

        return jsonify({
            'categories': [cat.to_dict(include_niches=include_niches) for cat in categories]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/categories', methods=['POST'])
@admin_required
def create_category():
    """Create a new category"""
    try:
        # Handle both JSON and form data (for image upload)
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            slug = request.form.get('slug')
            description = request.form.get('description')
            display_order = request.form.get('display_order', 0, type=int)
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            name = data.get('name')
            slug = data.get('slug')
            description = data.get('description')
            display_order = data.get('display_order', 0)
            image_file = None

        if not name or not slug:
            return jsonify({'error': 'Name and slug are required'}), 400

        # Check if category exists
        if Category.query.filter_by(slug=slug).first():
            return jsonify({'error': 'Category with this slug already exists'}), 409

        # Handle image upload
        image_path = None
        if image_file and allowed_file(image_file.filename):
            filename = secure_filename(f"{slug}_{int(datetime.utcnow().timestamp())}.{image_file.filename.rsplit('.', 1)[1].lower()}")
            os.makedirs(CATEGORY_UPLOAD_FOLDER, exist_ok=True)
            image_file.save(os.path.join(CATEGORY_UPLOAD_FOLDER, filename))
            image_path = f'/uploads/categories/{filename}'

        category = Category(
            name=name,
            slug=slug,
            description=description,
            image=image_path,
            display_order=display_order,
            is_active=True
        )

        db.session.add(category)
        db.session.commit()

        return jsonify({
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    """Update a category"""
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Handle both JSON and form data
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            slug = request.form.get('slug')
            description = request.form.get('description')
            display_order = request.form.get('display_order', type=int)
            is_active = request.form.get('is_active', 'true') == 'true'
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            name = data.get('name')
            slug = data.get('slug')
            description = data.get('description')
            display_order = data.get('display_order')
            is_active = data.get('is_active')
            image_file = None

        # Update fields
        if name:
            category.name = name
        if slug and slug != category.slug:
            # Check slug uniqueness
            if Category.query.filter(Category.slug == slug, Category.id != category_id).first():
                return jsonify({'error': 'Slug already in use'}), 409
            category.slug = slug
        if description is not None:
            category.description = description
        if display_order is not None:
            category.display_order = display_order
        if is_active is not None:
            category.is_active = is_active

        # Handle image upload
        if image_file and allowed_file(image_file.filename):
            # Delete old image if exists
            if category.image:
                old_image_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), category.image.lstrip('/'))
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)

            filename = secure_filename(f"{category.slug}_{int(datetime.utcnow().timestamp())}.{image_file.filename.rsplit('.', 1)[1].lower()}")
            os.makedirs(CATEGORY_UPLOAD_FOLDER, exist_ok=True)
            image_file.save(os.path.join(CATEGORY_UPLOAD_FOLDER, filename))
            category.image = f'/uploads/categories/{filename}'

        category.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Category updated successfully',
            'category': category.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    """Delete a category"""
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Delete image if exists
        if category.image:
            image_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), category.image.lstrip('/'))
            if os.path.exists(image_path):
                os.remove(image_path)

        db.session.delete(category)
        db.session.commit()

        return jsonify({'message': 'Category deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============================================================================
# NICHE MANAGEMENT
# ============================================================================

@bp.route('/niches', methods=['GET'])
@admin_required
def list_niches():
    """List all niches"""
    try:
        category_id = request.args.get('category_id', type=int)

        query = Niche.query
        if category_id:
            query = query.filter_by(category_id=category_id)

        niches = query.order_by(Niche.name).all()

        return jsonify({
            'niches': [niche.to_dict(include_category=True) for niche in niches]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/niches', methods=['POST'])
@admin_required
def create_niche():
    """Create a new niche"""
    try:
        # Handle both JSON and form data
        if request.content_type and 'multipart/form-data' in request.content_type:
            category_id = request.form.get('category_id', type=int)
            name = request.form.get('name')
            slug = request.form.get('slug')
            description = request.form.get('description')
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            category_id = data.get('category_id')
            name = data.get('name')
            slug = data.get('slug')
            description = data.get('description')
            image_file = None

        if not category_id or not name or not slug:
            return jsonify({'error': 'Category ID, name, and slug are required'}), 400

        # Check if category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Check if niche exists
        if Niche.query.filter_by(category_id=category_id, slug=slug).first():
            return jsonify({'error': 'Niche with this slug already exists in this category'}), 409

        # Handle image upload
        image_path = None
        if image_file and allowed_file(image_file.filename):
            filename = secure_filename(f"{slug}_{int(datetime.utcnow().timestamp())}.{image_file.filename.rsplit('.', 1)[1].lower()}")
            os.makedirs(CATEGORY_UPLOAD_FOLDER, exist_ok=True)
            image_file.save(os.path.join(CATEGORY_UPLOAD_FOLDER, filename))
            image_path = f'/uploads/categories/{filename}'

        niche = Niche(
            category_id=category_id,
            name=name,
            slug=slug,
            description=description,
            image=image_path,
            is_active=True
        )

        db.session.add(niche)
        db.session.commit()

        return jsonify({
            'message': 'Niche created successfully',
            'niche': niche.to_dict(include_category=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/niches/<int:niche_id>', methods=['PUT'])
@admin_required
def update_niche(niche_id):
    """Update a niche"""
    try:
        niche = Niche.query.get(niche_id)
        if not niche:
            return jsonify({'error': 'Niche not found'}), 404

        # Handle both JSON and form data
        if request.content_type and 'multipart/form-data' in request.content_type:
            name = request.form.get('name')
            slug = request.form.get('slug')
            description = request.form.get('description')
            is_active = request.form.get('is_active', 'true') == 'true'
            image_file = request.files.get('image')
        else:
            data = request.get_json()
            name = data.get('name')
            slug = data.get('slug')
            description = data.get('description')
            is_active = data.get('is_active')
            image_file = None

        # Update fields
        if name:
            niche.name = name
        if slug and slug != niche.slug:
            # Check slug uniqueness within category
            if Niche.query.filter(
                Niche.category_id == niche.category_id,
                Niche.slug == slug,
                Niche.id != niche_id
            ).first():
                return jsonify({'error': 'Slug already in use in this category'}), 409
            niche.slug = slug
        if description is not None:
            niche.description = description
        if is_active is not None:
            niche.is_active = is_active

        # Handle image upload
        if image_file and allowed_file(image_file.filename):
            # Delete old image if exists
            if niche.image:
                old_image_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), niche.image.lstrip('/'))
                if os.path.exists(old_image_path):
                    os.remove(old_image_path)

            filename = secure_filename(f"{niche.slug}_{int(datetime.utcnow().timestamp())}.{image_file.filename.rsplit('.', 1)[1].lower()}")
            os.makedirs(CATEGORY_UPLOAD_FOLDER, exist_ok=True)
            image_file.save(os.path.join(CATEGORY_UPLOAD_FOLDER, filename))
            niche.image = f'/uploads/categories/{filename}'

        niche.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Niche updated successfully',
            'niche': niche.to_dict(include_category=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/niches/<int:niche_id>', methods=['DELETE'])
@admin_required
def delete_niche(niche_id):
    """Delete a niche"""
    try:
        niche = Niche.query.get(niche_id)
        if not niche:
            return jsonify({'error': 'Niche not found'}), 404

        # Delete image if exists
        if niche.image:
            image_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), niche.image.lstrip('/'))
            if os.path.exists(image_path):
                os.remove(image_path)

        db.session.delete(niche)
        db.session.commit()

        return jsonify({'message': 'Niche deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
