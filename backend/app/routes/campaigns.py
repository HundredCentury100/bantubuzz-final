"""Campaign routes - Rebuilt with proper money handling and payment flow

CRITICAL RULES:
1. Parse money as Decimal(str(value)) - NO float()
2. Use datetime.now(timezone.utc) for ALL datetime operations
3. Handle budget fields correctly based on participation_mode
4. Payment-gated flow: Accept proposal → Create booking → Payment → Create collaboration
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import text, or_, and_
from app import db
from app.models.campaign import Campaign, CampaignMilestone, CampaignProposal, campaign_packages
from app.models.user import User
from app.models.brand_profile import BrandProfile
from app.models.creator_profile import CreatorProfile
from app.models.package import Package
from app.models.booking import Booking
from app.models.collaboration import Collaboration
from app.services.workspace_service import get_request_workspace_id, require_workspace_access, scope_query_to_workspace
from app.utils.notifications import create_notification

bp = Blueprint('campaigns', __name__, url_prefix='/api/campaigns')


# ========================================
# BRAND ENDPOINTS - Campaign Management
# ========================================

@bp.route('/', methods=['POST'])
@jwt_required()
def create_campaign():
    """
    Brand creates new campaign
    CRITICAL: Handle budget fields based on participation_mode
    """
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # ENFORCE: Check if brand can create more campaigns this month
        from app.services.subscription_enforcement_service import SubscriptionEnforcementService

        can_proceed, error_msg, usage = SubscriptionEnforcementService.can_create_campaign(user_id)

        if not can_proceed:
            return jsonify({
                'error': error_msg,
                'current_usage': usage,
                'upgrade_required': True,
                'upgrade_prompt': SubscriptionEnforcementService.get_upgrade_prompt(
                    user_id, 'brand', 'campaigns_per_month'
                )
            }), 403

        data = request.get_json()
        workspace_id = get_request_workspace_id(data)
        workspace, workspace_error, workspace_status = require_workspace_access(
            user_id,
            workspace_id,
            'can_manage_campaigns',
        )
        if workspace_error:
            return jsonify({'error': workspace_error}), workspace_status

        # Validate participation mode
        participation_mode = data.get('participation_mode', 'proposals')
        if participation_mode not in ['packages', 'proposals', 'both']:
            return jsonify({'error': 'Invalid participation mode'}), 400

        # Parse dates as timezone-aware
        try:
            start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        except (ValueError, KeyError) as e:
            return jsonify({'error': f'Invalid date format: {str(e)}'}), 400

        application_deadline = None
        if data.get('application_deadline'):
            try:
                application_deadline = datetime.fromisoformat(data['application_deadline'].replace('Z', '+00:00'))
            except ValueError:
                return jsonify({'error': 'Invalid application_deadline format'}), 400

        # CRITICAL: Handle budget fields based on participation_mode
        budget = None
        budget_min = None
        budget_max = None

        if participation_mode == 'packages':
            # Packages mode: budget only (no min/max)
            if not data.get('budget'):
                return jsonify({'error': 'Budget required for packages mode'}), 400
            budget = Decimal(str(data['budget']))

        elif participation_mode == 'proposals':
            # Proposals mode: budget_min and budget_max only (no budget)
            if not data.get('budget_min') or not data.get('budget_max'):
                return jsonify({'error': 'Budget range required for proposals mode'}), 400
            budget_min = Decimal(str(data['budget_min']))
            budget_max = Decimal(str(data['budget_max']))

            if budget_min > budget_max:
                return jsonify({'error': 'Budget min cannot be greater than budget max'}), 400

        elif participation_mode == 'both':
            # Both mode: all three fields required
            if not data.get('budget') or not data.get('budget_min') or not data.get('budget_max'):
                return jsonify({'error': 'Budget and budget range required for both mode'}), 400
            budget = Decimal(str(data['budget']))
            budget_min = Decimal(str(data['budget_min']))
            budget_max = Decimal(str(data['budget_max']))

        # CRITICAL: Convert empty strings to None for integer fields
        target_min_followers = data.get('target_min_followers')
        if target_min_followers == '' or target_min_followers is None:
            target_min_followers = None
        else:
            target_min_followers = int(target_min_followers)

        target_max_followers = data.get('target_max_followers')
        if target_max_followers == '' or target_max_followers is None:
            target_max_followers = None
        else:
            target_max_followers = int(target_max_followers)

        timeline_days = data.get('timeline_days')
        if timeline_days == '' or timeline_days is None:
            timeline_days = None
        else:
            timeline_days = int(timeline_days)

        # Create campaign
        campaign = Campaign(
            brand_id=brand.id,
            workspace_id=workspace.id if workspace else None,
            brief_id=data.get('brief_id'),
            title=data['title'],
            description=data['description'],
            category=data.get('category'),
            campaign_objective=data.get('campaign_objective'),
            target_audience=data.get('target_audience'),
            content_guidelines=data.get('content_guidelines'),
            participation_mode=participation_mode,
            allows_applications=(participation_mode in ['proposals', 'both']),
            allows_packages=(participation_mode in ['packages', 'both']),
            requires_milestones=data.get('requires_milestones', True),
            budget=budget,
            budget_min=budget_min,
            budget_max=budget_max,
            start_date=start_date,
            end_date=end_date,
            application_deadline=application_deadline,
            timeline_days=timeline_days,
            target_categories=data.get('target_categories', []),
            target_locations=data.get('target_locations', []),
            target_min_followers=target_min_followers,
            target_max_followers=target_max_followers,
            status=data.get('status', 'draft')
        )

        db.session.add(campaign)
        db.session.flush()  # Get campaign.id

        # Create milestones if provided
        if data.get('milestones'):
            for milestone_data in data['milestones']:
                budget_allocation = None
                if milestone_data.get('budget_allocation'):
                    budget_allocation = Decimal(str(milestone_data['budget_allocation']))
                due_date = None
                if milestone_data.get('due_date'):
                    due_date = datetime.fromisoformat(milestone_data['due_date'].replace('Z', '+00:00'))

                milestone = CampaignMilestone(
                    campaign_id=campaign.id,
                    milestone_number=milestone_data['milestone_number'],
                    name=milestone_data['name'],
                    description=milestone_data.get('description'),
                    deliverables=milestone_data.get('deliverables', []),
                    budget_allocation=budget_allocation,
                    duration_days=milestone_data.get('duration_days'),
                    due_date=due_date
                )
                db.session.add(milestone)

        db.session.commit()

        return jsonify({
            'message': 'Campaign created successfully',
            'campaign': campaign.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['GET'])
@jwt_required()
def get_campaigns():
    """Get brand's campaigns"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Get filter parameters
        status = request.args.get('status')
        workspace_id = get_request_workspace_id()
        workspace, workspace_error, workspace_status = require_workspace_access(user_id, workspace_id)
        if workspace_error:
            return jsonify({'error': workspace_error}), workspace_status

        query = Campaign.query.filter_by(brand_id=brand.id)
        query = scope_query_to_workspace(query, Campaign, workspace.id if workspace else None)

        if status:
            query = query.filter_by(status=status)

        campaigns = query.order_by(Campaign.created_at.desc()).all()

        return jsonify({
            'campaigns': [c.to_dict() for c in campaigns]
        }), 200

    except Exception as e:
        print(f"Error fetching campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign(campaign_id):
    """Get campaign details"""
    try:
        user_id = get_jwt_identity()
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404
        user = User.query.get(int(user_id))
        if user and user.user_type == 'brand':
            brand = BrandProfile.query.filter_by(user_id=user_id).first()
            if not brand or campaign.brand_id != brand.id:
                return jsonify({'error': 'Campaign not found'}), 404
            if campaign.workspace_id:
                _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id)
                if workspace_error:
                    return jsonify({'error': workspace_error}), workspace_status

        campaign_data = campaign.to_dict(include_brand=True)

        if user and user.user_type == 'creator':
            creator = CreatorProfile.query.filter_by(user_id=user_id).first()
            if creator:
                proposal = CampaignProposal.query.filter_by(
                    campaign_id=campaign_id,
                    creator_id=creator.id
                ).first()
                campaign_data['has_applied'] = proposal is not None
                campaign_data['application_status'] = proposal.status if proposal else None

        return jsonify(campaign_data), 200

    except Exception as e:
        print(f"Error fetching campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/publish', methods=['POST'])
@jwt_required()
def publish_campaign(campaign_id):
    """Publish a campaign for creator applications after validating targeting settings."""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_manage_campaigns')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        if not campaign.allows_applications:
            return jsonify({'error': 'This campaign is not configured to accept applications'}), 400

        if campaign.application_deadline:
            now = datetime.now(timezone.utc)
            deadline = campaign.application_deadline
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
            if deadline <= now:
                return jsonify({'error': 'Application deadline must be in the future'}), 400

        campaign.status = 'active'
        campaign.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Campaign published for applications',
            'campaign': campaign.to_dict(include_brand=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error publishing campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_id):
    """Update campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404
        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_manage_campaigns')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        data = request.get_json()

        # Update basic fields
        if 'title' in data:
            campaign.title = data['title']
        if 'description' in data:
            campaign.description = data['description']
        if 'category' in data:
            campaign.category = data['category']
        if 'campaign_objective' in data:
            campaign.campaign_objective = data['campaign_objective']
        if 'target_audience' in data:
            campaign.target_audience = data['target_audience']
        if 'content_guidelines' in data:
            campaign.content_guidelines = data['content_guidelines']
        if 'status' in data:
            campaign.status = data['status']
        if 'target_categories' in data:
            campaign.target_categories = data['target_categories']
        if 'target_locations' in data:
            campaign.target_locations = data['target_locations']

        # CRITICAL: Convert empty strings to None for integer fields
        if 'target_min_followers' in data:
            val = data['target_min_followers']
            campaign.target_min_followers = None if (val == '' or val is None) else int(val)
        if 'target_max_followers' in data:
            val = data['target_max_followers']
            campaign.target_max_followers = None if (val == '' or val is None) else int(val)
        if 'timeline_days' in data:
            val = data.get('timeline_days')
            campaign.timeline_days = None if (val == '' or val is None) else int(val)

        # Update dates
        if 'start_date' in data:
            campaign.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'end_date' in data:
            campaign.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        if 'application_deadline' in data:
            if data['application_deadline']:
                campaign.application_deadline = datetime.fromisoformat(data['application_deadline'].replace('Z', '+00:00'))
            else:
                campaign.application_deadline = None

        if 'participation_mode' in data:
            participation_mode = data.get('participation_mode') or campaign.participation_mode
            if participation_mode not in ['packages', 'proposals', 'both']:
                return jsonify({'error': 'Invalid participation mode'}), 400
            campaign.participation_mode = participation_mode
            campaign.allows_applications = participation_mode in ['proposals', 'both']
            campaign.allows_packages = participation_mode in ['packages', 'both']

        if 'requires_milestones' in data:
            campaign.requires_milestones = bool(data.get('requires_milestones'))

        participation_mode = campaign.participation_mode
        if participation_mode in ['packages', 'both']:
            if 'budget' in data:
                campaign.budget = Decimal(str(data['budget'])) if data.get('budget') not in ['', None] else None
        else:
            campaign.budget = None

        if participation_mode in ['proposals', 'both']:
            if 'budget_min' in data:
                campaign.budget_min = Decimal(str(data['budget_min'])) if data.get('budget_min') not in ['', None] else None
            if 'budget_max' in data:
                campaign.budget_max = Decimal(str(data['budget_max'])) if data.get('budget_max') not in ['', None] else None
            if campaign.budget_min is not None and campaign.budget_max is not None and campaign.budget_min > campaign.budget_max:
                return jsonify({'error': 'Budget min cannot be greater than budget max'}), 400
        else:
            campaign.budget_min = None
            campaign.budget_max = None

        if 'milestones' in data:
            CampaignMilestone.query.filter_by(campaign_id=campaign.id).delete()
            for milestone_data in data.get('milestones') or []:
                budget_allocation = None
                if milestone_data.get('budget_allocation') not in ['', None]:
                    budget_allocation = Decimal(str(milestone_data['budget_allocation']))
                due_date = None
                if milestone_data.get('due_date'):
                    due_date = datetime.fromisoformat(milestone_data['due_date'].replace('Z', '+00:00'))

                milestone = CampaignMilestone(
                    campaign_id=campaign.id,
                    milestone_number=milestone_data['milestone_number'],
                    name=milestone_data['name'],
                    description=milestone_data.get('description'),
                    deliverables=milestone_data.get('deliverables', []),
                    budget_allocation=budget_allocation,
                    duration_days=milestone_data.get('duration_days'),
                    due_date=due_date
                )
                db.session.add(milestone)

        campaign.updated_at = datetime.now(timezone.utc)
        db.session.commit()

        return jsonify({
            'message': 'Campaign updated successfully',
            'campaign': campaign.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['DELETE'])
@jwt_required()
def delete_campaign(campaign_id):
    """Delete campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404
        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_manage_campaigns')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        db.session.delete(campaign)
        db.session.commit()

        return jsonify({'message': 'Campaign deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting campaign: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ========================================
# CREATOR ENDPOINTS - Browse Opportunities
# ========================================

@bp.route('/browse', methods=['GET'])
@jwt_required()
def browse_campaigns():
    """
    Creator browsing active campaigns (opportunities)
    CRITICAL: Use timezone-aware datetime for comparisons
    """
    try:
        user_id = get_jwt_identity()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()
        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        now = datetime.now(timezone.utc)
        creator_categories = set(creator.categories or [])
        creator_locations = {
            value.strip().lower()
            for value in [creator.location, creator.city, creator.country]
            if value and value.strip()
        }
        creator_followers = creator.get_total_followers()

        query = Campaign.query.filter(
            Campaign.status == 'active',
            Campaign.allows_applications == True,
            or_(
                Campaign.application_deadline == None,
                Campaign.application_deadline > now
            )
        )

        participation_mode = request.args.get('mode')
        if participation_mode == 'packages':
            query = query.filter_by(allows_packages=True)
        elif participation_mode == 'proposals':
            query = query.filter_by(allows_applications=True)

        category = request.args.get('category')
        if category:
            query = query.filter(or_(
                Campaign.target_categories == None,
                Campaign.target_categories == [],
                Campaign.target_categories.contains([category])
            ))

        location = request.args.get('location')
        if location:
            query = query.filter(or_(
                Campaign.target_locations == None,
                Campaign.target_locations == [],
                Campaign.target_locations.contains([location])
            ))

        campaigns = query.order_by(
            Campaign.application_deadline.asc().nullslast(),
            Campaign.created_at.desc()
        ).all()

        matched_campaigns = []
        for campaign in campaigns:
            target_categories = set(campaign.target_categories or [])
            if target_categories and creator_categories and target_categories.isdisjoint(creator_categories):
                continue
            if target_categories and not creator_categories:
                continue

            target_locations = {
                value.strip().lower()
                for value in (campaign.target_locations or [])
                if value and value.strip()
            }
            if target_locations and creator_locations and target_locations.isdisjoint(creator_locations):
                continue
            if target_locations and not creator_locations:
                continue

            if campaign.target_min_followers is not None and creator_followers < campaign.target_min_followers:
                continue
            if campaign.target_max_followers is not None and creator_followers > campaign.target_max_followers:
                continue

            proposal = CampaignProposal.query.filter_by(
                campaign_id=campaign.id,
                creator_id=creator.id
            ).first()
            campaign_data = campaign.to_dict(include_brand=True)
            campaign_data['has_applied'] = proposal is not None
            campaign_data['application_status'] = proposal.status if proposal else None
            matched_campaigns.append(campaign_data)

        return jsonify({
            'campaigns': matched_campaigns
        }), 200

    except Exception as e:
        print(f"Error browsing campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_campaign(campaign_id):
    """
    Creator applies to campaign (creates proposal)
    CRITICAL: Use timezone-aware datetime for deadline check
    """
    try:
        user_id = get_jwt_identity()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.status != 'active':
            return jsonify({'error': 'Campaign is not active'}), 400

        if not campaign.allows_applications:
            return jsonify({'error': 'Campaign does not accept applications'}), 400

        # Check application deadline (timezone-aware comparison)
        if campaign.application_deadline:
            now = datetime.now(timezone.utc)
            if now > campaign.application_deadline:
                return jsonify({'error': 'Application deadline has passed'}), 400

        # Check if already applied
        existing = CampaignProposal.query.filter_by(
            campaign_id=campaign_id,
            creator_id=creator.id
        ).first()

        if existing:
            return jsonify({'error': 'You have already applied to this campaign'}), 400

        data = request.get_json()

        # Parse proposed price (no rounding!)
        if not data.get('proposed_price'):
            return jsonify({'error': 'Proposed price is required'}), 400

        proposed_price = Decimal(str(data['proposed_price']))

        # Validate price is within budget range
        if campaign.budget_min and proposed_price < campaign.budget_min:
            return jsonify({'error': f'Proposed price must be at least ${campaign.budget_min}'}), 400
        if campaign.budget_max and proposed_price > campaign.budget_max:
            return jsonify({'error': f'Proposed price cannot exceed ${campaign.budget_max}'}), 400

        # Create proposal
        proposal = CampaignProposal(
            campaign_id=campaign_id,
            creator_id=creator.id,
            status='pending',
            proposed_price=proposed_price,
            proposal_message=data.get('proposal_message'),
            deliverables=data.get('deliverables'),  # Legacy field
            delivery_timeline_days=data.get('delivery_timeline_days'),
            pricing_mode=data.get('pricing_mode', 'total'),
            milestones=data.get('milestones', [])
        )

        db.session.add(proposal)
        db.session.commit()

        creator_name = creator.username or creator.display_name or 'A creator'
        create_notification(
            campaign.brand.user_id,
            'campaign',
            'New Campaign Application',
            f'{creator_name} applied to your campaign "{campaign.title}".',
            f'/brand/campaigns/{campaign.id}?tab=applications'
        )

        return jsonify({
            'message': 'Application submitted successfully',
            'proposal': proposal.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error applying to campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/my-applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    """Get creator's campaign applications"""
    try:
        user_id = get_jwt_identity()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Get filter parameters
        status = request.args.get('status')

        query = CampaignProposal.query.filter_by(creator_id=creator.id)

        if status:
            query = query.filter_by(status=status)

        proposals = query.order_by(CampaignProposal.applied_at.desc()).all()

        return jsonify({
            'applications': [p.to_dict(include_campaign=True) for p in proposals]
        }), 200

    except Exception as e:
        print(f"Error fetching applications: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ========================================
# BRAND ENDPOINTS - Manage Proposals
# ========================================

@bp.route('/<int:campaign_id>/proposals', methods=['GET'])
@jwt_required()
def get_campaign_proposals(campaign_id):
    """Brand views proposals for their campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404
        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_manage_campaigns')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        proposals = CampaignProposal.query.filter_by(campaign_id=campaign_id).order_by(
            CampaignProposal.applied_at.asc()
        ).all()

        return jsonify({
            'proposals': [p.to_dict(include_creator=True) for p in proposals],
            'pending_count': sum(1 for p in proposals if p.status == 'pending')
        }), 200

    except Exception as e:
        print(f"Error fetching proposals: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/proposals/<int:proposal_id>/accept', methods=['POST'])
@jwt_required()
def accept_proposal(proposal_id):
    """
    Brand accepts proposal - CREATES BOOKING (not collaboration yet)
    Collaboration only created after payment confirmed
    """
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403
        if proposal.campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, proposal.campaign.workspace_id, 'can_manage_campaigns')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        if proposal.status != 'pending':
            return jsonify({'error': 'Proposal already processed'}), 400

        # Create booking (payment required before collaboration)
        booking = Booking(
            booking_type='campaign_proposal',
            brand_id=brand.id,
            creator_id=proposal.creator_id,
            campaign_id=proposal.campaign_id,
            workspace_id=proposal.campaign.workspace_id,
            amount=proposal.proposed_price,
            total_price=proposal.proposed_price,
            status='pending',
            payment_status='pending',
            payment_method='paynow',
            notes=f"Campaign proposal for: {proposal.campaign.title}"
        )

        db.session.add(booking)
        db.session.flush()  # Get booking.id

        # Link booking to proposal
        proposal.booking_id = booking.id
        proposal.status = 'awaiting_payment'

        db.session.commit()

        return jsonify({
            'message': 'Booking created. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to': f'/bookings/{booking.id}/payment'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error accepting proposal: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/proposals/<int:proposal_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_proposal_payment(proposal_id):
    """
    Called AFTER payment confirmed - Creates collaboration
    """
    try:
        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if not proposal.booking_id:
            return jsonify({'error': 'No booking found'}), 400

        booking = Booking.query.get(proposal.booking_id)
        if booking.payment_status not in ['paid', 'verified']:
            return jsonify({'error': 'Payment not confirmed'}), 400

        # Update proposal status
        proposal.status = 'accepted'
        proposal.reviewed_at = datetime.now(timezone.utc)

        # Create collaboration NOW (after payment)
        from app.models.collaboration_milestone import CollaborationMilestone

        collaboration = Collaboration(
            collaboration_type='campaign',
            campaign_id=proposal.campaign_id,
            booking_id=booking.id,
            brand_id=proposal.campaign.brand_id,
            workspace_id=booking.workspace_id or proposal.campaign.workspace_id,
            creator_id=proposal.creator_id,
            title=proposal.campaign.title,
            description=proposal.campaign.description,
            amount=proposal.proposed_price,
            deliverables=proposal.deliverables,  # Legacy field for backward compatibility
            start_date=proposal.campaign.start_date,
            expected_completion_date=proposal.campaign.end_date,
            status='in_progress',
            progress_percentage=0
        )

        db.session.add(collaboration)
        db.session.flush()  # Get collaboration.id

        # Create collaboration milestones from proposal milestones
        if proposal.milestones and len(proposal.milestones) > 0:
            for milestone_data in proposal.milestones:
                # Parse due date if present
                due_date = None
                if milestone_data.get('due_date'):
                    try:
                        due_date_str = milestone_data['due_date']
                        if isinstance(due_date_str, str):
                            # Parse ISO date string
                            due_date = datetime.fromisoformat(due_date_str.split('T')[0]).date()
                    except (ValueError, AttributeError):
                        pass

                # Parse milestone price (handle per_milestone pricing)
                milestone_price = Decimal('0')
                if proposal.pricing_mode == 'per_milestone' and milestone_data.get('price'):
                    milestone_price = Decimal(str(milestone_data['price']))
                else:
                    # For total pricing, divide evenly among milestones
                    milestone_price = proposal.proposed_price / len(proposal.milestones)

                # Create collaboration milestone
                collab_milestone = CollaborationMilestone(
                    collaboration_id=collaboration.id,
                    milestone_number=milestone_data.get('milestone_number', 1),
                    title=milestone_data.get('name', f"Milestone {milestone_data.get('milestone_number', 1)}"),
                    description='',
                    expected_deliverables=milestone_data.get('deliverables', []),
                    status='pending',
                    price=milestone_price,
                    due_date=due_date
                )
                db.session.add(collab_milestone)

        db.session.commit()

        return jsonify({
            'message': 'Payment confirmed, collaboration started',
            'collaboration_id': collaboration.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error completing proposal payment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/proposals/<int:proposal_id>/reject', methods=['POST'])
@jwt_required()
def reject_proposal(proposal_id):
    """Brand rejects proposal"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal:
            return jsonify({'error': 'Proposal not found'}), 404

        if proposal.campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if proposal.status != 'pending':
            return jsonify({'error': 'Proposal already processed'}), 400

        data = request.get_json()

        proposal.status = 'rejected'
        proposal.brand_notes = data.get('brand_notes')
        proposal.reviewed_at = datetime.now(timezone.utc)

        db.session.commit()

        create_notification(
            proposal.creator.user_id,
            'campaign',
            'Application Not Selected',
            f'Your application to "{proposal.campaign.title}" was not selected.',
            '/creator/applications'
        )

        return jsonify({
            'message': 'Proposal rejected'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error rejecting proposal: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ========================================
# BRAND ENDPOINTS - Package Management
# ========================================

@bp.route('/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    """
    Brand adds package to campaign - CREATES BOOKING (not collaboration yet)
    """
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        if not campaign.allows_packages:
            return jsonify({'error': 'Campaign does not allow packages'}), 400

        data = request.get_json()
        package_id = data.get('package_id')

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        # Check if already added
        if package in campaign.packages:
            return jsonify({'error': 'Package already added to campaign'}), 400

        # Create booking (payment required before adding package)
        booking = Booking(
            booking_type='campaign_package',
            package_id=package.id,
            campaign_id=campaign.id,
            workspace_id=campaign.workspace_id,
            brand_id=brand.id,
            creator_id=package.creator_id,
            amount=package.price,
            total_price=package.price,
            status='pending',
            payment_status='pending',
            payment_method='paynow',
            notes=f"Package '{package.title}' for campaign: {campaign.title}"
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({
            'message': 'Booking created. Please proceed to payment.',
            'booking_id': booking.id,
            'redirect_to': f'/bookings/{booking.id}/payment'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error adding package to campaign: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages/<int:package_id>/complete-payment', methods=['POST'])
@jwt_required()
def complete_package_payment(campaign_id, package_id):
    """
    Called AFTER payment confirmed - Adds package and creates collaboration
    """
    try:
        data = request.get_json()
        booking_id = data.get('booking_id')

        booking = Booking.query.get(booking_id)
        if not booking or booking.payment_status not in ['paid', 'verified']:
            return jsonify({'error': 'Payment not confirmed'}), 400

        campaign = Campaign.query.get(campaign_id)
        package = Package.query.get(package_id)

        if not campaign or not package:
            return jsonify({'error': 'Campaign or package not found'}), 404

        # Add package to campaign NOW (after payment)
        campaign.packages.append(package)

        # Update association table with booking_id
        db.session.execute(text("""
            UPDATE campaign_packages
            SET booking_id = :booking_id
            WHERE campaign_id = :campaign_id AND package_id = :package_id
        """), {'booking_id': booking_id, 'campaign_id': campaign_id, 'package_id': package_id})

        # Create collaboration
        collaboration = Collaboration(
            collaboration_type='package',
            campaign_id=campaign_id,
            package_id=package_id,
            booking_id=booking.id,
            brand_id=campaign.brand_id,
            workspace_id=booking.workspace_id or campaign.workspace_id,
            creator_id=package.creator_id,
            title=f"{campaign.title} - {package.title}",
            description=package.description,
            amount=package.price,
            deliverables=package.deliverables or [],
            start_date=campaign.start_date,
            expected_completion_date=campaign.end_date,
            status='in_progress',
            progress_percentage=0
        )

        db.session.add(collaboration)
        db.session.commit()

        return jsonify({
            'message': 'Payment confirmed, package added to campaign',
            'collaboration_id': collaboration.id
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error completing package payment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/available-packages', methods=['GET'])
@jwt_required()
def get_available_packages_for_campaign(campaign_id):
    """
    Get all available packages that can be added to campaign with enhanced creator details
    Perfect for package browsing/selection UI with creator stats
    """
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        # Get all active packages
        query = Package.query.filter_by(is_active=True)

        # Filter by category if campaign has target categories
        if campaign.target_categories and len(campaign.target_categories) > 0:
            # Get creators in matching categories
            creators_in_category = CreatorProfile.query.filter(
                CreatorProfile.categories.overlap(campaign.target_categories)
            ).all()
            creator_ids = [c.id for c in creators_in_category]
            query = query.filter(Package.creator_id.in_(creator_ids))

        packages = query.all()

        # Build enhanced package data with creator stats
        enhanced_packages = []

        for package in packages:
            package_data = package.to_dict()

            # Get creator with enhanced stats
            creator = package.creator
            if creator:
                # Get total followers from connected platforms
                total_followers = creator.get_total_followers()

                # Get platform breakdown
                platform_stats = creator.get_platform_stats()

                # Calculate average engagement rate
                avg_engagement = creator.get_average_engagement_rate()

                # Enhanced creator data
                package_data['creator'] = {
                    'id': creator.id,
                    'user_id': creator.user_id,
                    'username': creator.username,
                    'display_name': creator.username or 'Creator',
                    'profile_picture': creator.profile_picture,
                    'profile_picture_sizes': creator.profile_picture_sizes or {},
                    'bio': creator.bio,
                    'total_followers': total_followers,
                    'engagement_rate': avg_engagement,
                    'verified': creator.is_verified,
                    'is_featured': creator.is_featured,
                    'location': creator.location,
                    'city': creator.city,
                    'country': creator.country,
                    'categories': creator.categories or [],
                    'platforms': platform_stats,  # Detailed platform breakdown
                    'badges': creator.get_badges()
                }

            enhanced_packages.append(package_data)

        return jsonify({
            'packages': enhanced_packages,
            'count': len(enhanced_packages)
        }), 200

    except Exception as e:
        print(f"Error fetching available packages: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages', methods=['GET'])
@jwt_required()
def get_campaign_packages(campaign_id):
    """
    Get packages added to campaign with enhanced creator details
    Includes: follower counts, engagement rates, profile picture, bio
    """
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        # Build enhanced package data with creator stats
        enhanced_packages = []

        for package in campaign.packages:
            package_data = package.to_dict()

            # Get creator profile with stats
            creator = package.creator
            if creator:
                # Calculate engagement rate (if metrics available)
                engagement_rate = 0.0
                avg_views = 0

                if creator.total_posts and creator.total_posts > 0:
                    total_engagement = (creator.total_likes or 0) + (creator.total_comments or 0)
                    if creator.follower_count and creator.follower_count > 0:
                        engagement_rate = (total_engagement / creator.total_posts) / creator.follower_count * 100

                # Get average views per post
                if creator.total_posts and creator.total_posts > 0 and creator.total_views:
                    avg_views = int(creator.total_views / creator.total_posts)

                # Enhanced creator data
                package_data['creator'] = {
                    'id': creator.id,
                    'user_id': creator.user_id,
                    'display_name': creator.display_name,
                    'profile_picture': creator.profile_picture,
                    'bio': creator.bio,
                    'follower_count': creator.follower_count or 0,
                    'following_count': creator.following_count or 0,
                    'total_posts': creator.total_posts or 0,
                    'total_likes': creator.total_likes or 0,
                    'total_comments': creator.total_comments or 0,
                    'total_views': creator.total_views or 0,
                    'avg_views': avg_views,
                    'engagement_rate': round(engagement_rate, 2),
                    'category': creator.category,
                    'location': creator.location,
                    'verified': getattr(creator, 'verified', False),
                    'rating': round(creator.average_rating, 1) if creator.average_rating else 0.0,
                    'total_reviews': creator.total_reviews or 0,
                }

            enhanced_packages.append(package_data)

        return jsonify({
            'packages': enhanced_packages,
            'count': len(enhanced_packages)
        }), 200

    except Exception as e:
        print(f"Error fetching campaign packages: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages/<int:package_id>', methods=['DELETE'])
@jwt_required()
def remove_package_from_campaign(campaign_id, package_id):
    """Remove package from campaign"""
    try:
        user_id = get_jwt_identity()
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found'}), 404

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        if package not in campaign.packages:
            return jsonify({'error': 'Package not in campaign'}), 400

        campaign.packages.remove(package)
        db.session.commit()

        return jsonify({
            'message': 'Package removed from campaign'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error removing package: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ========================================
# ANALYTICS ENDPOINTS - Performance & Audience
# ========================================

@bp.route('/<int:campaign_id>/performance', methods=['GET'])
@jwt_required()
def get_campaign_performance(campaign_id):
    """
    Get campaign performance analytics
    Returns: Overview metrics, creator performance, platform breakdown, timeline
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or unauthorized'}), 404
        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_view_analytics')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        # Get performance analytics
        from app.services.campaign_analytics_service import campaign_analytics_service
        performance = campaign_analytics_service.get_campaign_performance(campaign_id)

        if not performance:
            return jsonify({'error': 'Campaign not found'}), 404

        return jsonify(performance), 200

    except Exception as e:
        print(f"Error getting campaign performance: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/audience', methods=['GET'])
@jwt_required()
def get_campaign_audience(campaign_id):
    """
    Get aggregated audience demographics for creators in a campaign

    Combines audience data from all creators who have collaborations in this campaign
    """
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or unauthorized'}), 404
        if campaign.workspace_id:
            _, workspace_error, workspace_status = require_workspace_access(user_id, campaign.workspace_id, 'can_view_analytics')
            if workspace_error:
                return jsonify({'error': workspace_error}), workspace_status

        # Get all collaborations for this campaign
        collaborations = Collaboration.query.filter_by(campaign_id=campaign_id).all()

        if not collaborations:
            return jsonify({'error': 'No collaborations found for this campaign'}), 404

        # Get ThunziAI platform IDs for all creators in collaborations
        from app.models.thunzi_account import ThunziAccount
        from app.services.thunzi_service import thunzi_service

        platform_ids = []

        for collab in collaborations:
            thunzi_account = ThunziAccount.query.filter_by(
                bantubuzz_user_id=collab.creator.user_id,
                bantubuzz_user_type='creator'
            ).first()

            if thunzi_account and thunzi_account.thunzi_creator_id:
                thunzi_service.login()
                platforms = thunzi_service.get_creator_platforms(thunzi_account.thunzi_creator_id)
                platform_ids.extend([p['id'] for p in platforms if p.get('isConnected')])

        if not platform_ids:
            return jsonify({'error': 'No platform data available'}), 404

        # Get aggregated audience data
        audience_data = thunzi_service.get_aggregated_audience(platform_ids)

        if not audience_data:
            return jsonify({'error': 'No audience data available'}), 404

        return jsonify(audience_data), 200

    except Exception as e:
        print(f"Error getting campaign audience: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
