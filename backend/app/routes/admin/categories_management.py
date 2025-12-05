"""
Admin Category and Niche Management routes
Handles create, update, delete operations for categories and niches
"""
from flask import jsonify, request
from werkzeug.utils import secure_filename
import os
from app import db
from app.models import Category, Niche
from app.decorators.admin import admin_required
from . import bp


def allowed_file(filename):
    """Check if file extension is allowed"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_category_image(file):
    """Save uploaded category image"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid naming conflicts
        from datetime import datetime
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"category_{timestamp}_{filename}"

        # Save to uploads/categories directory
        upload_dir = os.path.join('uploads', 'categories')
        os.makedirs(upload_dir, exist_ok=True)

        filepath = os.path.join(upload_dir, filename)
        file.save(filepath)

        # Return relative path for database storage
        return f'/uploads/categories/{filename}'
    return None


@bp.route('/categories', methods=['POST'])
@admin_required
def create_category():
    """
    Create a new category
    Expects multipart/form-data with:
    - name: string (required)
    - slug: string (required)
    - description: string
    - display_order: integer
    - is_active: boolean
    - image: file
    """
    try:
        # Get form data
        name = request.form.get('name')
        slug = request.form.get('slug')
        description = request.form.get('description', '')
        display_order = request.form.get('display_order', 0, type=int)
        is_active = request.form.get('is_active', 'true').lower() == 'true'

        if not name or not slug:
            return jsonify({'error': 'Name and slug are required'}), 400

        # Check if slug already exists
        existing = Category.query.filter_by(slug=slug).first()
        if existing:
            return jsonify({'error': 'A category with this slug already exists'}), 400

        # Handle image upload
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                image_path = save_category_image(file)

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
    Expects multipart/form-data (same fields as create)
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Get form data
        name = request.form.get('name')
        slug = request.form.get('slug')
        description = request.form.get('description')
        display_order = request.form.get('display_order', type=int)
        is_active = request.form.get('is_active')

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
        if display_order is not None:
            category.display_order = display_order
        if is_active is not None:
            category.is_active = is_active.lower() == 'true'

        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                # Delete old image if exists
                if category.image:
                    old_image_path = category.image.lstrip('/')
                    if os.path.exists(old_image_path):
                        os.remove(old_image_path)

                # Save new image
                image_path = save_category_image(file)
                if image_path:
                    category.image = image_path

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
    Delete a category and all its niches
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Delete image if exists
        if category.image:
            image_path = category.image.lstrip('/')
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception as e:
                    print(f"Error deleting image: {e}")

        # Delete category (cascade will delete niches)
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


# ============================================================================
# NICHE MANAGEMENT
# ============================================================================

@bp.route('/categories/niches', methods=['POST'])
@admin_required
def create_niche():
    """
    Create a new niche
    Expects multipart/form-data with:
    - category_id: integer (required)
    - name: string (required)
    - description: string
    - is_active: boolean
    - image: file
    """
    try:
        # Get form data
        category_id = request.form.get('category_id', type=int)
        name = request.form.get('name')
        description = request.form.get('description', '')
        is_active = request.form.get('is_active', 'true').lower() == 'true'

        if not category_id or not name:
            return jsonify({'error': 'Category ID and name are required'}), 400

        # Verify category exists
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        # Handle image upload
        image_path = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                image_path = save_category_image(file)  # Reuse same function

        # Create niche
        niche = Niche(
            category_id=category_id,
            name=name,
            description=description,
            image=image_path,
            is_active=is_active
        )

        db.session.add(niche)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Niche created successfully',
            'niche': niche.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to create niche',
            'message': str(e)
        }), 500


@bp.route('/categories/niches/<int:niche_id>', methods=['PUT'])
@admin_required
def update_niche(niche_id):
    """
    Update an existing niche
    """
    try:
        niche = Niche.query.get(niche_id)
        if not niche:
            return jsonify({'error': 'Niche not found'}), 404

        # Get form data
        category_id = request.form.get('category_id', type=int)
        name = request.form.get('name')
        description = request.form.get('description')
        is_active = request.form.get('is_active')

        # Update fields if provided
        if category_id:
            category = Category.query.get(category_id)
            if not category:
                return jsonify({'error': 'Category not found'}), 404
            niche.category_id = category_id
        if name:
            niche.name = name
        if description is not None:
            niche.description = description
        if is_active is not None:
            niche.is_active = is_active.lower() == 'true'

        # Handle image upload
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                # Delete old image if exists
                if niche.image:
                    old_image_path = niche.image.lstrip('/')
                    if os.path.exists(old_image_path):
                        os.remove(old_image_path)

                # Save new image
                image_path = save_category_image(file)
                if image_path:
                    niche.image = image_path

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Niche updated successfully',
            'niche': niche.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to update niche',
            'message': str(e)
        }), 500


@bp.route('/categories/niches/<int:niche_id>', methods=['DELETE'])
@admin_required
def delete_niche(niche_id):
    """
    Delete a niche
    """
    try:
        niche = Niche.query.get(niche_id)
        if not niche:
            return jsonify({'error': 'Niche not found'}), 404

        # Delete image if exists
        if niche.image:
            image_path = niche.image.lstrip('/')
            if os.path.exists(image_path):
                try:
                    os.remove(image_path)
                except Exception as e:
                    print(f"Error deleting niche image: {e}")

        db.session.delete(niche)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Niche deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Failed to delete niche',
            'message': str(e)
        }), 500
