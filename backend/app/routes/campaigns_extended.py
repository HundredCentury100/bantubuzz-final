# Extended campaign endpoints for package and application management
# This file contains additional endpoints to be merged with campaigns.py

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models import Campaign, BrandProfile, CreatorProfile, Package
from app.models.campaign import campaign_applications, campaign_packages

bp = Blueprint('campaigns_extended', __name__)


# ============= CAMPAIGN PACKAGES MANAGEMENT =============

@bp.route('/<int:campaign_id>/packages', methods=['POST'])
@jwt_required()
def add_package_to_campaign(campaign_id):
    """Add a package to a campaign (brand owner only)"""
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
        db.session.commit()

        return jsonify({
            'message': 'Package added to campaign successfully',
            'package': package.to_dict()
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
            campaign_dict['has_applied'] = creator in campaign.applicants.all()
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
    """Apply to a campaign (creators only)"""
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
        if creator in campaign.applicants.all():
            return jsonify({'error': 'Already applied to this campaign'}), 400

        data = request.get_json()
        application_message = data.get('message', '')

        # Add creator to applicants
        campaign.applicants.append(creator)

        # Update the association table with message
        db.session.execute(
            campaign_applications.update().where(
                (campaign_applications.c.campaign_id == campaign_id) &
                (campaign_applications.c.creator_id == creator.id)
            ).values(application_message=application_message)
        )

        db.session.commit()

        return jsonify({
            'message': 'Application submitted successfully',
            'campaign': campaign.to_dict()
        }), 200

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
        applications = db.session.execute(
            db.select(campaign_applications).where(
                campaign_applications.c.campaign_id == campaign_id
            )
        ).fetchall()

        result = []
        for app in applications:
            creator = CreatorProfile.query.get(app.creator_id)
            if creator:
                result.append({
                    'application_id': app.id,
                    'creator': creator.to_dict(include_user=True),
                    'status': app.status,
                    'application_message': app.application_message,
                    'applied_at': app.applied_at.isoformat(),
                    'updated_at': app.updated_at.isoformat()
                })

        return jsonify({
            'applications': result,
            'count': len(result)
        }), 200

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

        data = request.get_json()
        status = data.get('status')

        if status not in ['accepted', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400

        # Update application status
        db.session.execute(
            campaign_applications.update().where(
                campaign_applications.c.id == application_id
            ).values(status=status, updated_at=datetime.utcnow())
        )

        db.session.commit()

        return jsonify({
            'message': f'Application {status} successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
