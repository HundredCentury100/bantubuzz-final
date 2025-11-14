from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Campaign, BrandProfile, CreatorProfile, Package, CampaignApplication, Collaboration
from app.models.campaign import campaign_packages

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
    """Create a new campaign (brands only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        required_fields = ['title', 'description', 'budget', 'start_date', 'end_date', 'category']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        campaign = Campaign(
            brand_id=brand.id,
            title=data['title'],
            description=data['description'],
            objectives=data.get('objectives'),
            budget=data['budget'],
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')),
            end_date=datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')),
            category=data['category'],
            requirements=data.get('requirements', {}),
            status=data.get('status', 'draft')
        )

        db.session.add(campaign)
        db.session.commit()

        return jsonify({
            'message': 'Campaign created successfully',
            'campaign': campaign.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>', methods=['PUT'])
@jwt_required()
def update_campaign(campaign_id):
    """Update a campaign (owner only)"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if campaign.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        data = request.get_json()
        updatable_fields = ['title', 'description', 'objectives', 'budget',
                          'start_date', 'end_date', 'status', 'requirements', 'category']

        for field in updatable_fields:
            if field in data:
                if field in ['start_date', 'end_date']:
                    setattr(campaign, field, datetime.fromisoformat(data[field].replace('Z', '+00:00')))
                else:
                    setattr(campaign, field, data[field])

        db.session.commit()

        return jsonify({
            'message': 'Campaign updated successfully',
            'campaign': campaign.to_dict()
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

        # Create a collaboration for this package booking in the campaign
        # This allows the creator to see it as a booking in their collaborations
        collaboration = Collaboration(
            collaboration_type='package',
            brand_id=brand.id,
            creator_id=package.creator_id,
            title=f"{campaign.title} - {package.title}",
            description=package.description,
            amount=package.price,
            deliverables=package.deliverables or [],
            start_date=campaign.start_date,
            expected_completion_date=campaign.end_date,
            status='in_progress',
            progress_percentage=0,
            notes=f"Package added to campaign: {campaign.title}"
        )
        db.session.add(collaboration)

        db.session.commit()

        return jsonify({
            'message': 'Package added to campaign successfully',
            'package': package.to_dict(),
            'collaboration': collaboration.to_dict()
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
    """Get all active campaigns for creators to browse"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        category = request.args.get('category')

        # Get active campaigns
        query = Campaign.query.filter_by(status='active')

        if category:
            query = query.filter_by(category=category)

        pagination = query.order_by(Campaign.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )

        campaigns = []
        for campaign in pagination.items:
            campaign_dict = campaign.to_dict(include_brand=True)
            # Check if creator has already applied
            existing_app = CampaignApplication.query.filter_by(
                campaign_id=campaign.id,
                creator_id=creator.id
            ).first()
            campaign_dict['has_applied'] = existing_app is not None
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
    """Apply to a campaign (creators only) with pricing and deliverables"""
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

        # Check if already applied
        existing_application = CampaignApplication.query.filter_by(
            campaign_id=campaign_id,
            creator_id=creator.id
        ).first()

        if existing_application:
            return jsonify({'error': 'Already applied to this campaign'}), 400

        data = request.get_json()

        # Validate required fields
        if 'proposed_price' not in data:
            return jsonify({'error': 'Proposed price is required'}), 400

        if 'deliverables' not in data or not data['deliverables']:
            return jsonify({'error': 'At least one deliverable is required'}), 400

        # Create application
        application = CampaignApplication(
            campaign_id=campaign_id,
            creator_id=creator.id,
            application_message=data.get('message', ''),
            proposed_price=float(data['proposed_price']),
            deliverables=data['deliverables'],  # List of deliverables
            status='pending'
        )

        db.session.add(application)
        db.session.commit()

        return jsonify({
            'message': 'Application submitted successfully',
            'application': application.to_dict(include_relations=True)
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
    """Accept or reject a campaign application (brand owner only)"""
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

        data = request.get_json()
        status = data.get('status')

        if status not in ['accepted', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400

        # Update application status
        application.status = status
        application.updated_at = datetime.utcnow()

        # If accepted, create a collaboration
        if status == 'accepted':
            # Check if collaboration already exists
            existing_collab = Collaboration.query.filter_by(
                campaign_application_id=application_id
            ).first()

            if not existing_collab:
                collaboration = Collaboration(
                    collaboration_type='campaign',
                    campaign_application_id=application_id,
                    brand_id=brand.id,
                    creator_id=application.creator_id,
                    title=campaign.title,
                    description=campaign.description,
                    amount=application.proposed_price,
                    deliverables=application.deliverables,
                    start_date=campaign.start_date,
                    expected_completion_date=campaign.end_date,
                    status='in_progress',
                    progress_percentage=0
                )
                db.session.add(collaboration)

        db.session.commit()

        return jsonify({
            'message': f'Application {status} successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
