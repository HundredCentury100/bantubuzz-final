"""
Public categories and niches routes
No authentication required - accessible to all users
"""

from flask import Blueprint, jsonify, request
from app import db
from app.models import Category, Niche

bp = Blueprint('categories', __name__)


@bp.route('', methods=['GET'])
def get_categories():
    """
    Get all active categories
    Public endpoint - no authentication required
    """
    try:
        include_niches = request.args.get('include_niches', 'false') == 'true'

        # Only return active categories
        categories = Category.query.filter_by(is_active=True).order_by(
            Category.display_order, Category.name
        ).all()

        return jsonify({
            'categories': [cat.to_dict(include_niches=include_niches) for cat in categories]
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

        return jsonify(category.to_dict(include_niches=True)), 200

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

        return jsonify(category.to_dict(include_niches=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:category_id>/niches', methods=['GET'])
def get_category_niches(category_id):
    """
    Get all niches for a specific category
    Public endpoint
    """
    try:
        category = Category.query.filter_by(id=category_id, is_active=True).first()
        if not category:
            return jsonify({'error': 'Category not found'}), 404

        niches = Niche.query.filter_by(
            category_id=category_id,
            is_active=True
        ).order_by(Niche.name).all()

        return jsonify({
            'niches': [niche.to_dict() for niche in niches]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/niches', methods=['GET'])
def get_all_niches():
    """
    Get all active niches (optionally filtered by category)
    Public endpoint
    """
    try:
        category_id = request.args.get('category_id', type=int)

        query = Niche.query.filter_by(is_active=True)

        if category_id:
            query = query.filter_by(category_id=category_id)

        niches = query.order_by(Niche.name).all()

        return jsonify({
            'niches': [niche.to_dict(include_category=True) for niche in niches]
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
