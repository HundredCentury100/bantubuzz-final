"""
Campaign Payments Routes
Handles flexible payment options for campaigns (full, batch, individual)
Supports: PayNow, Wallet, Bank Transfer
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import (
    User, Campaign, Collaboration, CampaignPayment, CampaignPaymentItem,
    Wallet, WalletTransaction, Notification, CampaignProposal, CreatorProfile
)
from app.services.payment_service import payment_service
from app.services.email_service import EmailService
from app.utils.campaign_helpers import (
    user_owns_campaign, get_campaign_collaborations
)
from app.utils.subscription_helper import get_brand_service_fee_percentage
from datetime import datetime
from decimal import Decimal
import uuid

bp = Blueprint('campaign_payments', __name__, url_prefix='/api/campaign-payments')


@bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_payment():
    """
    Calculate payment amount for selected collaborations
    Body: {
        campaign_id: int,
        collaboration_ids: [int],
        payment_type: 'full_campaign' | 'batch' | 'individual'
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()
        campaign_id = data.get('campaign_id')
        collaboration_ids = data.get('collaboration_ids', [])
        payment_type = data.get('payment_type', 'batch')

        # Validate
        if not campaign_id or not collaboration_ids:
            return jsonify({'error': 'campaign_id and collaboration_ids are required'}), 400

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if not user_owns_campaign(campaign, user_id):
            return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Get collaborations - need to fetch by IDs since they're from campaign
        collaborations = Collaboration.query.filter(
            Collaboration.id.in_(collaboration_ids),
            Collaboration.status.in_(['active', 'in_progress'])
        ).all()

        # Verify all collaborations belong to this campaign
        valid_collaborations = []
        for collab in collaborations:
            if collab.campaign_application and collab.campaign_application.campaign_id == campaign_id:
                valid_collaborations.append(collab)

        if not valid_collaborations:
            return jsonify({'error': 'No valid collaborations found'}), 404

        collaborations = valid_collaborations

        # Calculate amounts
        items = []
        subtotal = 0

        for collab in collaborations:
            item_amount = float(collab.amount or 0)
            subtotal += item_amount

            # Get creator name from CreatorProfile relationship
            creator_name = collab.creator.display_name if collab.creator else 'Unknown Creator'

            items.append({
                'collaboration_id': collab.id,
                'creator_name': creator_name,
                'package_title': collab.title or 'Campaign collaboration',
                'amount': item_amount
            })

        service_fee_percentage = get_brand_service_fee_percentage(user_id)
        platform_fee = subtotal * (service_fee_percentage / 100)
        total_amount = subtotal + platform_fee

        return jsonify({
            'subtotal': subtotal,
            'platform_fee': platform_fee,
            'service_fee_percentage': service_fee_percentage,
            'total_amount': total_amount,
            'items': items,
            'items_count': len(items)
        }), 200

    except Exception as e:
        print(f"Error calculating payment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/initiate', methods=['POST'])
@jwt_required()
def initiate_payment():
    """
    Initiate payment for campaign collaborations
    Body: {
        campaign_id: int,
        collaboration_ids: [int],
        payment_type: 'full_campaign' | 'batch' | 'individual',
        payment_method: 'paynow' | 'wallet' | 'bank_transfer'
    }
    """
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        data = request.get_json()
        campaign_id = data.get('campaign_id')
        collaboration_ids = data.get('collaboration_ids', [])
        payment_type = data.get('payment_type', 'batch')
        payment_method = data.get('payment_method', 'paynow')

        # Validate
        if not campaign_id or not collaboration_ids:
            return jsonify({'error': 'campaign_id and collaboration_ids are required'}), 400

        if payment_method not in ['paynow', 'wallet', 'bank_transfer']:
            return jsonify({'error': 'Invalid payment_method'}), 400

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if not user_owns_campaign(campaign, user_id):
            return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Create payment record
        payment = CampaignPayment.create_payment(
            campaign_id=campaign_id,
            brand_user_id=user_id,
            collaboration_ids=collaboration_ids,
            payment_type=payment_type
        )

        payment.payment_method = payment_method

        # Handle different payment methods
        if payment_method == 'wallet':
            # Process wallet payment immediately
            result = process_wallet_payment(payment, user_id)
            if result['success']:
                payment.mark_as_completed()
                payment.payment_reference = result['transaction_id']
                db.session.commit()

                return jsonify({
                    'message': 'Payment completed successfully via wallet',
                    'payment': payment.to_dict(),
                    'payment_method': 'wallet',
                    'status': 'completed'
                }), 200
            else:
                payment.mark_as_failed(result['error'])
                return jsonify({
                    'error': result['error'],
                    'payment_id': payment.id
                }), 400

        elif payment_method == 'bank_transfer':
            # Bank transfer - mark as pending, brand will upload proof
            payment.status = 'pending'
            payment.payment_metadata = {
                'bank_details': {
                    'bank_name': 'CBZ Bank',
                    'account_name': 'BantuBuzz Holdings',
                    'account_number': '1234567890',
                    'branch': 'Harare Main Branch',
                    'reference': f'CAMP-{payment.id}'
                }
            }
            db.session.commit()

            return jsonify({
                'message': 'Bank transfer initiated. Please make payment and upload proof.',
                'payment': payment.to_dict(),
                'payment_method': 'bank_transfer',
                'bank_details': payment.payment_metadata['bank_details'],
                'status': 'pending'
            }), 200

        elif payment_method == 'paynow':
            # Initiate PayNow payment
            result = initiate_paynow_payment(payment)
            if result['success']:
                payment.payment_reference = result['reference']
                payment.paynow_poll_url = result['poll_url']
                payment.status = 'processing'
                db.session.commit()

                return jsonify({
                    'message': 'PayNow payment initiated',
                    'payment': payment.to_dict(),
                    'payment_method': 'paynow',
                    'redirect_url': result['redirect_url'],
                    'poll_url': result['poll_url'],
                    'reference': result['reference'],
                    'status': 'processing'
                }), 200
            else:
                payment.mark_as_failed(result['error'])
                return jsonify({
                    'error': result['error'],
                    'payment_id': payment.id
                }), 400

    except Exception as e:
        db.session.rollback()
        print(f"Error initiating payment: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:payment_id>/status', methods=['GET'])
@jwt_required()
def get_payment_status(payment_id):
    """Get payment status (for polling PayNow payments)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        payment = CampaignPayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        if payment.brand_user_id != user_id:
            return jsonify({'error': 'Unauthorized: This is not your payment'}), 403

        # If PayNow and processing, poll status
        if payment.payment_method == 'paynow' and payment.status == 'processing':
            status = poll_paynow_status(payment)
            if status == 'paid':
                payment.mark_as_completed()
            elif status == 'cancelled':
                payment.mark_as_failed('Payment cancelled by user')

        return jsonify({
            'payment': payment.to_dict(),
            'status': payment.status
        }), 200

    except Exception as e:
        print(f"Error getting payment status: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:payment_id>/upload-proof', methods=['POST'])
@jwt_required()
def upload_bank_proof(payment_id):
    """Upload bank transfer proof of payment"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        payment = CampaignPayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        if payment.brand_user_id != user_id:
            return jsonify({'error': 'Unauthorized: This is not your payment'}), 403

        if payment.payment_method != 'bank_transfer':
            return jsonify({'error': 'This payment is not via bank transfer'}), 400

        # Handle file upload (proof of payment)
        if 'proof' not in request.files:
            return jsonify({'error': 'No proof file uploaded'}), 400

        file = request.files['proof']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Save file (implement file upload logic)
        # For now, just mark as processing pending admin verification
        payment.status = 'processing'
        payment.payment_metadata = {
            **(payment.payment_metadata or {}),
            'proof_uploaded': True,
            'proof_uploaded_at': datetime.utcnow().isoformat(),
        }
        db.session.commit()

        # Notify admin for verification
        # TODO: Create admin notification

        return jsonify({
            'message': 'Proof of payment uploaded. Pending admin verification.',
            'payment': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error uploading proof: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/campaign/<int:campaign_id>', methods=['GET'])
@jwt_required()
def get_campaign_payments(campaign_id):
    """Get all payments for a campaign"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user or user.user_type != 'brand':
            return jsonify({'error': 'Unauthorized: Brand access only'}), 403

        # Verify campaign ownership
        campaign = Campaign.query.get(campaign_id)
        if not campaign:
            return jsonify({'error': 'Campaign not found'}), 404

        if not user_owns_campaign(campaign, user_id):
            return jsonify({'error': 'Unauthorized: You do not own this campaign'}), 403

        # Get payments
        payments = CampaignPayment.query.filter_by(campaign_id=campaign_id).order_by(CampaignPayment.created_at.desc()).all()

        return jsonify({
            'payments': [p.to_dict() for p in payments],
            'count': len(payments)
        }), 200

    except Exception as e:
        print(f"Error fetching campaign payments: {str(e)}")
        return jsonify({'error': str(e)}), 500


# Helper functions

def process_wallet_payment(payment, user_id):
    """Process payment via brand wallet"""
    try:
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        if not wallet:
            return {'success': False, 'error': 'Wallet not found'}

        total_amount = Decimal(str(payment.total_amount or 0))
        available_balance = Decimal(str(wallet.available_balance or 0))

        if available_balance < total_amount:
            return {'success': False, 'error': f'Insufficient wallet balance. Available: ${available_balance:.2f}, Required: ${total_amount:.2f}'}

        # Deduct from brand wallet and keep funds escrowed until collaboration completion.
        wallet.available_balance = available_balance - total_amount
        wallet.total_spent = Decimal(str(wallet.total_spent or 0)) + total_amount
        wallet.updated_at = datetime.utcnow()

        # Create transaction record
        transaction = WalletTransaction(
            wallet_id=wallet.id,
            user_id=user_id,
            transaction_type='payment',
            amount=-abs(total_amount),
            description=f'Campaign payment for {payment.campaign.title}',
            status='available',
            clearance_required=False,
            transaction_metadata={
                'payment_type': 'campaign_payment',
                'payment_reference': f'CAMP-PAY-{payment.id}',
                'campaign_payment_id': payment.id,
                'campaign_id': payment.campaign_id,
            },
        )
        db.session.add(transaction)

        for item in payment.items:
            if item.collaboration:
                item.collaboration.escrow_status = 'escrowed'

            # Notify creator
            notification = Notification(
                user_id=item.creator_user_id,
                type='campaign_payment_escrowed',
                title='Campaign Payment Confirmed',
                message=f'Payment for your collaboration in "{payment.campaign.title}" is now held in escrow.',
                related_id=payment.id
            )
            db.session.add(notification)

            # Send email notification to creator
            try:
                creator_user = User.query.get(item.creator_user_id)
                if creator_user:
                    creator_profile = CreatorProfile.query.filter_by(user_id=item.creator_user_id).first()
                    creator_name = creator_profile.display_name if creator_profile else creator_user.email
                    EmailService.send_campaign_payment_notification_email(
                        payment_id=payment.id,
                        recipient_email=creator_user.email,
                        recipient_name=creator_name,
                        is_brand=False
                    )
            except Exception as email_error:
                print(f"Failed to send payment email to creator: {email_error}")

        db.session.commit()

        # Send email notification to brand
        try:
            brand_user = User.query.get(user_id)
            if brand_user:
                brand_name = brand_user.brand_profile.company_name if hasattr(brand_user, 'brand_profile') else brand_user.email
                EmailService.send_campaign_payment_notification_email(
                    payment_id=payment.id,
                    recipient_email=brand_user.email,
                    recipient_name=brand_name,
                    is_brand=True
                )
        except Exception as email_error:
            print(f"Failed to send payment email to brand: {email_error}")

        return {'success': True, 'transaction_id': f'WALLET-{transaction.id}'}

    except Exception as e:
        db.session.rollback()
        print(f"Wallet payment error: {e}")
        return {'success': False, 'error': str(e)}


def initiate_paynow_payment(payment):
    """Initiate PayNow payment"""
    try:
        # Get brand email from User relationship
        brand_email = payment.brand.email if payment.brand else None
        if not brand_email:
            return {'success': False, 'error': 'Brand email not found'}

        # Use existing PayNow service
        result = payment_service.initiate_payment(
            amount=float(payment.total_amount),
            email=brand_email,
            reference=f'CAMP-{payment.id}',
            return_url=f'https://bantubuzz.com/brand/campaigns/{payment.campaign_id}/payment-success',
            result_url=f'https://bantubuzz.com/api/campaign-payments/{payment.id}/paynow-callback'
        )

        if result['success']:
            return {
                'success': True,
                'reference': result['reference'],
                'poll_url': result['poll_url'],
                'redirect_url': result['redirect_url']
            }
        else:
            return {'success': False, 'error': result.get('error', 'PayNow initiation failed')}

    except Exception as e:
        print(f"PayNow initiation error: {e}")
        return {'success': False, 'error': str(e)}


def poll_paynow_status(payment):
    """Poll PayNow payment status"""
    try:
        if not payment.paynow_poll_url:
            return 'unknown'

        status = payment_service.check_payment_status(payment.paynow_poll_url)
        return status  # 'paid', 'cancelled', 'pending'

    except Exception as e:
        print(f"PayNow polling error: {e}")
        return 'unknown'


@bp.route('/<int:payment_id>/paynow-callback', methods=['POST'])
def paynow_callback(payment_id):
    """PayNow callback endpoint"""
    try:
        payment = CampaignPayment.query.get(payment_id)
        if not payment:
            return jsonify({'error': 'Payment not found'}), 404

        # Verify payment status via polling
        status = poll_paynow_status(payment)

        if status == 'paid':
            payment.mark_as_completed()
            return jsonify({'status': 'success'}), 200
        elif status == 'cancelled':
            payment.mark_as_failed('Payment cancelled')
            return jsonify({'status': 'cancelled'}), 200
        else:
            return jsonify({'status': 'pending'}), 200

    except Exception as e:
        print(f"PayNow callback error: {e}")
        return jsonify({'error': str(e)}), 500
