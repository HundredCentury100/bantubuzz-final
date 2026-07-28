from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from app import db
from app.models import CreatorProfile, CreatorRanking, CreatorScore, User, Package
from app.utils import save_profile_picture, delete_profile_picture
from app.utils.file_upload import save_and_compress_image
from app.utils.image_compression import delete_image_variants
from app.services.creator_analytics_service import CreatorAnalyticsService
from sqlalchemy import or_, and_, func

bp = Blueprint('creators', __name__)

RESERVED_PUBLIC_USERNAMES = {
    'about', 'admin', 'api', 'blocked-users', 'bookings', 'brand', 'briefs',
    'browse', 'cart', 'checkout', 'contact', 'creator', 'creators', 'disputes',
    'forgot-password', 'help-center', 'how-it-works', 'login', 'messages',
    'my-tickets', 'notifications', 'packages', 'payment', 'pricing', 'privacy',
    'leaderboard', 'register', 'reset-password', 'saved-creators', 'subscription', 'success-stories',
    'support', 'terms', 'tickets', 'verify-otp', 'wallet', 'youtube'
}


def _public_creator_payload(creator):
    creator_data = creator.to_dict(include_user=True, public_view=True)
    from app.services.creator_score_service import CreatorScoreService
    creator_data['rank'] = CreatorScoreService.public_rank(creator.id)
    creator_data['badges'] = creator.get_all_badges()
    creator_data['leaderboard_display_badges'] = creator.get_leaderboard_badges()
    creator_data['public_creator_score'] = (
        round(float(creator.private_score.final_score or 0), 1)
        if creator.leaderboard_show_score and creator.private_score else None
    )

    from app.models import Collaboration, BrandProfile

    collaborations = Collaboration.query.filter(
        Collaboration.creator_id == creator.id,
        Collaboration.status == 'completed'
    ).all()

    brands_by_id = {}
    for collaboration in collaborations:
        brand = collaboration.brand or BrandProfile.query.get(collaboration.brand_id)
        if not brand or brand.id in brands_by_id:
            continue

        brands_by_id[brand.id] = {
            'id': brand.id,
            'name': brand.company_name,
            'logo': brand.logo,
            'logo_sizes': brand.logo_sizes or {}
        }

    creator_data['brands_worked_with'] = list(brands_by_id.values())
    return creator_data


@bp.route('/featured', methods=['GET'])
def get_featured_creators():
    """
    Get featured creators for homepage display with fallback logic
    Public endpoint - no authentication required
    Query params:
        - featured_type: 'general', 'facebook', 'instagram', 'tiktok', 'youtube', 'twitter', 'linkedin', 'threads', 'twitch', 'ugc'
        - platform: platform name for platform-specific fallback
    """
    try:
        featured_type = request.args.get('featured_type')  # Optional filter
        platform = request.args.get('platform')  # For fallback logic
        limit = request.args.get('limit', 4, type=int)  # Default 4 for homepage sections

        # Try to get featured creators
        try:
            from app.models import SpotlightBoost
            active_boost_creator_ids = [
                row.target_id for row in SpotlightBoost.query.filter(
                    SpotlightBoost.target_type == 'creator_profile',
                    SpotlightBoost.status == 'active',
                    SpotlightBoost.ends_at > datetime.utcnow()
                ).all()
            ]

            query = CreatorProfile.query.join(User).filter(
                User.is_active == True,
                User.is_verified == True
            )

            if active_boost_creator_ids:
                query = query.filter(
                    or_(
                        CreatorProfile.id.in_(active_boost_creator_ids),
                        CreatorProfile.is_featured == True,
                    )
                )
            else:
                query = query.filter(CreatorProfile.is_featured == True)

            # Filter by featured_type if provided
            if featured_type:
                query = query.filter(CreatorProfile.featured_type == featured_type)

            featured = query.order_by(
                CreatorProfile.featured_order,
                CreatorProfile.featured_since.desc()
            ).limit(limit).all()

            # FALLBACK LOGIC: If less than 4 featured creators, fill with top performing creators
            if len(featured) < 4:
                needed = 4 - len(featured)
                featured_ids = [c.id for c in featured]

                # Build fallback query
                fallback_query = CreatorProfile.query.join(User).filter(
                    User.is_active == True,
                    User.is_verified == True
                )

                # Exclude already featured
                if featured_ids:
                    fallback_query = fallback_query.filter(~CreatorProfile.id.in_(featured_ids))

                # Platform-specific fallback
                if platform:
                    fallback_query = fallback_query.filter(
                        func.cast(CreatorProfile.platforms, db.Text).contains(platform)
                    )

                # Prioritize: Top Creators (badge) > Responds Fast > High Followers
                # Check for top creators (5+ completed collaborations in last 30 days)
                from datetime import timedelta
                from app.models import Collaboration
                thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

                fallback_creators = fallback_query.outerjoin(
                    CreatorRanking,
                    and_(
                        CreatorRanking.creator_profile_id == CreatorProfile.id,
                        CreatorRanking.ranking_type == 'overall',
                        CreatorRanking.context_key == '',
                    ),
                ).order_by(
                    CreatorRanking.position.asc().nullslast(),
                    CreatorProfile.follower_count.desc(),
                ).limit(needed).all()

                # Add fallback creators to featured list
                featured.extend(fallback_creators)

        except Exception as e:
            # Featured fields don't exist yet, fallback to top creators
            query = CreatorProfile.query.join(User).filter(
                User.is_active == True,
                User.is_verified == True
            )

            # Platform filter for fallback
            if platform:
                query = query.filter(func.cast(CreatorProfile.platforms, db.Text).contains(platform))

            featured = query.outerjoin(
                CreatorRanking,
                and_(
                    CreatorRanking.creator_profile_id == CreatorProfile.id,
                    CreatorRanking.ranking_type == 'overall',
                    CreatorRanking.context_key == '',
                ),
            ).order_by(
                CreatorRanking.position.asc().nullslast(),
                CreatorProfile.follower_count.desc(),
            ).limit(limit).all()

        creators_data = []
        for creator in featured:
            creator_dict = creator.to_dict(include_user=True, public_view=True)

            review_stats = creator.get_review_stats()
            creator_dict['review_stats'] = {
                'average_rating': round(review_stats['average_rating'], 1) if review_stats['average_rating'] is not None else None,
                'total_reviews': review_stats['total_reviews']
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
        search = (request.args.get('search') or '').strip()
        platform = request.args.get('platform')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        sort_by = request.args.get('sort_by', '')
        include_without_packages = request.args.get('include_without_packages', 'false').lower() in ('1', 'true', 'yes')

        # New filter parameters
        languages = request.args.getlist('languages[]') or request.args.get('languages', '').split(',') if request.args.get('languages') else []
        languages = [l for l in languages if l]  # Filter empty strings
        follower_range = request.args.get('follower_range')
        min_rating = request.args.get('min_rating', type=float)
        price_range = request.args.get('price_range')

        # Build query
        query = CreatorProfile.query.join(User).filter(User.is_active == True)

        # Apply filters
        # For JSON array fields in PostgreSQL, we need to use the @> operator
        # SQLAlchemy provides this through the op() method
        if category:
            # Check if the JSON array contains the category
            query = query.filter(func.cast(CreatorProfile.categories, db.Text).contains(category))

        if location:
            query = query.filter(CreatorProfile.location.ilike(f'%{location}%'))

        if min_followers:
            query = query.filter(CreatorProfile.follower_count >= min_followers)

        if max_followers:
            query = query.filter(CreatorProfile.follower_count <= max_followers)

        # Platform filter - now uses platforms array
        if platform:
            # Check if the JSON array contains the platform
            query = query.filter(func.cast(CreatorProfile.platforms, db.Text).contains(platform))

        # Languages filter
        if languages:
            # Filter creators who have at least one of the selected languages
            query = query.filter(
                or_(*[func.cast(CreatorProfile.languages, db.Text).contains(lang) for lang in languages])
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
            search_lower = search.lower().lstrip('@')
            all_creators = [
                c for c in all_creators
                if (
                    # Search in categories
                    any(search_lower in cat.lower() for cat in (c.categories or []))
                    # Search in bio
                    or (c.bio and search_lower in c.bio.lower())
                    # Search in username
                    or (c.username and search_lower in c.username.lower())
                    # Search in display name fallback
                    or ((c.username or '').replace('_', ' ') and search_lower in (c.username or '').replace('_', ' ').lower())
                    # Search in user username if present
                    or (c.user and getattr(c.user, 'username', None) and search_lower in c.user.username.lower())
                    # Search in email
                    or (c.user and c.user.email and search_lower in c.user.email.lower())
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
                query = query.filter(func.cast(CreatorProfile.platforms, db.Text).contains(platform))
            if languages:
                query = query.filter(
                    or_(*[func.cast(CreatorProfile.languages, db.Text).contains(lang) for lang in languages])
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

        # Add review stats and cheapest package price. Public marketplace browsing
        # keeps the historic behavior of only showing creators with active
        # packages, while campaign invites can opt into all active creators.
        creators_with_stats = []
        private_scores = {
            row.creator_profile_id: float(row.final_score or 0)
            for row in CreatorScore.query.filter(
                CreatorScore.creator_profile_id.in_([creator.id for creator in all_creators])
            ).all()
        } if all_creators else {}
        public_ranks = {
            row.creator_profile_id: row.position
            for row in CreatorRanking.query.filter(
                CreatorRanking.ranking_type == 'overall',
                CreatorRanking.context_key == '',
                CreatorRanking.creator_profile_id.in_([creator.id for creator in all_creators]),
            ).all()
        } if all_creators else {}
        for creator in all_creators:
            # Get active packages for this creator
            packages = Package.query.filter_by(creator_id=creator.id, is_active=True).all()

            if not packages and not include_without_packages:
                continue

            creator_dict = creator.to_dict(include_user=True, public_view=True)

            review_stats = creator.get_review_stats()
            creator_dict['review_stats'] = {
                'average_rating': round(review_stats['average_rating'], 1) if review_stats['average_rating'] is not None else None,
                'total_reviews': review_stats['total_reviews']
            }

            prices = [p.price for p in packages]
            creator_dict['cheapest_package_price'] = min(prices) if prices else None
            creator_dict['total_packages'] = len(packages)
            creator_dict['rank'] = (
                {'position': public_ranks[creator.id], 'type': 'overall'}
                if creator.id in public_ranks else None
            )

            creators_with_stats.append(creator_dict)

        # Apply rating filter
        if min_rating:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['review_stats']['average_rating'] is not None and c['review_stats']['average_rating'] >= min_rating
            ]

        # Apply min/max price filters (all creators have packages now)
        if min_price is not None:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['cheapest_package_price'] >= min_price
            ]

        if max_price is not None:
            creators_with_stats = [
                c for c in creators_with_stats
                if c['cheapest_package_price'] <= max_price
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
                    if (max_p is None and c['cheapest_package_price'] >= min_p) or
                       (max_p is not None and min_p <= c['cheapest_package_price'] < max_p)
                ]

        # Check for featured creators (only when sort is 'relevance' or default)
        # Featured creators get priority ONLY when user hasn't explicitly selected another sort
        if sort_by in ['relevance', ''] or not sort_by:
            # Get active featured subscriptions
            from app.models import CreatorSubscription, CreatorSubscriptionPlan, SpotlightBoost
            from datetime import datetime

            featured_creator_ids = set()
            active_boosts = SpotlightBoost.query.filter(
                SpotlightBoost.target_type == 'creator_profile',
                SpotlightBoost.status == 'active',
                SpotlightBoost.ends_at > datetime.utcnow()
            ).all()
            for boost in active_boosts:
                featured_creator_ids.add(boost.target_id)

            active_featured_subs = CreatorSubscription.query.join(
                CreatorSubscriptionPlan
            ).filter(
                CreatorSubscription.status == 'active',
                CreatorSubscription.payment_verified == True,
                CreatorSubscription.end_date > datetime.now(timezone.utc),
                CreatorSubscriptionPlan.subscription_type == 'featured'
            ).all()

            for sub in active_featured_subs:
                featured_creator_ids.add(sub.creator_id)

            # Add is_featured flag to creators
            for creator in creators_with_stats:
                creator['is_featured'] = creator['id'] in featured_creator_ids

            # Sort: paid/manual featured creators first, then the private creator score.
            creators_with_stats.sort(
                key=lambda x: (
                    not x.get('is_featured', False),
                    -private_scores.get(x['id'], 0),
                    -x['review_stats']['total_reviews'],
                    -(x['review_stats']['average_rating'] or 0),
                )
            )
        elif sort_by == 'followers_desc':
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
            creators_with_stats.sort(key=lambda x: x['review_stats']['average_rating'] or 0, reverse=True)
        elif sort_by == 'newest':
            # Sort by created_at if available, otherwise use id as proxy
            creators_with_stats.sort(key=lambda x: x.get('created_at', ''), reverse=True)

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

        return jsonify(_public_creator_payload(creator)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/by-username/<username>', methods=['GET'])
def get_creator_by_username(username):
    """Get a public creator profile by unique username."""
    try:
        normalized_username = (username or '').strip()
        if not normalized_username:
            return jsonify({'error': 'Creator not found'}), 404

        creator = CreatorProfile.query.filter(
            func.lower(CreatorProfile.username) == normalized_username.lower()
        ).first()

        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        return jsonify(_public_creator_payload(creator)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/rankings', methods=['GET'])
def get_creator_rankings():
    """Return public creator rankings without exposing internal score values."""
    try:
        ranking_type = (request.args.get('type') or 'overall').strip().lower()
        context = (request.args.get('context') or '').strip().lower()
        limit = request.args.get('limit', 50, type=int)

        if ranking_type not in {'overall', 'category', 'platform', 'city'}:
            return jsonify({'error': 'Ranking type must be overall, category, platform, or city'}), 400
        if ranking_type != 'overall' and not context:
            return jsonify({'error': 'A context is required for category, platform, and city rankings'}), 400
        if limit not in {50, 100}:
            return jsonify({'error': 'Ranking limit must be 50 or 100'}), 400

        rankings = CreatorRanking.query.filter_by(
            ranking_type=ranking_type,
            context_key=context if ranking_type != 'overall' else '',
        ).order_by(CreatorRanking.position.asc()).limit(limit).all()

        creators = []
        for ranking in rankings:
            creator = ranking.creator
            if not creator or not creator.user or not creator.user.is_active:
                continue
            payload = _public_creator_payload(creator)
            payload['rank'] = {
                'position': ranking.position,
                'previous_position': ranking.previous_position,
                'movement': (
                    ranking.previous_position - ranking.position
                    if ranking.previous_position is not None else None
                ),
                'type': ranking.ranking_type,
                'context': ranking.context_key or None,
                'calculated_at': ranking.calculated_at.isoformat(),
            }
            creators.append(payload)

        return jsonify({
            'ranking_type': ranking_type,
            'context': context or None,
            'limit': limit,
            'creators': creators,
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/leaderboard', methods=['GET'])
def get_public_leaderboard():
    """Public rank-only leaderboard with optional category and primary-platform filters."""
    try:
        from app.services.creator_score_service import CreatorScoreService

        limit = request.args.get('limit', 50, type=int)
        category = request.args.get('category')
        platform = request.args.get('platform')
        normalized_platform = CreatorScoreService.normalize_platform(platform)

        if limit not in {50, 100}:
            return jsonify({'error': 'Leaderboard limit must be 50 or 100'}), 400
        if normalized_platform and normalized_platform not in CreatorScoreService.SUPPORTED_LEADERBOARD_PLATFORMS:
            return jsonify({'error': 'Unsupported leaderboard platform'}), 400

        payload = CreatorScoreService.leaderboard(
            category=category,
            platform=normalized_platform,
            limit=limit,
        )
        if payload['calculated_at']:
            payload['calculated_at'] = payload['calculated_at'].isoformat()
        return jsonify(payload), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:creator_id>/rank', methods=['GET'])
def get_creator_rank(creator_id):
    """Return one creator's public rank position."""
    try:
        from app.services.creator_score_service import CreatorScoreService

        creator = CreatorProfile.query.get(creator_id)
        if not creator or not creator.user or not creator.user.is_active:
            return jsonify({'error': 'Creator not found'}), 404

        ranking_type = (request.args.get('type') or 'overall').strip().lower()
        context = (request.args.get('context') or '').strip().lower()
        if ranking_type not in {'overall', 'category', 'platform', 'city'}:
            return jsonify({'error': 'Ranking type must be overall, category, platform, or city'}), 400
        if ranking_type != 'overall' and not context:
            return jsonify({'error': 'A context is required for category, platform, and city rankings'}), 400

        return jsonify({
            'creator_id': creator.id,
            'rank': CreatorScoreService.public_rank(creator.id, ranking_type, context),
        }), 200
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

        creator_data = creator.to_dict(include_user=True)
        try:
            from app.services.creator_score_service import CreatorScoreService
            creator_data['rank'] = CreatorScoreService.public_rank(creator.id)
            creator_data['creator_score'] = CreatorScoreService.owner_score_payload(creator)
        except Exception:
            creator_data['rank'] = None
            creator_data['creator_score'] = {
                'score': None,
                'message': 'Your score is temporarily unavailable.',
                'improvement_tips': []
            }
        return jsonify(creator_data), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/leaderboard-preferences', methods=['PUT'])
@jwt_required()
def update_leaderboard_preferences():
    """Update current creator's public leaderboard score and badge display preferences."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator' or not user.creator_profile:
            return jsonify({'error': 'Creator profile not found'}), 404

        creator = user.creator_profile
        data = request.get_json() or {}
        from app.services.creator_score_service import CreatorScoreService

        available_badges = CreatorScoreService.achievement_badges(creator)
        selected_badges = data.get('selected_badges', creator.leaderboard_badges or [])
        if selected_badges is None:
            selected_badges = []
        if not isinstance(selected_badges, list):
            return jsonify({'error': 'selected_badges must be a list'}), 400

        selected_badges = [
            str(badge)
            for badge in selected_badges
            if str(badge) in available_badges
        ]
        if len(selected_badges) > 3:
            return jsonify({'error': 'You can display up to 3 leaderboard badges'}), 400

        if 'show_score' in data:
            creator.leaderboard_show_score = bool(data.get('show_score'))
        creator.leaderboard_badges = selected_badges
        creator.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'message': 'Leaderboard preferences updated',
            'available_badges': available_badges,
            'leaderboard_preferences': {
                'show_score': bool(creator.leaderboard_show_score),
                'selected_badges': creator.leaderboard_badges or [],
                'display_badges': creator.get_leaderboard_badges(),
                'notified_at': creator.leaderboard_notified_at.isoformat() if creator.leaderboard_notified_at else None,
            },
        }), 200

    except Exception as e:
        db.session.rollback()
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

                if username.lower() in RESERVED_PUBLIC_USERNAMES:
                    return jsonify({'error': 'This username is reserved. Please choose another one.'}), 400

                # Check if username is already taken by another creator
                existing = CreatorProfile.query.filter(
                    func.lower(CreatorProfile.username) == username.lower(),
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

        # Always compute followers from connected ThunziAI platforms.
        creator.refresh_total_followers()

        if 'engagement_rate' in data:
            creator.engagement_rate = data['engagement_rate']

        if 'location' in data:
            creator.location = data['location']

        if 'city' in data:
            creator.city = data['city']

        if 'country' in data:
            creator.country = data['country']

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

        creator.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        from app.services.creator_score_service import queue_creator_score_recalculation
        queue_creator_score_recalculation(creator.id)

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
            creator.updated_at = datetime.now(timezone.utc)
            db.session.commit()
            from app.services.creator_score_service import queue_creator_score_recalculation
            queue_creator_score_recalculation(creator.id)

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
                'type': 'image',
                'url': image_data['medium'],  # Primary URL for mixed gallery
                'thumbnail': image_data['thumbnail'],
                'medium': image_data['medium'],
                'large': image_data['large'],
                'uploaded_at': datetime.now(timezone.utc).isoformat(),
                'original_size_kb': image_data.get('original_size_kb', 0),
                'compressed_size_kb': image_data.get('compressed_size_kb', 0),
                'display_order': len(creator.gallery_images)
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

            creator.updated_at = datetime.now(timezone.utc)
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


@bp.route('/profile/gallery-video', methods=['POST'])
@jwt_required()
def upload_gallery_video():
    """Upload video to creator's gallery with validation"""
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

        # Validate file type
        allowed_video_types = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
        if file.content_type not in allowed_video_types:
            return jsonify({'error': 'Invalid file type. Only MP4, WebM, and MOV videos are allowed'}), 400

        # Validate file size (10MB limit)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning

        MAX_VIDEO_SIZE = 10 * 1024 * 1024  # 10MB
        if file_size > MAX_VIDEO_SIZE:
            size_mb = file_size / (1024 * 1024)
            return jsonify({'error': f'Video too large ({size_mb:.1f}MB). Maximum size is 10MB'}), 400

        # Initialize gallery_images if None
        if creator.gallery_images is None:
            creator.gallery_images = []

        # Count existing videos
        video_count = sum(1 for item in creator.gallery_images if item.get('type') == 'video')
        if video_count >= 2:
            return jsonify({'error': 'Maximum 2 videos allowed in gallery'}), 400

        # Save video file
        import uuid
        import os
        from werkzeug.utils import secure_filename

        # Create upload folder if it doesn't exist (match Apache uploads alias)
        upload_folder = os.path.join('uploads', 'gallery_videos')
        os.makedirs(upload_folder, exist_ok=True)

        # Generate unique filename
        file_extension = os.path.splitext(secure_filename(file.filename))[1]
        unique_filename = f"creator_{creator.id}_video_{uuid.uuid4().hex}{file_extension}"
        file_path = os.path.join(upload_folder, unique_filename)

        # Save the video
        file.save(file_path)

        # Create relative path for database (served by Apache /uploads alias)
        relative_path = f"/uploads/gallery_videos/{unique_filename}"

        # Create gallery item
        gallery_item = {
            'id': str(uuid.uuid4()),
            'url': relative_path,
            'type': 'video',
            'mime_type': file.content_type,
            'size_bytes': file_size,
            'uploaded_at': datetime.now(timezone.utc).isoformat(),
            'display_order': len(creator.gallery_images)
        }

        # Add to gallery
        gallery_images = list(creator.gallery_images)
        gallery_images.append(gallery_item)
        creator.gallery_images = gallery_images

        # Backward compatibility: also add to old gallery
        if creator.gallery is None:
            creator.gallery = []
        gallery = list(creator.gallery)
        gallery.append(relative_path)
        creator.gallery = gallery

        creator.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Portfolio video added successfully',
            'gallery_item': gallery_item,
            'gallery_images': creator.gallery_images
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/gallery/<int:index>', methods=['DELETE'])
@jwt_required()
def delete_gallery_image(index):
    """Delete image or video from creator's gallery (supports both old and new format)"""
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

            # Delete file(s) based on type
            if gallery_item.get('type') == 'video':
                # Delete video file
                import os
                video_url = gallery_item.get('url')
                if video_url:
                    # Remove /uploads prefix from URL to get file path
                    video_path = video_url.lstrip('/').replace('uploads/', '')
                    video_path = os.path.join('uploads', video_path.replace('gallery_videos/', 'gallery_videos/'))
                    if os.path.exists(video_path):
                        os.remove(video_path)
            else:
                # Delete all image size variants
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

        creator.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Gallery item removed successfully',
            'gallery': creator.gallery or [],
            'gallery_images': creator.gallery_images or []
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/profile/gallery/reorder', methods=['PUT'])
@jwt_required()
def reorder_gallery():
    """Reorder gallery items"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'creator':
            return jsonify({'error': 'Not authorized'}), 403

        creator = user.creator_profile
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()
        new_order = data.get('gallery_images')

        if not new_order or not isinstance(new_order, list):
            return jsonify({'error': 'Invalid gallery order'}), 400

        # Update display_order for each item
        for index, item in enumerate(new_order):
            item['display_order'] = index

        # Update gallery_images
        creator.gallery_images = new_order

        # Update old gallery format for backward compatibility
        creator.gallery = [item.get('url') or item.get('medium') for item in new_order]

        creator.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Gallery reordered successfully',
            'gallery_images': creator.gallery_images
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500



@bp.route("/<int:creator_id>/platform-analytics", methods=["GET"])
def get_creator_platform_analytics(creator_id):
    """
    Get platform analytics for a creator (public endpoint)
    Shows aggregated post metrics with conditional display (platform-specific availability)

    HYBRID APPROACH:
    1. Try PostMetricsService first (uses stored post metrics with conditional logic)
    2. Fallback to CreatorAnalyticsService (live ThunziAI data) if no post metrics exist
    """
    try:
        from app.services.post_metrics_service import PostMetricsService

        # Get creator to verify they exist
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({"error": "Creator not found"}), 404

        # Try PostMetricsService first (aggregates from PostMetrics table)
        # This uses conditional aggregation - only non-null values are included
        analytics = PostMetricsService.get_creator_analytics(creator_id)

        # If we have platform data from PostMetrics, use it
        if analytics.get('has_platforms') and len(analytics.get('platforms', [])) > 0:
            return jsonify(analytics), 200

        # Fallback to ThunziAI direct query if no post metrics exist yet
        # This allows creators to see their analytics before any posts are synced
        fallback_analytics = CreatorAnalyticsService.get_creator_platform_analytics(
            creator.user_id
        )

        return jsonify(fallback_analytics), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/<int:creator_id>/audience', methods=['GET'])
def get_creator_audience(creator_id):
    """
    Get aggregated audience demographics for a creator (public endpoint)

    Combines audience data from all connected ThunziAI platforms
    """
    try:
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        # Get ThunziAI account
        from app.models.thunzi_account import ThunziAccount
        from app.services.thunzi_service import thunzi_service

        thunzi_account = ThunziAccount.query.filter_by(
            user_id=creator.user_id
        ).first()

        if not thunzi_account or not thunzi_account.thunzi_email or not thunzi_account.thunzi_company_id:
            return jsonify({'error': 'Creator not connected to ThunziAI'}), 404

        # Get all platforms for this creator's company
        # Ensure authenticated (handles both verified and unverified accounts)
        user_registered = thunzi_service.ensure_user_registered(email=thunzi_account.thunzi_email)

        if not user_registered:
            return jsonify({'error': 'Failed to authenticate with ThunziAI'}), 500

        platforms = thunzi_service.get_platforms(thunzi_account.thunzi_company_id)

        if not platforms:
            return jsonify({'error': 'No platforms found'}), 404

        connected_platform_ids = [
            p['id'] for p in platforms
            if p.get('isConnected') and p.get('id')
        ]

        if not connected_platform_ids:
            # Return empty data with 200 status instead of 404
            # This allows frontend to show helpful message
            return jsonify({
                'age': [],
                'gender': [],
                'countries': [],
                'cities': [],
                'totalPlatforms': 0,
                'message': 'Audience demographics will appear after a connected platform has synced audience data from ThunziAI.'
            }), 200

        audience_data = thunzi_service.get_aggregated_audience(connected_platform_ids)

        if not audience_data or not any([
            audience_data.get('age'),
            audience_data.get('gender'),
            audience_data.get('countries'),
            audience_data.get('cities')
        ]):
            connected_followers = sum(
                p.get('followers', 0) for p in platforms
                if p.get('isConnected')
            )

            # Return empty data with 200 status instead of 404
            if connected_followers < 100:
                message = f'Connected platforms have {connected_followers} total followers. Audience demographics may require more audience data before ThunziAI can return insights.'
            else:
                message = 'Connected platforms found. Audience data will be available once ThunziAI syncs demographic insights.'

            return jsonify({
                'age': [],
                'gender': [],
                'countries': [],
                'cities': [],
                'totalPlatforms': len(connected_platform_ids),
                'followers': connected_followers,
                'message': message
            }), 200

        return jsonify(audience_data), 200

    except Exception as e:
        print(f"Error getting creator audience: {str(e)}")
        return jsonify({'error': str(e)}), 500

