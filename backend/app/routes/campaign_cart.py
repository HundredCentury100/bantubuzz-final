"""
Campaign Cart API Routes
Handles unpaid campaign additions and batch/individual payment
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    Campaign, CampaignCartItem, User, BrandProfile, CreatorProfile,
    Package, CampaignInvitation, CampaignProposal, CampaignPayment
)
from app.services.email_service import EmailService
from app.services.campaign_cart_payment_service import (
    create_campaign_cart_payment,
    get_bank_details,
    get_cart_items_for_payment,
    pay_campaign_cart_with_wallet,
)
from app.services.campaign_scenario_service import CampaignScenarioService
from app.utils.notifications import create_notification
from datetime import datetime, timedelta
from decimal import Decimal
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from werkzeug.utils import secure_filename
import os

bp = Blueprint('campaign_cart', __name__, url_prefix='/api/campaigns')
UPLOAD_FOLDER = '/var/www/bantubuzz/backend/uploads/payment_proofs'


@bp.route('/<int:campaign_id>/cart', methods=['GET'])
@jwt_required()
def get_campaign_cart(campaign_id):
    """
    Get all cart items for a campaign
    Returns both pending and paid items (can filter by status)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        # Verify brand owns the campaign
        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or access denied'}), 404

        # Get filter parameters
        payment_status = request.args.get('payment_status', 'pending')  # 'pending', 'paid', 'all'

        query = CampaignCartItem.query.filter_by(campaign_id=campaign_id)

        if payment_status != 'all':
            query = query.filter_by(payment_status=payment_status)

        cart_items = query.order_by(CampaignCartItem.added_at.desc()).all()

        # Calculate totals
        total_amount, total_count = CampaignCartItem.get_cart_total(campaign_id)

        return jsonify({
            'cart_items': [item.to_dict(include_relations=True) for item in cart_items],
            'total_amount': total_amount,
            'total_count': total_count,
            'pending_count': CampaignCartItem.get_pending_count(campaign_id)
        }), 200

    except Exception as e:
        print(f"Error getting campaign cart: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/cart/scenarios', methods=['GET'])
@jwt_required()
def get_campaign_cart_scenarios(campaign_id):
    """Predict campaign outcome scenarios for the current cart selection."""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or access denied'}), 404

        item_ids = request.args.getlist('cart_item_ids', type=int)
        prediction = CampaignScenarioService.predict_for_cart(campaign_id, item_ids or None)
        return jsonify(prediction), 200

    except Exception as e:
        print(f"Error getting campaign cart scenarios: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Unable to calculate campaign scenarios'}), 500


@bp.route('/<int:campaign_id>/cart/add-invitation', methods=['POST'])
@jwt_required()
def add_invitation_to_cart(campaign_id):
    """
    Send invitation and add to cart (no immediate payment)
    Supports both 'invite_to_apply' and 'invite_with_package' types
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or access denied'}), 404

        data = request.get_json()
        creator_id = data.get('creator_id')
        invitation_type = data.get('invitation_type', 'invite_to_apply')  # invite_to_apply or invite_with_package
        package_id = data.get('package_id')  # Required if invite_with_package
        message = data.get('message', '')
        amount = data.get('amount') or data.get('proposed_amount')

        if not creator_id:
            return jsonify({'error': 'creator_id is required'}), 400

        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        # Validate based on invitation type
        if invitation_type == 'invite_with_package':
            package = None
            if package_id:
                package = Package.query.get(package_id)
                if not package or package.creator_id != creator_id:
                    return jsonify({'error': 'Package not found or does not belong to creator'}), 404
                if not package.has_deliverables():
                    return jsonify({'error': 'This package cannot be added because it has no deliverables'}), 400

            if not package and not amount:
                return jsonify({'error': 'Select a package or enter a proposed amount'}), 400

            invitation_amount = Decimal(str(amount or package.price))
        else:
            # invite_to_apply - no upfront amount (creator will propose)
            invitation_amount = Decimal('0.00')

        # Check if invitation already exists
        existing_invitation = CampaignInvitation.query.filter_by(
            campaign_id=campaign_id,
            creator_user_id=creator.user_id,
            status='pending'
        ).first()

        if existing_invitation:
            return jsonify({'error': 'Invitation already sent to this creator'}), 400

        # Create invitation (status='pending', in_cart=True)
        invitation = CampaignInvitation(
            campaign_id=campaign_id,
            creator_user_id=creator.user_id,
            invited_by_user_id=user_id,
            invitation_type='join' if invitation_type == 'invite_with_package' else 'apply',
            package_id=package_id,
            proposed_amount=invitation_amount if invitation_type == 'invite_with_package' else None,
            message=message,
            status='pending',
            expires_at=datetime.utcnow() + timedelta(days=int(data.get('expires_in_days', 7)))
        )
        db.session.add(invitation)
        db.session.flush()

        # Only create cart item for invite_with_package (requires payment)
        cart_item = None
        if invitation_type == 'invite_with_package':
            cart_item = CampaignCartItem(
                campaign_id=campaign_id,
                brand_id=brand.id,
                item_type='invitation',
                invitation_id=invitation.id,
                creator_id=creator_id,
                package_id=package_id,
                amount=invitation_amount,
                notes=message
            )
            db.session.add(cart_item)

        db.session.commit()

        # Send email notification to creator (different for paid vs apply)
        creator_user = User.query.get(creator.user_id)
        if creator_user:
            try:
                if invitation_type == 'invite_with_package':
                    # Email: "You've been invited! Brand will pay soon"
                    EmailService.send_campaign_invitation_email(
                        creator_email=creator_user.email,
                        creator_name=creator.display_name or creator.username,
                        brand_name=brand.company_name or brand.display_name,
                        campaign_title=campaign.title,
                        campaign_url=f"https://bantubuzz.com/creator/campaigns/{campaign_id}",
                        invitation_type='join directly',
                        message=message
                    )
                else:
                    # Email: "You've been invited to apply"
                    EmailService.send_campaign_invitation_email(
                        creator_email=creator_user.email,
                        creator_name=creator.display_name or creator.username,
                        brand_name=brand.company_name or brand.display_name,
                        campaign_title=campaign.title,
                        campaign_url=f"https://bantubuzz.com/creator/campaigns/{campaign_id}",
                        invitation_type='apply to',
                        message=message
                    )
            except Exception as email_error:
                print(f"Failed to send invitation email: {email_error}")

        return jsonify({
            'success': True,
            'message': 'Invitation sent' + (' and added to cart' if cart_item else ''),
            'invitation': invitation.to_dict() if hasattr(invitation, 'to_dict') else {},
            'cart_item': cart_item.to_dict() if cart_item else None,
            'requires_payment': invitation_type == 'invite_with_package'
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding invitation to cart: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/cart/add-application', methods=['POST'])
@jwt_required()
def add_application_to_cart(campaign_id):
    """
    Accept a creator's application and add to cart (no immediate payment)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or access denied'}), 404

        data = request.get_json()
        proposal_id = data.get('proposal_id')

        if not proposal_id:
            return jsonify({'error': 'proposal_id is required'}), 400

        proposal = CampaignProposal.query.get(proposal_id)
        if not proposal or proposal.campaign_id != campaign_id:
            return jsonify({'error': 'Application not found'}), 404

        if proposal.status != 'pending':
            return jsonify({'error': f'Application is already {proposal.status}'}), 400

        # Check if already in cart
        existing_cart_item = CampaignCartItem.query.filter_by(
            campaign_id=campaign_id,
            item_type='application',
            proposal_id=proposal_id
        ).first()

        if existing_cart_item:
            return jsonify({'error': 'Application already in cart'}), 400

        # Update proposal status
        proposal.status = 'awaiting_payment'
        proposal.reviewed_at = datetime.utcnow()

        # Create cart item
        amount = proposal.proposed_price or campaign.budget or Decimal('100.00')
        cart_item = CampaignCartItem(
            campaign_id=campaign_id,
            brand_id=brand.id,
            item_type='application',
            proposal_id=proposal.id,
            creator_id=proposal.creator_id,
            amount=amount
        )
        db.session.add(cart_item)
        db.session.commit()

        create_notification(
            proposal.creator.user_id,
            'campaign',
            'Application Added to Cart',
            f'{brand.company_name or "A brand"} added your proposal for "{campaign.title}" to their campaign cart. Payment is pending.',
            '/creator/applications'
        )

        return jsonify({
            'success': True,
            'message': 'Application accepted and added to cart',
            'cart_item': cart_item.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding application to cart: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/cart/add-package', methods=['POST'])
@jwt_required()
def add_package_to_cart(campaign_id):
    """
    Add a creator's package to campaign cart (no immediate payment)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        campaign = Campaign.query.get(campaign_id)
        if not campaign or campaign.brand_id != brand.id:
            return jsonify({'error': 'Campaign not found or access denied'}), 404

        data = request.get_json()
        package_id = data.get('package_id')
        creator_id = data.get('creator_id')  # Should match package.creator_id
        notes = data.get('notes', '')

        if not package_id:
            return jsonify({'error': 'package_id is required'}), 400

        package = Package.query.get(package_id)
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        if not package.has_deliverables():
            return jsonify({'error': 'This package cannot be added because it has no deliverables'}), 400

        # Verify creator_id matches
        if creator_id and package.creator_id != creator_id:
            return jsonify({'error': 'Package does not belong to specified creator'}), 400

        # Check if already in cart
        existing_cart_item = CampaignCartItem.query.filter_by(
            campaign_id=campaign_id,
            item_type='package',
            package_id=package_id,
            creator_id=package.creator_id
        ).first()

        if existing_cart_item:
            return jsonify({'error': 'Package already in cart'}), 400

        # Create cart item
        cart_item = CampaignCartItem(
            campaign_id=campaign_id,
            brand_id=brand.id,
            item_type='package',
            package_id=package.id,
            creator_id=package.creator_id,
            amount=package.price,
            notes=notes
        )
        db.session.add(cart_item)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Package added to cart',
            'cart_item': cart_item.to_dict(include_relations=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error adding package to cart: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:campaign_id>/cart/<int:cart_item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(campaign_id, cart_item_id):
    """
    Remove item from cart (only if not yet paid)
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized'}), 403

        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        cart_item = CampaignCartItem.query.get(cart_item_id)
        if not cart_item or cart_item.campaign_id != campaign_id:
            return jsonify({'error': 'Cart item not found'}), 404

        if cart_item.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if cart_item.payment_status != 'pending':
            return jsonify({'error': 'Cannot remove paid items from cart'}), 400

        # Update related records
        if cart_item.item_type == 'invitation' and cart_item.invitation:
            cart_item.invitation.in_cart = False
            cart_item.invitation.status = 'declined'  # Cancel the invitation

        if cart_item.item_type == 'application' and cart_item.proposal:
            cart_item.proposal.accepted_pending_payment = False
            cart_item.proposal.status = 'pending'  # Revert to pending

        db.session.delete(cart_item)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Item removed from cart'
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error removing from cart: {e}")
        return jsonify({'error': str(e)}), 500


# PAYMENT ENDPOINTS

def _load_brand_campaign(campaign_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.user_type != 'brand':
        return None, None, None, (jsonify({'error': 'Unauthorized'}), 403)

    brand = BrandProfile.query.filter_by(user_id=user_id).first()
    if not brand:
        return None, None, None, (jsonify({'error': 'Brand profile not found'}), 404)

    campaign = Campaign.query.get(campaign_id)
    if not campaign or campaign.brand_id != brand.id:
        return None, None, None, (jsonify({'error': 'Campaign not found or access denied'}), 404)

    return user, brand, campaign, None


def _payment_response(payment, collaborations=None):
    if payment.payment_method == 'bank_transfer':
        return {
            'success': True,
            'status': payment.status,
            'payment_id': payment.id,
            'payment': payment.to_dict(),
            'bank_details': get_bank_details(payment.payment_reference),
            'message': 'Please complete bank transfer and upload proof',
        }
    if payment.payment_method == 'smilepay':
        return {
            'success': True,
            'status': payment.status,
            'payment_id': payment.id,
            'payment': payment.to_dict(),
            'message': 'Proceed with Smile&Pay',
        }
    return {
        'success': True,
        'status': 'completed',
        'payment_id': payment.id,
        'payment': payment.to_dict(),
        'message': 'Payment completed successfully',
        'collaborations': [
            {'id': collaboration.id, 'creator_id': collaboration.creator_id}
            for collaboration in (collaborations or [])
        ],
    }


def _initiate_cart_payment(campaign_id, cart_item_ids, payment_type):
    user, brand, campaign, error = _load_brand_campaign(campaign_id)
    if error:
        return error

    data = request.get_json() or {}
    payment_method = data.get('payment_method', 'wallet')
    if payment_method not in ['wallet', 'bank_transfer', 'smilepay']:
        return jsonify({'error': 'Invalid payment method'}), 400

    try:
        cart_items = get_cart_items_for_payment(campaign_id, brand.id, cart_item_ids)
        payment = create_campaign_cart_payment(
            campaign=campaign,
            brand_user_id=user.id,
            cart_items=cart_items,
            payment_type=payment_type,
            payment_method=payment_method,
            collaboration_details=data.get('collaboration_details'),
            requires_content_review=data.get('requires_content_review', True),
        )

        collaborations = []
        if payment_method == 'wallet':
            collaborations = pay_campaign_cart_with_wallet(payment)
        db.session.commit()

        return jsonify(_payment_response(payment, collaborations)), 200

    except ValueError as error:
        db.session.rollback()
        return jsonify({'error': str(error)}), 400
    except Exception as error:
        db.session.rollback()
        print(f"Error initiating campaign cart payment: {error}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(error)}), 500


@bp.route('/<int:campaign_id>/cart/pay-all', methods=['POST'])
@jwt_required()
def pay_all_cart_items(campaign_id):
    return _initiate_cart_payment(campaign_id, None, 'full_campaign')


@bp.route('/<int:campaign_id>/cart/pay-selected', methods=['POST'])
@jwt_required()
def pay_selected_cart_items(campaign_id):
    data = request.get_json() or {}
    cart_item_ids = data.get('cart_item_ids', [])
    if not cart_item_ids:
        return jsonify({'error': 'cart_item_ids is required'}), 400
    return _initiate_cart_payment(campaign_id, cart_item_ids, 'batch')


@bp.route('/<int:campaign_id>/cart/<int:cart_item_id>/pay', methods=['POST'])
@jwt_required()
def pay_individual_cart_item(campaign_id, cart_item_id):
    return _initiate_cart_payment(campaign_id, [cart_item_id], 'individual')


@bp.route('/<int:campaign_id>/cart/payments/<int:payment_id>/upload-proof', methods=['POST'])
@jwt_required()
def upload_campaign_cart_payment_proof(campaign_id, payment_id):
    user, brand, campaign, error = _load_brand_campaign(campaign_id)
    if error:
        return error

    payment = CampaignPayment.query.get(payment_id)
    if not payment or payment.campaign_id != campaign_id or payment.brand_user_id != user.id:
        return jsonify({'error': 'Payment not found'}), 404
    if payment.payment_method != 'bank_transfer':
        return jsonify({'error': 'This payment does not use bank transfer'}), 400
    if 'proof' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['proof']
    if not file or file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    try:
        os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else 'bin'
        filename = secure_filename(f"campaign_cart_{payment.id}_{user.id}_{int(datetime.utcnow().timestamp())}.{ext}")
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)

        metadata = payment.payment_metadata or {}
        metadata['proof_path'] = f"/uploads/payment_proofs/{filename}"
        metadata['proof_uploaded_at'] = datetime.utcnow().isoformat()
        payment.payment_metadata = metadata
        payment.status = 'processing'
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Proof of payment uploaded. Pending admin verification.',
            'payment': payment.to_dict(),
        }), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'error': str(error)}), 500


def _invoice_line_from_item(item):
    creator_name = 'Unknown Creator'
    if item.creator:
        creator_name = item.creator.display_name or item.creator.username or creator_name

    package_title = 'Campaign proposal'
    platform = 'Campaign'
    deliverables = []
    if item.package:
        package_title = item.package.title
        platform = item.package.platform_type or ', '.join(item.package.platforms or []) or 'Package'
        deliverables = item.package.deliverables or []
    elif item.proposal:
        package_title = 'Creator proposal'
        deliverables = item.proposal.milestones or item.proposal.deliverables or []

    return {
        'creator': creator_name,
        'package': package_title,
        'platform': platform,
        'deliverables': deliverables,
        'amount': float(item.amount or 0),
    }


def _draw_invoice_pdf(campaign, brand, lines, status='Pro Forma'):
    width, height = 1240, 1754
    page = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(page)
    font = ImageFont.load_default()
    y = 80

    draw.text((80, y), 'BantuBuzz Campaign Invoice', fill='#111827', font=font)
    draw.text((80, y + 40), f"Status: {status}", fill='#111827', font=font)
    draw.text((80, y + 80), f"Campaign: {campaign.title}", fill='#111827', font=font)
    draw.text((80, y + 120), f"Brand: {brand.company_name or brand.display_name or 'Brand'}", fill='#111827', font=font)
    draw.text((80, y + 160), f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}", fill='#111827', font=font)
    y += 240

    draw.line((80, y, width - 80, y), fill='#D1D5DB', width=2)
    y += 30
    total = 0
    for index, line in enumerate(lines, start=1):
        amount = float(line['amount'])
        total += amount
        draw.text((80, y), f"{index}. {line['creator']} - {line['package']}", fill='#111827', font=font)
        draw.text((80, y + 30), f"Platform: {line['platform']}", fill='#4B5563', font=font)
        draw.text((980, y), f"${amount:,.2f}", fill='#111827', font=font)
        y += 80
        draw.line((80, y, width - 80, y), fill='#E5E7EB', width=1)
        y += 25

    draw.text((80, y + 20), f"Total: ${total:,.2f}", fill='#111827', font=font)
    draw.text((80, height - 100), "Powered by BantuBuzz", fill='#6B7280', font=font)

    output = BytesIO()
    page.save(output, format='PDF')
    output.seek(0)
    return output


@bp.route('/<int:campaign_id>/cart/invoice/pro-forma', methods=['POST'])
@jwt_required()
def download_campaign_cart_proforma_invoice(campaign_id):
    user, brand, campaign, error = _load_brand_campaign(campaign_id)
    if error:
        return error

    data = request.get_json() or {}
    cart_item_ids = data.get('cart_item_ids') or []
    if not cart_item_ids:
        return jsonify({'error': 'Select at least one cart item'}), 400

    cart_items = CampaignCartItem.query.filter(
        CampaignCartItem.id.in_(cart_item_ids),
        CampaignCartItem.campaign_id == campaign_id,
        CampaignCartItem.brand_id == brand.id,
    ).all()
    if not cart_items:
        return jsonify({'error': 'No invoice items found'}), 404

    lines = [_invoice_line_from_item(item) for item in cart_items]
    pdf = _draw_invoice_pdf(campaign, brand, lines, 'Pro Forma')
    filename = secure_filename(f"{campaign.title}_pro_forma_invoice.pdf")
    return send_file(
        pdf,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=filename,
    )
