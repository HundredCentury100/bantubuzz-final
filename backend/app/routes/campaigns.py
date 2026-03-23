from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Campaign, BrandProfile, CreatorProfile, Package, CampaignProposal, CampaignMilestone, Collaboration, User, Booking
from app.models.campaign import campaign_packages
from app.utils.notifications import notify_campaign_application, notify_campaign_status

# Backward compatibility alias
CampaignApplication = CampaignProposal

bp = Blueprint('campaigns', __name__)


@bp.route('/', methods=['GET'])
@jwt_required()
def get_campaigns():
    """Get campaigns (filtered by user type)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')

        query = Campaign.query.filter_by(brand_id=brand.id)

        if status:
            query = query.filter_by(status=status)

        pagination = query.order_by(Campaign.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        campaigns = [campaign.to_dict() for campaign in pagination.items]

        return jsonify({
            'campaigns': campaigns,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['GET'])
def get_campaign(campaign_id):
    """Get a specific campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        return jsonify(campaign.to_dict(include_brand=True, include_packages=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_campaign():
    """Create a new campaign with Campaign Brief (brands only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        required_fields = ['title', 'description', 'category', 'participation_mode']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate participation mode
        participation_mode = data['participation_mode']
        if participation_mode not in ['packages', 'proposals']:
            return jsonify({'error': 'Invalid participation_mode. Must be "packages" or "proposals"'}), 400

        # For packages mode, budget is required; for proposals mode, budget range is required
        if participation_mode == 'packages' and 'budget' not in data:
            return jsonify({'error': 'Budget is required for packages mode'}), 400
        elif participation_mode == 'proposals' and ('budget_min' not in data or 'budget_max' not in data):
            return jsonify({'error': 'Budget range (budget_min and budget_max) required for proposals mode'}), 400

        # Create campaign with basic fields
        campaign = Campaign(
            brand_id=brand.id,
            title=data['title'],
            description=data['description'],
            objectives=data.get('objectives'),
            category=data['category'],
            requirements=data.get('requirements', {}),
            status=data.get('status', 'draft'),

            # Campaign Brief fields
            campaign_objective=data.get('campaign_objective'),
            target_audience=data.get('target_audience', {}),
            key_message=data.get('key_message'),
            required_mentions=data.get('required_mentions', {}),
            content_guidelines=data.get('content_guidelines'),

            # Participation mode
            participation_mode=participation_mode,
            allows_applications=data.get('allows_applications', True),

            # Timeline
            timeline_days=data.get('timeline_days'),

            # Targeting
            target_categories=data.get('target_categories', []),
            target_min_followers=data.get('target_min_followers'),
            target_max_followers=data.get('target_max_followers'),
            target_locations=data.get('target_locations', [])
        )

        # Set budget based on participation mode
        if participation_mode == 'packages':
            campaign.budget = data['budget']
        else:  # proposals mode
            campaign.budget_min = data['budget_min']
            campaign.budget_max = data['budget_max']

        # Set dates if provided
        if 'start_date' in data:
            campaign.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        if 'end_date' in data:
            campaign.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))

        db.session.add(campaign)
        db.session.flush()  # Get campaign.id

        # Create milestones if provided
        if 'milestones' in data and data['milestones']:
            for idx, milestone_data in enumerate(data['milestones'], start=1):
                milestone = CampaignMilestone(
                    campaign_id=campaign.id,
                    milestone_number=idx,
                    name=milestone_data['name'],
                    description=milestone_data.get('description'),
                    deliverables=milestone_data.get('deliverables', []),
                    duration_days=milestone_data.get('duration_days'),
                    due_date=datetime.fromisoformat(milestone_data['due_date'].replace('Z', '+00:00')) if 'due_date' in milestone_data else None
                )
                db.session.add(milestone)

        db.session.commit()

        return jsonify({
            'message': 'Campaign created successfully',
            'campaign': campaign.to_dict(include_milestones=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_id):
    """Update a campaign with Campaign Brief fields (owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()

        # Basic fields
        updatable_fields = ['title', 'description', 'objectives', 'budget',
                          'start_date', 'end_date', 'status', 'requirements', 'category']

        # Campaign Brief fields
        campaign_brief_fields = ['campaign_objective', 'target_audience', 'key_message',
                                'required_mentions', 'content_guidelines']

        # Participation and budget fields
        participation_fields = ['participation_mode', 'allows_applications',
                              'budget_min', 'budget_max', 'timeline_days']

        # Targeting fields
        targeting_fields = ['target_categories', 'target_min_followers',
                           'target_max_followers', 'target_locations']

        all_fields = updatable_fields + campaign_brief_fields + participation_fields + targeting_fields

        for field in all_fields:
            if field in data:
                if field in ['start_date', 'end_date']:
                    setattr(campaign, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                else:
                    setattr(campaign, field, data[field])

        # Handle milestones updates if provided
        if 'milestones' in data:
            # Delete existing milestones
            CampaignMilestone.query.filter_by(campaign_id=campaign_id).delete()

            # Create new milestones
            for idx, milestone_data in enumerate(data['milestones'], start=1):
                milestone = CampaignMilestone(
                    campaign_id=campaign.id,
                    milestone_number=idx,
                    name=milestone_data['name'],
                    description=milestone_data.get('description'),
                    deliverables=milestone_data.get('deliverables', []),
                    duration_days=milestone_data.get('duration_days'),
                    due_date=datetime.fromisoformat(milestone_data['due_date'].replace('Z', '+00:00')) if 'due_date' in milestone_data else None
                )
                db.session.add(milestone)

        db.session.commit()

        return jsonify({
            'message': 'Campaign updated successfully',
            'campaign': campaign.to_dict(include_milestones=True)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['DELETE'])
@jwt_required()
def delete_campaign(campaign_id):
    """Delete a campaign (owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        db.session.delete(campaign)
        db.session.commit()

        return jsonify({'message': 'Campaign deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# ============= CAMPAIGN PACKAGES MANAGEMENT =============

@bp.route('/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    """Add a package to a campaign (brand owner only) - creates a collaboration"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        package_id = data.get('package_id')

        if not package_id:
            return jsonify({'error': 'Package ID is required'}), 400

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        # Check if package is already in campaign
        if package in campaign.packages.all():
            return jsonify({'error': 'Package already added to campaign'}), 400

        campaign.packages.append(package)

        # Create booking first (required for payment processing)
        booking = Booking(
            package_id=package.id,
            campaign_id=campaign.id,
            creator_id=package.creator_id,
            brand_id=brand.id,
            amount=package.price,
            total_price=package.price,
            status='pending',  # Will be 'accepted' after payment
            payment_status='pending',  # User needs to pay
            payment_reference=f"PKG_{package.id}_C{campaign.id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        )
        db.session.add(booking)
        db.session.flush()  # Get booking.id

        # Create collaboration linked to booking
        collaboration = Collaboration(
            collaboration_type='package',
            booking_id=booking.id,
            brand_id=brand.id,
            creator_id=package.creator_id,
            title=f"{campaign.title} - {package.title}",
            description=package.description,
            amount=package.price,
            deliverables=package.deliverables or [],
            start_date=campaign.start_date,
            expected_completion_date=campaign.end_date,
            status='pending_payment',  # Changed from 'in_progress' until payment
            progress_percentage=0,
            notes=f"Package added to campaign: {campaign.title}"
        )
        db.session.add(collaboration)

        db.session.commit()

        return jsonify({
            'message': 'Package added to campaign successfully',
            'package': package.to_dict(),
            'collaboration': collaboration.to_dict(),
            'booking_id': booking.id,
            'requires_payment': True
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages/<int:package_id>', methods=['DELETE'])
@jwt_required()
def remove_package_from_campaign(campaign_id, package_id):
    """Remove a package from a campaign (brand owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404

        if package not in campaign.packages.all():
            return jsonify({'error': 'Package not in campaign'}), 400

        campaign.packages.remove(package)
        db.session.commit()

        return jsonify({'message': 'Package removed from campaign successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/packages', methods=['GET'])
def get_campaign_packages(campaign_id):
    """Get all packages in a campaign"""
    try:
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        packages = [pkg.to_dict() for pkg in campaign.packages.all()]

        return jsonify({
            'packages': packages,
            'count': len(packages)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============= CAMPAIGN APPLICATIONS (CREATORS) =============

@bp.route('/browse', methods=['GET'])
@jwt_required()
def browse_campaigns():
    """Get all active campaigns for creators to browse (Opportunities)"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        category = request.args.get('category')

        # Get active campaigns that allow applications (proposals mode or allows_applications=true)
        query = Campaign.query.filter_by(status='active').filter(
            db.or_(
                Campaign.participation_mode == 'proposals',
                Campaign.allows_applications == True
            )
        )

        if category:
            query = query.filter_by(category=category)

        # Apply intelligent filtering based on creator profile
        # Filter by target categories if campaign has them
        if creator.category:
            # Show campaigns that either have no target categories or include creator's category
            query = query.filter(
                db.or_(
                    Campaign.target_categories == None,
                    Campaign.target_categories == [],
                    Campaign.target_categories.contains([creator.category])
                )
            )

        # Filter by follower count if campaign has follower requirements
        creator_total_followers = getattr(creator, 'total_followers', 0)
        if creator_total_followers > 0:
            query = query.filter(
                db.or_(
                    db.and_(
                        Campaign.target_min_followers == None,
                        Campaign.target_max_followers == None
                    ),
                    db.and_(
                        db.or_(Campaign.target_min_followers == None, Campaign.target_min_followers <= creator_total_followers),
                        db.or_(Campaign.target_max_followers == None, Campaign.target_max_followers >= creator_total_followers)
                    )
                )
            )

        pagination = query.order_by(Campaign.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        campaigns = []
        for campaign in pagination.items:
            campaign_dict = campaign.to_dict(include_brand=True, include_milestones=True)
            # Check if creator has already applied
            existing_app = CampaignProposal.query.filter_by(
                campaign_id=campaign.id,
                creator_id=creator.id
            ).first()
            campaign_dict['has_applied'] = existing_app is not None
            if existing_app:
                campaign_dict['application_status'] = existing_app.status
            campaigns.append(campaign_dict)

        return jsonify({
            'campaigns': campaigns,
            'total': pagination.total,
            'pages': pagination.pages,
            'current_page': page
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_campaign(campaign_id):
    """Submit a proposal to a campaign (creators only) with pricing, deliverables, and timeline"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.status != 'active':
            return jsonify({'error': 'Campaign is not accepting applications'}), 400

        # Check if campaign allows applications
        if not campaign.allows_applications:
            return jsonify({'error': 'This campaign is not accepting proposals'}), 400

        # Check if already applied
        existing_proposal = CampaignProposal.query.filter_by(
            campaign_id=campaign_id,
            creator_id=creator.id
        ).first()

        if existing_proposal:
            return jsonify({'error': 'Already applied to this campaign'}), 400

        data = request.get_json()

        # Validate required fields
        if 'proposed_price' not in data:
            return jsonify({'error': 'Proposed price is required'}), 400

        if 'deliverables' not in data or not data['deliverables']:
            return jsonify({'error': 'At least one deliverable is required'}), 400

        # Validate proposed price is within budget range (if campaign has budget range)
        proposed_price = float(data['proposed_price'])
        if campaign.budget_min and proposed_price < float(campaign.budget_min):
            return jsonify({'error': f'Proposed price must be at least ${campaign.budget_min}'}), 400
        if campaign.budget_max and proposed_price > float(campaign.budget_max):
            return jsonify({'error': f'Proposed price must not exceed ${campaign.budget_max}'}), 400

        # Create proposal with new fields
        proposal = CampaignProposal(
            campaign_id=campaign_id,
            creator_id=creator.id,
            proposal_message=data.get('message', ''),  # Renamed from application_message
            proposed_price=proposed_price,
            deliverables=data['deliverables'],  # List of deliverables
            delivery_timeline_days=data.get('delivery_timeline_days'),  # New field
            status='pending'
        )

        db.session.add(proposal)
        db.session.commit()

        # Notify brand of new proposal
        brand_user = User.query.get(campaign.brand.user_id)
        if brand_user:
            notify_campaign_application(
                brand_id=brand_user.id,
                creator_name=creator.user.email if hasattr(creator.user, 'email') else 'A creator',
                campaign_id=campaign.id
            )

        return jsonify({
            'message': 'Proposal submitted successfully',
            'proposal': proposal.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/applications', methods=['GET'])
@jwt_required()
def get_campaign_applications(campaign_id):
    """Get all applications for a campaign (brand owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get applications with details
        applications = CampaignApplication.query.filter_by(
            campaign_id=campaign_id
        ).order_by(CampaignApplication.applied_at.desc()).all()

        result = [app.to_dict(include_relations=True) for app in applications]

        return jsonify({
            'applications': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/applications/<int:application_id>', methods=['GET'])
@jwt_required()
def get_application_details(campaign_id, application_id):
    """Get details of a specific campaign application"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        application = CampaignApplication.query.get(application_id)
        if not application or application.campaign_id != campaign_id:
            return jsonify({'error': 'Application not found'}), 404

        return jsonify(application.to_dict(include_relations=True)), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/applications/<int:application_id>', methods=['PATCH'])
@jwt_required()
def update_application_status(campaign_id, application_id):
    """Accept or reject a campaign proposal with brand notes (brand owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        proposal = CampaignProposal.query.get(application_id)
        if not proposal or proposal.campaign_id != campaign_id:
            return jsonify({'error': 'Proposal not found'}), 404

        data = request.get_json()
        status = data.get('status')

        if status not in ['accepted', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400

        # Update proposal status with new fields
        proposal.status = status
        proposal.brand_notes = data.get('brand_notes', '')  # New field for brand feedback
        proposal.reviewed_at = datetime.utcnow()  # New field to track when reviewed
        proposal.updated_at = datetime.utcnow()

        # If accepted, create a booking and collaboration
        if status == 'accepted':
            # Check if collaboration already exists
            existing_collab = Collaboration.query.filter_by(
                campaign_application_id=application_id
            ).first()

            if not existing_collab:
                # Create booking first (required for payment processing)
                booking = Booking(
                    campaign_id=campaign.id,
                    creator_id=proposal.creator_id,
                    brand_id=brand.id,
                    amount=proposal.proposed_price,
                    total_price=proposal.proposed_price,
                    status='pending',  # Will be 'accepted' after payment
                    payment_status='pending',  # User needs to pay
                    payment_reference=f"PROP_{application_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                )
                db.session.add(booking)
                db.session.flush()  # Get booking.id

                # Create collaboration linked to booking
                collaboration = Collaboration(
                    collaboration_type='campaign',
                    campaign_application_id=application_id,
                    booking_id=booking.id,
                    brand_id=brand.id,
                    creator_id=proposal.creator_id,
                    title=campaign.title,
                    description=campaign.description,
                    amount=proposal.proposed_price,
                    deliverables=proposal.deliverables,
                    start_date=campaign.start_date,
                    expected_completion_date=campaign.end_date,
                    status='pending_payment',  # Changed from 'in_progress' until payment
                    progress_percentage=0
                )
                db.session.add(collaboration)

                # Return booking_id in response for payment processing
                booking_id = booking.id

        db.session.commit()

        # Notify creator of proposal status change
        creator_user = User.query.get(proposal.creator.user_id)
        if creator_user:
            notify_campaign_status(
                user_id=creator_user.id,
                status=status,
                campaign_name=campaign.title,
                campaign_id=campaign.id
            )

        response_data = {
            'message': f'Proposal {status} successfully',
            'proposal': proposal.to_dict(include_relations=True)
        }

        # Include booking_id if proposal was accepted (for payment flow)
        if status == 'accepted' and 'booking_id' in locals():
            response_data['booking_id'] = booking_id
            response_data['requires_payment'] = True

        return jsonify(response_data), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/my-applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    """Get all campaign applications for the logged-in creator"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        # Get limit parameter for dashboard (default all applications)
        limit = request.args.get('limit', type=int)
        status_filter = request.args.get('status')

        # Query applications with campaign details
        query = CampaignApplication.query.filter_by(creator_id=creator.id)

        if status_filter:
            query = query.filter_by(status=status_filter)

        query = query.order_by(CampaignApplication.applied_at.desc())

        if limit:
            query = query.limit(limit)

        applications = query.all()

        # Return applications with full campaign details
        result = [app.to_dict(include_relations=True) for app in applications]

        return jsonify({
            'applications': result,
            'count': len(result)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
