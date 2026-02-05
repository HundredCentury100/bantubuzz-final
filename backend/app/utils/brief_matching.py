"""
Brief matching utility - Check if creator meets brief criteria
"""

def matches_brief_criteria(creator_profile, brief):
    """
    Check if a creator matches the targeting criteria of a brief

    Args:
        creator_profile: CreatorProfile object
        brief: Brief object

    Returns:
        bool: True if creator matches, False otherwise
    """

    # Check categories - use case-insensitive partial matching
    if brief.target_categories and len(brief.target_categories) > 0:
        creator_categories = creator_profile.categories or []
        if not creator_categories:
            return False

        # Case-insensitive partial match for categories
        category_matches = False
        for creator_cat in creator_categories:
            creator_cat_lower = creator_cat.lower().strip()
            for target_cat in brief.target_categories:
                target_cat_lower = target_cat.lower().strip()
                # Match if either category contains the other
                if target_cat_lower in creator_cat_lower or creator_cat_lower in target_cat_lower:
                    category_matches = True
                    break
            if category_matches:
                break

        if not category_matches:
            return False

    # Check follower count
    creator_followers = creator_profile.follower_count or 0

    if brief.target_min_followers is not None:
        if creator_followers < brief.target_min_followers:
            return False

    if brief.target_max_followers is not None:
        if creator_followers > brief.target_max_followers:
            return False

    # Check location - use case-insensitive partial matching
    if brief.target_locations and len(brief.target_locations) > 0:
        creator_location = creator_profile.location
        # If creator has no location set, they don't match
        if not creator_location:
            return False

        # Case-insensitive partial match - check if any target location is in creator's location or vice versa
        creator_location_lower = creator_location.lower().strip()
        location_matches = False
        for target_loc in brief.target_locations:
            target_loc_lower = target_loc.lower().strip()
            # Match if either location contains the other (handles "Harare, Zimbabwe" matching "Zimbabwe")
            if target_loc_lower in creator_location_lower or creator_location_lower in target_loc_lower:
                location_matches = True
                break

        if not location_matches:
            return False

    return True


def get_eligible_briefs_for_creator(creator_id):
    """
    Get all open briefs that a creator is eligible for

    Args:
        creator_id: Creator profile ID

    Returns:
        list: List of Brief objects
    """
    from app.models import Brief, CreatorProfile

    creator = CreatorProfile.query.get(creator_id)
    if not creator:
        return []

    # Get all open briefs
    open_briefs = Brief.query.filter_by(status='open').all()

    # Filter by matching criteria
    eligible = [b for b in open_briefs if matches_brief_criteria(creator, b)]

    return eligible
