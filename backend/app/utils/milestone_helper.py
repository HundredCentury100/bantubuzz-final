"""
Milestone helper utilities
"""
from datetime import timedelta


def calculate_milestone_pricing(total_price, milestones, pricing_type):
    """
    Calculate pricing for each milestone

    Args:
        total_price: Total price for all milestones
        milestones: List of milestone objects
        pricing_type: 'total' or 'per_milestone'

    Returns:
        list: Milestones with calculated prices
    """
    if pricing_type == 'per_milestone':
        # Prices already set individually
        return milestones

    # pricing_type == 'total' - divide evenly
    milestone_count = len(milestones)
    if milestone_count == 0:
        return []

    price_per_milestone = float(total_price) / milestone_count

    for milestone in milestones:
        milestone['price'] = price_per_milestone

    return milestones


def validate_milestone_requirement(duration_days, milestone_count):
    """
    Validate that campaigns >10 days have milestones

    Args:
        duration_days: Total duration in days
        milestone_count: Number of milestones

    Returns:
        tuple: (is_valid, error_message)
    """
    if duration_days > 10 and milestone_count < 1:
        return False, 'Campaigns longer than 10 days must have at least one milestone'

    return True, None


def calculate_milestone_due_dates(start_date, milestones):
    """
    Calculate due dates for each milestone based on duration

    Args:
        start_date: Collaboration start date
        milestones: List of milestone objects with duration_days

    Returns:
        list: Milestones with calculated due_dates
    """
    current_date = start_date

    for milestone in milestones:
        duration = milestone.get('duration_days', 0)
        due_date = current_date + timedelta(days=duration)
        milestone['due_date'] = due_date
        current_date = due_date

    return milestones


def get_current_milestone(collaboration):
    """
    Get the current active milestone for a collaboration

    Args:
        collaboration: Collaboration object

    Returns:
        CollaborationMilestone or None
    """
    from app.models import CollaborationMilestone

    # First, check for in_progress milestone
    current = CollaborationMilestone.query.filter_by(
        collaboration_id=collaboration.id,
        status='in_progress'
    ).order_by(CollaborationMilestone.milestone_number).first()

    if current:
        return current

    # If no in_progress, get first pending
    current = CollaborationMilestone.query.filter_by(
        collaboration_id=collaboration.id,
        status='pending'
    ).order_by(CollaborationMilestone.milestone_number).first()

    return current


def calculate_collaboration_progress(collaboration):
    """
    Calculate progress percentage based on approved milestones

    Args:
        collaboration: Collaboration object

    Returns:
        int: Progress percentage (0-100)
    """
    from app.models import CollaborationMilestone

    total = CollaborationMilestone.query.filter_by(
        collaboration_id=collaboration.id
    ).count()

    if total == 0:
        return 0

    approved = CollaborationMilestone.query.filter_by(
        collaboration_id=collaboration.id,
        status='approved'
    ).count()

    return int((approved / total) * 100)


def can_submit_to_milestone(milestone):
    """
    Check if creator can submit deliverables to this milestone

    Args:
        milestone: CollaborationMilestone object

    Returns:
        tuple: (can_submit, reason)
    """
    if milestone.status == 'approved':
        return False, 'Milestone already approved'

    if milestone.status == 'completed':
        return False, 'Milestone already completed'

    # Check if previous milestone is approved
    from app.models import CollaborationMilestone

    if milestone.milestone_number > 1:
        previous = CollaborationMilestone.query.filter_by(
            collaboration_id=milestone.collaboration_id,
            milestone_number=milestone.milestone_number - 1
        ).first()

        if previous and previous.status != 'approved':
            return False, f'Must complete Milestone {previous.milestone_number} first'

    return True, None


def get_milestone_payment_breakdown(collaboration):
    """
    Get payment breakdown for all milestones

    Args:
        collaboration: Collaboration object

    Returns:
        dict: Payment breakdown by milestone
    """
    from app.models import CollaborationMilestone

    milestones = CollaborationMilestone.query.filter_by(
        collaboration_id=collaboration.id
    ).order_by(CollaborationMilestone.milestone_number).all()

    breakdown = {
        'total': float(collaboration.amount),
        'milestones': [],
        'paid': 0,
        'pending': 0
    }

    for milestone in milestones:
        milestone_data = {
            'number': milestone.milestone_number,
            'title': milestone.title,
            'price': float(milestone.price),
            'status': milestone.status,
            'escrow_release_date': milestone.escrow_release_date.isoformat() if milestone.escrow_release_date else None
        }

        breakdown['milestones'].append(milestone_data)

        if milestone.status == 'approved':
            breakdown['paid'] += float(milestone.price)
        else:
            breakdown['pending'] += float(milestone.price)

    return breakdown
