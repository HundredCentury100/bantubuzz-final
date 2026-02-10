"""
Public categories routes
No authentication required - accessible to all users
"""

from flask import Blueprint, jsonify, request
from app import db
from app.models import Category

bp = Blueprint('categories', __name__)


@bp.route('', methods=['GET'])
def get_categories():
    """
    Get all active categories
    Public endpoint - no authentication required
    """
    try:
        # Only return active categories
        categories = Category.query.filter_by(is_active=True).order_by(
            Category.name
        ).all()

        return jsonify({
            'categories': [cat.to_dict() for cat in categories]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:category_id>', methods=['GET'])
def get_category(category_id):
    """
    Get a specific category by ID
    Public endpoint
    """
    try:
        category = Category.query.filter_by(id=category_id, is_active=True).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        return jsonify(category.to_dict()), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<string:slug>', methods=['GET'])
def get_category_by_slug(slug):
    """
    Get a specific category by slug
    Public endpoint
    """
    try:
        category = Category.query.filter_by(slug=slug, is_active=True).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        return jsonify(category.to_dict()), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
