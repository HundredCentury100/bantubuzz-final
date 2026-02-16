from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import CustomPackageRequest, CustomPackageOffer, BrandProfile, CreatorProfile, User, Booking, Notification, Message
from datetime import datetime

bp = Blueprint('custom_packages', __name__, url_prefix='/api/custom-packages')

# ============================================================================
# BRAND ENDPOINTS
# ============================================================================

@bp.route('/requests', methods=['POST'])
@jwt_required()
def create_custom_request():
    """Brand creates a custom package request"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        creator_id = data.get('creator_id')
        expected_deliverables = data.get('expected_deliverables')
        budget = data.get('budget')
        additional_notes = data.get('additional_notes', '')

        # Validation
        if not creator_id or not expected_deliverables or not budget:
            return jsonify({'error': 'Missing required fields'}), 400

        if not isinstance(expected_deliverables, list) or len(expected_deliverables) == 0:
            return jsonify({'error': 'Expected deliverables must be a non-empty array'}), 400

        try:
            budget = float(budget)
            if budget <= 0:
                return jsonify({'error': 'Budget must be greater than 0'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid budget amount'}), 400

        # Check creator exists
        creator = CreatorProfile.query.get(creator_id)
        if not creator:
            return jsonify({'error': 'Creator not found'}), 404

        # Create request
        custom_request = CustomPackageRequest(
            brand_id=brand.id,
            creator_id=creator_id,
            expected_deliverables=expected_deliverables,
            budget=budget,
            additional_notes=additional_notes,
            status='pending'
        )

        db.session.add(custom_request)
        db.session.flush()  # Get request ID

        # Create notification for creator
        notification = Notification(
            user_id=creator.user_id,
            type='custom_package_request',
            title='New Custom Package Request',
            message=f'{brand.company_name} has requested a custom package from you. Budget: ${budget}',
            action_url=f'/messages'
        )
        db.session.add(notification)

        # Create message thread with custom request
        message_content = f"Custom Package Request\n\nBudget: ${budget}\n\nExpected Deliverables:\n" + "\n".join([f"• {d}" for d in expected_deliverables])
        if additional_notes:
            message_content += f"\n\nAdditional Notes:\n{additional_notes}"

        message = Message(
            sender_id=brand.user_id,
            receiver_id=creator.user_id,
            custom_request_id=custom_request.id,
            message_type='custom_request',
            content=message_content,
            is_read=False
        )
        db.session.add(message)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Custom package request sent successfully',
            'request': custom_request.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error creating custom request: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@bp.route('/requests/my-requests', methods=['GET'])
@jwt_required()
def get_my_requests():
    """Get brand's custom package requests"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        requests = CustomPackageRequest.query.filter_by(brand_id=brand.id)\
            .order_by(CustomPackageRequest.created_at.desc()).all()

        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200

    except Exception as e:
        print(f"Error fetching requests: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers/<int:offer_id>/accept', methods=['POST'])
@jwt_required()
def accept_offer(offer_id):
    """Brand accepts a custom package offer"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        offer = CustomPackageOffer.query.get(offer_id)
        if not offer:
            return jsonify({'error': 'Offer not found'}), 404

        if offer.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if offer.status != 'pending':
            return jsonify({'error': f'Offer is already {offer.status}'}), 400

        # Check if expired
        if datetime.utcnow() > offer.expires_at:
            offer.status = 'expired'
            db.session.commit()
            return jsonify({'error': 'Offer has expired'}), 400

        # Update offer status
        offer.status = 'accepted'
        offer.accepted_at = datetime.utcnow()

        # Update request status
        offer.request.status = 'accepted'

        # Create booking from custom offer
        booking = Booking(
            package_id=None,  # No package for custom offers
            campaign_id=None,
            creator_id=offer.creator_id,
            brand_id=offer.brand_id,
            status='pending',  # Will be 'accepted' after payment
            amount=float(offer.price),
            total_price=float(offer.price),
            payment_status='pending',
            payment_method=None,  # Will be set on payment page
            booking_type='custom_package',
            payment_category='custom_package',
            notes=f"Custom Package: {offer.title}\n\nDeliverables:\n" + "\n".join([f"- {d}" for d in offer.deliverables])
        )

        db.session.add(booking)
        db.session.flush()  # Get booking ID

        # Store booking_id in offer for reference
        offer.booking_id = booking.id

        # Create notification for creator
        creator = CreatorProfile.query.get(offer.creator_id)
        notification = Notification(
            user_id=creator.user_id,
            type='custom_package_accepted',
            title='Custom Package Offer Accepted!',
            message=f'{brand.company_name} has accepted your custom package offer for ${offer.price}. Waiting for payment.',
            action_url=f'/creator/bookings/{booking.id}'
        )
        db.session.add(notification)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Offer accepted successfully',
            'offer': offer.to_dict(),
            'booking': booking.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error accepting offer: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers/<int:offer_id>/decline', methods=['POST'])
@jwt_required()
def decline_offer(offer_id):
    """Brand declines a custom package offer"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        reason = data.get('reason', '')

        offer = CustomPackageOffer.query.get(offer_id)
        if not offer:
            return jsonify({'error': 'Offer not found'}), 404

        if offer.brand_id != brand.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if offer.status != 'pending':
            return jsonify({'error': f'Offer is already {offer.status}'}), 400

        # Update offer status
        offer.status = 'declined'
        offer.declined_at = datetime.utcnow()
        offer.declined_reason = reason

        # Update request back to pending so creator can send another offer
        offer.request.status = 'pending'

        # Create notification for creator
        creator = CreatorProfile.query.get(offer.creator_id)
        reason_text = f' Reason: {reason}' if reason else ''
        notification = Notification(
            user_id=creator.user_id,
            type='custom_package_declined',
            title='Custom Package Offer Declined',
            message=f'{brand.company_name} has declined your custom package offer.{reason_text}',
            action_url=f'/creator/custom-requests/{offer.request_id}'
        )
        db.session.add(notification)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Offer declined',
            'offer': offer.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error declining offer: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# CREATOR ENDPOINTS
# ============================================================================

@bp.route('/requests/received', methods=['GET'])
@jwt_required()
def get_received_requests():
    """Get creator's received custom package requests"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        requests = CustomPackageRequest.query.filter_by(creator_id=creator.id)\
            .order_by(CustomPackageRequest.created_at.desc()).all()

        return jsonify({
            'requests': [req.to_dict() for req in requests]
        }), 200

    except Exception as e:
        print(f"Error fetching requests: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers', methods=['POST'])
@jwt_required()
def create_custom_offer():
    """Creator creates a custom package offer in response to a request"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        data = request.get_json()
        request_id = data.get('request_id')
        title = data.get('title')
        description = data.get('description')
        deliverables = data.get('deliverables')
        price = data.get('price')
        delivery_time_days = data.get('delivery_time_days')
        revisions_allowed = data.get('revisions_allowed', 2)

        # Validation
        if not all([request_id, title, description, deliverables, price, delivery_time_days]):
            return jsonify({'error': 'Missing required fields'}), 400

        if not isinstance(deliverables, list) or len(deliverables) == 0:
            return jsonify({'error': 'Deliverables must be a non-empty array'}), 400

        try:
            price = float(price)
            if price <= 0:
                return jsonify({'error': 'Price must be greater than 0'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid price amount'}), 400

        try:
            delivery_time_days = int(delivery_time_days)
            if delivery_time_days <= 0:
                return jsonify({'error': 'Delivery time must be greater than 0'}), 400
        except ValueError:
            return jsonify({'error': 'Invalid delivery time'}), 400

        # Check request exists
        custom_request = CustomPackageRequest.query.get(request_id)
        if not custom_request:
            return jsonify({'error': 'Request not found'}), 404

        if custom_request.creator_id != creator.id:
            return jsonify({'error': 'Unauthorized'}), 403

        if custom_request.status == 'accepted':
            return jsonify({'error': 'Request has already been accepted'}), 400

        # Create offer
        offer = CustomPackageOffer(
            request_id=request_id,
            creator_id=creator.id,
            brand_id=custom_request.brand_id,
            title=title,
            description=description,
            deliverables=deliverables,
            price=price,
            delivery_time_days=delivery_time_days,
            revisions_allowed=revisions_allowed,
            status='pending'
        )

        db.session.add(offer)
        db.session.flush()  # Get offer ID

        # Update request status
        custom_request.status = 'offer_sent'

        # Create notification for brand
        notification = Notification(
            user_id=custom_request.brand.user_id,
            type='custom_package_offer',
            title='New Custom Package Offer',
            message=f'{creator.username} has sent you a custom package offer: {title}. Price: ${price}',
            action_url=f'/messages'
        )
        db.session.add(notification)

        # Create message with custom offer
        message_content = f"Custom Package Offer: {title}\n\n{description}\n\nPrice: ${price}\nDelivery Time: {delivery_time_days} days\nRevisions Allowed: {revisions_allowed}\n\nDeliverables:\n" + "\n".join([f"• {d}" for d in deliverables])

        message = Message(
            sender_id=creator.user_id,
            receiver_id=custom_request.brand.user_id,
            custom_offer_id=offer.id,
            message_type='custom_offer',
            content=message_content,
            is_read=False
        )
        db.session.add(message)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Custom package offer sent successfully',
            'offer': offer.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error creating offer: {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers/my-offers', methods=['GET'])
@jwt_required()
def get_my_offers():
    """Get creator's sent custom package offers"""
    try:
        user_id = int(get_jwt_identity())
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        if not creator:
            return jsonify({'error': 'Creator profile not found'}), 404

        offers = CustomPackageOffer.query.filter_by(creator_id=creator.id)\
            .order_by(CustomPackageOffer.created_at.desc()).all()

        return jsonify({
            'offers': [offer.to_dict() for offer in offers]
        }), 200

    except Exception as e:
        print(f"Error fetching offers: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SHARED ENDPOINTS
# ============================================================================

@bp.route('/requests/<int:request_id>', methods=['GET'])
@jwt_required()
def get_request(request_id):
    """Get a specific custom package request"""
    try:
        user_id = int(get_jwt_identity())

        custom_request = CustomPackageRequest.query.get(request_id)
        if not custom_request:
            return jsonify({'error': 'Request not found'}), 404

        # Check authorization
        user = User.query.get(user_id)
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        is_authorized = (
            (brand and custom_request.brand_id == brand.id) or
            (creator and custom_request.creator_id == creator.id)
        )

        if not is_authorized:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'request': custom_request.to_dict()
        }), 200

    except Exception as e:
        print(f"Error fetching request: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers/<int:offer_id>', methods=['GET'])
@jwt_required()
def get_offer(offer_id):
    """Get a specific custom package offer"""
    try:
        user_id = int(get_jwt_identity())

        offer = CustomPackageOffer.query.get(offer_id)
        if not offer:
            return jsonify({'error': 'Offer not found'}), 404

        # Check authorization
        brand = BrandProfile.query.filter_by(user_id=user_id).first()
        creator = CreatorProfile.query.filter_by(user_id=user_id).first()

        is_authorized = (
            (brand and offer.brand_id == brand.id) or
            (creator and offer.creator_id == creator.id)
        )

        if not is_authorized:
            return jsonify({'error': 'Unauthorized'}), 403

        return jsonify({
            'offer': offer.to_dict()
        }), 200

    except Exception as e:
        print(f"Error fetching offer: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/offers/brand/<int:brand_id>', methods=['GET'])
@jwt_required()
def get_brand_offers(brand_id):
    """Get all custom offers for a specific brand"""
    try:
        user_id = int(get_jwt_identity())
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand or brand.id != brand_id:
            return jsonify({'error': 'Unauthorized'}), 403

        offers = CustomPackageOffer.query.filter_by(brand_id=brand_id)\
            .order_by(CustomPackageOffer.created_at.desc()).all()

        return jsonify({
            'offers': [offer.to_dict() for offer in offers]
        }), 200

    except Exception as e:
        print(f"Error fetching brand offers: {str(e)}")
        return jsonify({'error': str(e)}), 500
