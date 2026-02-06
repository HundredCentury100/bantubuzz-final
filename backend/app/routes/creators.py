from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import CreatorProfile, User, Review, Package
from app.utils import save_profile_picture, delete_profile_picture
from app.utils.file_upload import save_and_compress_image
from app.utils.image_compression import delete_image_variants
from sqlalchemy import or_, and_, func

bp = Blueprint('creators', __name__)


@bp.route('/featured', methods=['GET'])
def get_featured_creators():
    """
    Get featured creators for homepage display
    Public endpoint - no authentication required
    Query params: featured_type - 'general', 'tiktok', 'instagram'
    """
    try:
        featured_type = request.args.get('featured_type')  # Optional filter

        # Try to get featured creators
        try:
            query = CreatorProfile.query.join(User).filter(
                CreatorProfile.is_featured == True,
                User.is_active == True,
                User.is_verified == True
            )

            # Filter by featured_type if provided
            if featured_type:
                query = query.filter(CreatorProfile.featured_type == featured_type)

            featured = query.order_by(
                CreatorProfile.featured_order,
                CreatorProfile.featured_since.desc()
            ).limit(8).all()
        except Exception:
            # Featured fields don't exist yet, fallback to top creators
            featured = CreatorProfile.query.join(User).filter(
                User.is_active == True,
                User.is_verified == True
            ).order_by(
                CreatorProfile.follower_count.desc()
            ).limit(8).all()

        creators_data = []
        for creator in featured:
            creator_dict = creator.to_dict(include_user=True, public_view=True)

            # Get review stats
            reviews = Review.query.filter_by(creator_id=creator.id).all()
            if reviews:
                avg_rating = sum(r.rating for r in reviews) / len(reviews)
                creator_dict['review_stats'] = {
                    'average_rating': round(avg_rating, 1),
                    'total_reviews': len(reviews)
                }
            else:
                creator_dict['review_stats'] = {
                    'average_rating': 0,
                    'total_reviews': 0
                }

            # Get cheapest package price
            packages = Package.query.filter_by(creator_id=creator.id, is_active=True).all()
            if packages:
                prices = [p.price for p in packages]
                creator_dict['cheapest_package_price'] = min(prices)
            else:
                creator_dict['cheapest_package_price'] = None

            creators_data.append(creator_dict)

        return jsonify({
            'creators': creators_data,
            'total': len(creators_data)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
def get_creators():
    """Get all creators with filters"""
    try:
        # Get query parameters
        category = request.args.get('category')
        location = request.args.get('location')
        min_followers = request.args.get('min_followers', type=int)
        max_followers = request.args.get('max_followers', type=int)
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        search = request.args.get('search')
        platform = request.args.get('platform')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        sort_by = request.args.get('sort_by', '')

        # New filter parameters
        languages = request.args.getlist('languages[]') or request.args.get('languages', '').split(',') if request.args.get('languages') else []
        languages = [l for l in languages if l]  # Filter empty strings
        follower_range = request.args.get('follower_range')
        min_rating = request.args.get('min_rating', type=float)
        price_range = request.args.get('price_range')

        # Build query
        query = CreatorProfile.query.join(User).filter(User.is_active == True)

        # Apply filters
        if category:
            query = query.filter(CreatorProfile.categories.contains([category]))

        if location:
            query = query.filter(CreatorProfile.location.ilike(f'%{location}%'))

        if min_followers:
            query = query.filter(CreatorProfile.follower_count >= min_followers)

        if max_followers:
            query = query.filter(CreatorProfile.follower_count <= max_followers)

        # Platform filter - now uses platforms array
        if platform:
            query = query.filter(CreatorProfile.platforms.contains([platform]))

        # Languages filter
        if languages:
            # Filter creators who have at least one of the selected languages
            query = query.filter(
                or_(*[CreatorProfile.languages.contains([lang]) for lang in languages])
            )

        # Follower range filter
        if follower_range:
            follower_ranges = {
                '0-1K': (0, 1000),
                '1K-10K': (1000, 10000),
                '10K-50K': (10000, 50000),
                '50K-100K': (50000, 100000),
                '100K-500K': (100000, 500000),
                '500K+': (500000, None)
            }
            if follower_range in follower_ranges:
                min_f, max_f = follower_ranges[follower_range]
                if max_f is None:
                    query = query.filter(CreatorProfile.follower_count >= min_f)
                else:
                    query = query.filter(
                        and_(
                            CreatorProfile.follower_count >= min_f,
                            CreatorProfile.follower_count < max_f
                        )
                    )

        # Get all creators first, we'll filter by search and categories in Python
        # This is because categories/bio/username need case-insensitive partial matching
        all_creators = query.all()

        # Apply search filter - check bio, username, email, AND categories
        if search:
            search_lower = search.lower()
            all_creators = [
                c for c in all_creators
                if (
                    # Search in categories
                    any(search_lower in cat.lower() for cat in (c.categories or []))
                    # Search in bio
                    or (c.bio and search_lower in c.bio.lower())
                    # Search in username
                    or (c.username and search_lower in c.username.lower())
                    # Search in email
                    or (c.user.email and search_lower in c.user.email.lower())
                )
            ]

        # If category was provided but no exact match, try case-insensitive partial match
        if category and not all_creators:
            # Re-run query without category filter
            query = CreatorProfile.query.join(User).filter(User.is_active == True)
            if location:
                query = query.filter(CreatorProfile.location.ilike(f'%{location}%'))
            if min_followers:
                query = query.filter(CreatorProfile.follower_count >= min_followers)
            if max_followers:
                query = query.filter(CreatorProfile.follower_count <= max_followers)
            if platform:
                query = query.filter(CreatorProfile.platforms.contains([platform]))
            if languages:
                query = query.filter(
                    or_(*[CreatorProfile.languages.contains([lang]) for lang in languages])
                )
            if follower_range:
                follower_ranges = {
                    '0-1K': (0, 1000),
                    '1K-10K': (1000, 10000),
                    '10K-50K': (10000, 50000),
                    '50K-100K': (50000, 100000),
                    '100K-500K': (100000, 500000),
                    '500K+': (500000, None)
                }
                if follower_range in follower_ranges:
                    min_f, max_f = follower_ranges[follower_range]
                    if max_f is None:
                        query = query.filter(CreatorProfile.follower_count >= min_f)
                    else:
                        query = query.filter(
                            and_(
                                CreatorProfile.follower_count >= min_f,
                                CreatorProfile.follower_count < max_f
                            )
                        )

            all_creators = query.all()
            # Filter by category in Python (case-insensitive partial match)
            category_lower = category.lower()
            all_creators = [
                c for c in all_creators
                if any(category_lower in cat.lower() for cat in (c.categories or []))
            ]

        # Add review stats and cheapest package price
        creators_with_stats = []
        for creator in all_creators:
            # Get active packages for this creator
            packages = Package.query.filter_by(creator_id=creator.id, is_active=True).all()

            creator_dict = creator.to_dict(include_user=True, public_view=True)

            # Get review stats
            reviews = Review.query.filter_by(creator_id=creator.id).all()
            if reviews:
                avg_rating = sum(r.rating for r in reviews) / len(reviews)
                creator_dict['review_stats'] = {
                    'average_rating': round(avg_rating, 1),
                    'total_reviews': len(reviews)
                }
            else:
                creator_dict['review_stats'] = {
                    'average_rating': 0,
                    'total_reviews': 0
                }

            # Get cheapest package price if packages exist
            if packages:
                prices = [p.price for p in packages]
                creator_dict['cheapest_package_price'] = min(prices)
                creator_dict['total_packages'] = len(packages)
            else:
                creator_dict['cheapest_package_price'] = None
                creator_dict['total_packages'] = 0

            creators_with_stats.append(creator_dict)

        # Apply rating filter
        if min_rating:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['review_stats']['average_rating'] >= min_rating
            ]

        # Apply min/max price filters
        if min_price is not None:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['cheapest_package_price'] is not None and c['cheapest_package_price'] >= min_price
            ]

        if max_price is not None:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['cheapest_package_price'] is not None and c['cheapest_package_price'] <= max_price
            ]

        # Legacy price_range filter (kept for backward compatibility)
        if price_range:
            price_ranges = {
                '$0-$50': (0, 50),
                '$50-$100': (50, 100),
                '$100-$250': (100, 250),
                '$250-$500': (250, 500),
                '$500-$1000': (500, 1000),
                '$1000+': (1000, None)
            }
            if price_range in price_ranges:
                min_p, max_p = price_ranges[price_range]
                creators_with_stats = [
                    c for c in creators_with_stats
                    if c['cheapest_package_price'] is not None and (
                        (max_p is None and c['cheapest_package_price'] >= min_p) or
                        (max_p is not None and min_p <= c['cheapest_package_price'] < max_p)
                    )
                ]

        # Apply sorting based on sort_by parameter
        if sort_by == 'followers_desc':
            creators_with_stats.sort(key=lambda x: x.get('follower_count', 0), reverse=True)
        elif sort_by == 'followers_asc':
            creators_with_stats.sort(key=lambda x: x.get('follower_count', 0), reverse=False)
        elif sort_by == 'price_desc':
            # Sort by price, but put None values at the end
            creators_with_stats.sort(key=lambda x: (x['cheapest_package_price'] is None, x['cheapest_package_price'] or 0), reverse=True)
        elif sort_by == 'price_asc':
            # Sort by price, but put None values at the end
            creators_with_stats.sort(key=lambda x: (x['cheapest_package_price'] is None, x['cheapest_package_price'] or float('inf')), reverse=False)
        elif sort_by == 'rating_desc':
            creators_with_stats.sort(key=lambda x: x['review_stats']['average_rating'], reverse=True)
        elif sort_by == 'newest':
            # Sort by created_at if available, otherwise use id as proxy
            creators_with_stats.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        else:
            # Default: Sort by total reviews (descending), then by average rating (descending)
            creators_with_stats.sort(
                key=lambda x: (x['review_stats']['total_reviews'], x['review_stats']['average_rating']),
                reverse=True
            )

        # Apply pagination manually after sorting
        total = len(creators_with_stats)
        start = (page - 1) * per_page
        end = start + per_page
        creators = creators_with_stats[start:end]

        # Calculate total pages
        import math
        total_pages = math.ceil(total / per_page) if total > 0 else 1

        return jsonify({
            'creators': creators,
            'total': total,
            'pages': total_pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all unique categories from creators"""
    try:
        # Query all creators and extract unique categories
        creators = CreatorProfile.query.all()
        categories_set = set()

        for creator in creators:
            if creator.categories:
                for category in creator.categories:
                    categories_set.add(category)

        # Sort alphabetically
        categories = sorted(list(categories_set))

        return jsonify({
            'categories': categories
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:creator_id>', methods=['GET'])
def get_creator(creator_id):
    """Get a specific creator"""
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        return jsonify(creator.to_dict(include_user=True, public_view=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_own_profile():
    """Get current user's creator profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Creator profile not found'}), 404

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        return jsonify(creator.to_dict(include_user=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update creator profile"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()

        # Update username if provided
        if 'username' in data:
            username = data['username'].strip()
            if username:
                # Validate username format (alphanumeric, underscores, 3-20 chars)
                import re
                if not re.match(r'^[a-zA-Z0-9_]{3,20}$', username):
                    return jsonify({'error': 'Username must be 3-20 characters and contain only letters, numbers, and underscores'}), 400

                # Check if username is already taken by another creator
                existing = CreatorProfile.query.filter(
                    CreatorProfile.username == username,
                    CreatorProfile.id != creator.id
                ).first()
                if existing:
                    return jsonify({'error': 'Username already taken'}), 400

                creator.username = username
            else:
                creator.username = None

        # Update fields if provided
        if 'bio' in data:
            creator.bio = data['bio']

        if 'profile_picture' in data:
            creator.profile_picture = data['profile_picture']

        if 'portfolio_url' in data:
            creator.portfolio_url = data['portfolio_url']

        if 'categories' in data:
            creator.categories = data['categories']

        if 'follower_count' in data:
            creator.follower_count = data['follower_count']

        if 'engagement_rate' in data:
            creator.engagement_rate = data['engagement_rate']

        if 'location' in data:
            creator.location = data['location']

        if 'languages' in data:
            creator.languages = data['languages']

        if 'platforms' in data:
            creator.platforms = data['platforms']

        if 'availability_status' in data:
            if data['availability_status'] in ['available', 'busy', 'unavailable']:
                creator.availability_status = data['availability_status']

        if 'social_links' in data:
            creator.social_links = data['social_links']

        if 'success_stories' in data:
            creator.success_stories = data['success_stories']

        # Update revision settings
        if 'free_revisions' in data:
            free_revisions = int(data['free_revisions'])
            if 0 <= free_revisions <= 10:
                creator.free_revisions = free_revisions
            else:
                return jsonify({'error': 'Free revisions must be between 0 and 10'}), 400

        if 'revision_fee' in data:
            revision_fee = float(data['revision_fee'])
            if revision_fee >= 0:
                creator.revision_fee = revision_fee
            else:
                return jsonify({'error': 'Revision fee cannot be negative'}), 400

        creator.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'creator': creator.to_dict(include_user=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload creator profile picture with automatic compression"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Delete old profile picture variants if they exist
        if creator.profile_picture_sizes:
            delete_image_variants(creator.profile_picture_sizes)
        elif creator.profile_picture:
            # Fallback: delete old single file
            delete_profile_picture(creator.profile_picture)

        # Save and compress new profile picture
        try:
            image_data = save_and_compress_image(file, folder='profiles/creators')

            # Store multi-size paths
            creator.profile_picture_sizes = {
                'thumbnail': image_data['thumbnail'],
                'medium': image_data['medium'],
                'large': image_data['large']
            }

            # Backward compatibility: store medium size as main profile picture
            creator.profile_picture = image_data['medium']
            creator.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'message': 'Profile picture updated successfully',
                'profile_picture': image_data['medium'],
                'profile_picture_sizes': creator.profile_picture_sizes
            }), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/gallery', methods=['POST'])
@jwt_required()
def upload_gallery_image():
    """Upload image to creator's gallery with automatic compression"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save and compress gallery image
        try:
            import uuid
            image_data = save_and_compress_image(file, folder='profiles/creators/gallery')

            # Initialize gallery_images if None
            if creator.gallery_images is None:
                creator.gallery_images = []

            # Create gallery item with multi-size support
            gallery_item = {
                'id': str(uuid.uuid4()),
                'thumbnail': image_data['thumbnail'],
                'medium': image_data['medium'],
                'large': image_data['large'],
                'uploaded_at': datetime.utcnow().isoformat(),
                'original_size_kb': image_data.get('original_size_kb', 0),
                'compressed_size_kb': image_data.get('compressed_size_kb', 0)
            }

            # Add to new gallery structure
            gallery_images = list(creator.gallery_images)
            gallery_images.append(gallery_item)
            creator.gallery_images = gallery_images

            # Backward compatibility: also add medium size to old gallery
            if creator.gallery is None:
                creator.gallery = []
            gallery = list(creator.gallery)
            gallery.append(image_data['medium'])
            creator.gallery = gallery

            creator.updated_at = datetime.utcnow()
            db.session.commit()

            return jsonify({
                'message': 'Portfolio image added successfully',
                'gallery_item': gallery_item,
                'gallery_images': creator.gallery_images
            }), 200

        except ValueError as e:
            return jsonify({'error': str(e)}), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/gallery/<int:index>', methods=['DELETE'])
@jwt_required()
def delete_gallery_image(index):
    """Delete image from creator's gallery (supports both old and new format)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Try new gallery_images format first
        if creator.gallery_images and len(creator.gallery_images) > index >= 0:
            gallery_item = creator.gallery_images[index]

            # Delete all size variants
            delete_image_variants({
                'thumbnail': gallery_item.get('thumbnail'),
                'medium': gallery_item.get('medium'),
                'large': gallery_item.get('large')
            })

            # Remove from gallery_images array
            gallery_images = list(creator.gallery_images)
            gallery_images.pop(index)
            creator.gallery_images = gallery_images

            # Also remove from old gallery if it exists
            if creator.gallery and len(creator.gallery) > index:
                gallery = list(creator.gallery)
                gallery.pop(index)
                creator.gallery = gallery

        # Fallback to old gallery format
        elif creator.gallery and len(creator.gallery) > index >= 0:
            file_path = creator.gallery[index]
            delete_profile_picture(file_path)

            gallery = list(creator.gallery)
            gallery.pop(index)
            creator.gallery = gallery
        else:
            return jsonify({'error': 'Invalid gallery index'}), 400

        creator.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Portfolio image removed successfully',
            'gallery': creator.gallery or [],
            'gallery_images': creator.gallery_images or []
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
