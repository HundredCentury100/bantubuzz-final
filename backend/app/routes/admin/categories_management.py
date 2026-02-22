"""
Admin Category Management routes
Handles create, update, delete operations for categories
"""
from flask import jsonify, request
from werkzeug.utils import secure_filename
import os
from app import db
from app.models import Category
from app.decorators.admin import admin_required
from . import bp

UPLOAD_FOLDER = 'uploads/categories'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@bp.route('/categories', methods=['GET'])
@admin_required
def get_all_categories():
    """
    Get all categories (including inactive ones for admin)
    """
    try:
        categories = Category.query.order_by(Category.name).all()
        return jsonify({
            'success': True,
            'categories': [cat.to_dict() for cat in categories]
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/categories', methods=['POST'])
@admin_required
def create_category():
    """
    Create a new category
    Expects FormData with:
    - name: string (required)
    - slug: string (optional, will be auto-generated from name if not provided)
    - description: string
    - is_active: boolean
    - image: file (optional)
    - display_order: integer
    """
    try:
        # Get form data
        name = request.form.get('name')
        slug = request.form.get('slug')
        description = request.form.get('description', '')
        is_active = request.form.get('is_active', 'true').lower() == 'true'
        display_order = int(request.form.get('display_order', 0))

        if not name:
            return jsonify({'error': 'Name is required'}), 400

        # Auto-generate slug if not provided
        if not slug:
            slug = name.lower().replace(' & ', '-').replace(' ', '-').replace('&', 'and')

        # Check if slug already exists
        existing = Category.query.filter_by(slug=slug).first()
        if existing:
            return jsonify({'error': 'A category with this slug already exists'}), 400

        # Handle image upload
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Create unique filename
                import uuid
                unique_filename = f"{uuid.uuid4().hex}_{filename}"

                # Ensure upload directory exists
                upload_dir = os.path.join('uploads', 'categories')
                os.makedirs(upload_dir, exist_ok=True)

                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                image_path = f"/{file_path}"

        # Create category
        category = Category(
            name=name,
            slug=slug,
            description=description,
            image=image_path,
            display_order=display_order,
            is_active=is_active
        )

        db.session.add(category)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Category created successfully',
            'category': category.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating category: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to create category',
            'message': str(e)
        }), 500


@bp.route('/categories/<int:category_id>', methods=['PUT'])
@admin_required
def update_category(category_id):
    """
    Update an existing category
    Expects FormData with same fields as create
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Get form data
        name = request.form.get('name')
        slug = request.form.get('slug')
        description = request.form.get('description')
        is_active = request.form.get('is_active')
        display_order = request.form.get('display_order')

        # Update fields if provided
        if name:
            category.name = name
        if slug:
            # Check if new slug conflicts with another category
            existing = Category.query.filter(
                Category.slug == slug,
                Category.id != category_id
            ).first()
            if existing:
                return jsonify({'error': 'A category with this slug already exists'}), 400
            category.slug = slug
        if description is not None:
            category.description = description
        if is_active is not None:
            category.is_active = is_active.lower() == 'true'
        if display_order is not None:
            category.display_order = int(display_order)

        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file and file.filename and allowed_file(file.filename):
                # Delete old image if exists
                if category.image:
                    old_image_path = category.image.lstrip('/')
                    if os.path.exists(old_image_path):
                        try:
                            os.remove(old_image_path)
                        except:
                            pass

                filename = secure_filename(file.filename)
                # Create unique filename
                import uuid
                unique_filename = f"{uuid.uuid4().hex}_{filename}"

                # Ensure upload directory exists
                upload_dir = os.path.join('uploads', 'categories')
                os.makedirs(upload_dir, exist_ok=True)

                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                category.image = f"/{file_path}"

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Category updated successfully',
            'category': category.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating category: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': 'Failed to update category',
            'message': str(e)
        }), 500


@bp.route('/categories/<int:category_id>', methods=['DELETE'])
@admin_required
def delete_category(category_id):
    """
    Delete a category
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Delete category
        db.session.delete(category)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Category deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete category',
            'message': str(e)
        }), 500
