"""
Admin Category Management routes
Handles create, update, delete operations for categories
"""
from flask import jsonify, request
from app import db
from app.models import Category
from app.decorators.admin import admin_required
from . import bp


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
    Expects JSON with:
    - name: string (required)
    - slug: string (optional, will be auto-generated from name if not provided)
    - description: string
    - is_active: boolean
    """
    try:
        data = request.get_json()

        name = data.get('name')
        slug = data.get('slug')
        description = data.get('description', '')
        is_active = data.get('is_active', True)

        if not name:
            return jsonify({'error': 'Name is required'}), 400

        # Auto-generate slug if not provided
        if not slug:
            slug = name.lower().replace(' & ', '-').replace(' ', '-').replace('&', 'and')

        # Check if slug already exists
        existing = Category.query.filter_by(slug=slug).first()
        if existing:
            return jsonify({'error': 'A category with this slug already exists'}), 400

        # Create category
        category = Category(
            name=name,
            slug=slug,
            description=description,
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
    Expects JSON with same fields as create
    """
    try:
        category = Category.query.get(category_id)
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        data = request.get_json()

        # Get form data
        name = data.get('name')
        slug = data.get('slug')
        description = data.get('description')
        is_active = data.get('is_active')

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
            category.is_active = is_active

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
