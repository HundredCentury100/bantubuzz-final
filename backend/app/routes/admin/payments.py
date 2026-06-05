"""
Admin Payment Management Routes
Handles verification, viewing, and management of all payments and bookings
"""

from flask import jsonify, request
from datetime import datetime, timedelta
from app import db
from app.models import Payment, Booking, User, BrandProfile, CreatorProfile, PaymentVerification, CreatorSubscription, CreatorSubscriptionPlan, Subscription, Collaboration, Package, WorkspaceAddon, CampaignPayment
from app.services.agency_subscription_service import apply_brand_subscription_entitlements
from app.services.subscription_lifecycle_service import apply_paid_subscription, subscription_amount_due
from app.decorators.admin import admin_required
from flask_jwt_extended import get_jwt_identity
from . import bp


def ensure_direct_booking_collaboration(booking):
    """Create the package collaboration that starts after a direct booking is paid."""
    if not booking or booking.booking_type not in [None, 'direct']:
        return None

    existing_collaboration = Collaboration.query.filter_by(booking_id=booking.id).first()
    if existing_collaboration:
        return existing_collaboration

    package = Package.query.get(booking.package_id)

    start_date = datetime.utcnow()
    expected_completion = None
    if package and package.duration_days:
        expected_completion = start_date + timedelta(days=package.duration_days)

    collab_details = {}
    if booking.notes:
        try:
            import json
            collab_details = json.loads(booking.notes)
        except Exception:
            collab_details = {}

    requires_review = collab_details.get('requires_content_review', True)
    if isinstance(requires_review, str):
        requires_review = requires_review.lower() not in ['false', '0', 'no']
    else:
        requires_review = bool(requires_review)

    collaboration = Collaboration(
        collaboration_type='package',
        booking_id=booking.id,
        creator_id=booking.creator_id,
        brand_id=booking.brand_id,
        title=f"Collaboration for {package.title if package else 'Package'}",
        description=package.description if package else '',
        amount=booking.amount,
        status='in_progress',
        start_date=start_date,
        expected_completion_date=expected_completion,
        deliverables=package.deliverables if package and package.deliverables else [],
        progress_percentage=0,
        requires_content_review=requires_review,
        brief=collab_details.get('brief'),
        guidelines=collab_details.get('guidelines'),
        rules=collab_details.get('rules'),
        additional_notes=collab_details.get('additional_notes')
    )
    db.session.add(collaboration)
    db.session.flush()

    try:
        from app.routes.bookings import create_no_track_deliverables
        create_no_track_deliverables(collaboration)
    except Exception as error:
        print(f"Failed to create NO-track deliverables for collaboration {collaboration.id}: {error}")

    return collaboration


def get_brand_subscription_amount(subscription):
    if not subscription or not subscription.plan:
        return 0
    return subscription_amount_due(subscription, subscription.billing_cycle or 'monthly')


def apply_brand_subscription_account_type(subscription):
    if subscription:
        apply_brand_subscription_entitlements(subscription.user_id, subscription.plan)


def activate_workspace_addon(addon, payment_method='manual', payment_reference=None):
    addon.status = 'active'
    addon.payment_status = 'verified' if payment_method == 'manual' else 'paid'
    addon.payment_method = addon.payment_method or payment_method
    addon.payment_reference = payment_reference or addon.payment_reference
    addon.activated_at = datetime.utcnow()
    if addon.workspace:
        addon.workspace.is_active = True
        addon.workspace.updated_at = datetime.utcnow()


@bp.route('/payments', methods=['GET'])
@admin_required
def get_all_payments():
    """
    Get all payments with optional filters
    Query params: status, payment_method, payment_type, start_date, end_date, limit, offset
    """
    try:
        # Get query parameters
        status = request.args.get('status')  # pending, completed, failed, etc.
        payment_method = request.args.get('payment_method')
        payment_type = request.args.get('payment_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Build query
        query = Payment.query

        if status:
            query = query.filter_by(status=status)
        if payment_method:
            query = query.filter_by(payment_method=payment_method)
        if payment_type:
            query = query.filter_by(payment_type=payment_type)
        if start_date:
            query = query.filter(Payment.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Payment.created_at <= datetime.fromisoformat(end_date))

        # Get total count
        total = query.count()

        # Get paginated results
        payments = query.order_by(Payment.created_at.desc()).limit(limit).offset(offset).all()

        return jsonify({
            'success': True,
            'payments': [payment.to_dict(include_relations=True) for payment in payments],
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/pending', methods=['GET'])
@admin_required
def get_pending_payments():
    """
    Get all payments pending verification
    These are manual payments (bank_transfer, etc.) waiting for admin approval
    """
    try:
        # Get payments that are pending or pending_verification
        payments = Payment.query.filter(
            Payment.payment_method.in_(['bank_transfer', 'ecocash', 'onemoney', 'cash', 'other']),
            Payment.status.in_(['pending', 'pending_verification'])
        ).order_by(Payment.created_at.desc()).all()

        # Also get bookings with pending payment status and proof uploaded
        bookings_with_proof = Booking.query.filter(
            Booking.payment_status == 'pending',
            Booking.proof_of_payment.isnot(None),
            Booking.payment_method.in_(['bank_transfer', 'manual'])
        ).all()

        # Get creator subscriptions with pending payment proof
        pending_creator_subs = CreatorSubscription.query.filter(
            CreatorSubscription.payment_status == 'pending_verification',
            CreatorSubscription.payment_proof_path.isnot(None)
        ).all()

        pending_brand_subs = Subscription.query.filter(
            Subscription.payment_status == 'pending_verification',
            Subscription.payment_proof_path.isnot(None)
        ).all()

        pending_workspace_addons = WorkspaceAddon.query.filter(
            WorkspaceAddon.payment_status == 'pending_verification',
            WorkspaceAddon.payment_proof_path.isnot(None)
        ).all()

        pending_campaign_cart_payments = CampaignPayment.query.filter(
            CampaignPayment.payment_method == 'bank_transfer',
            CampaignPayment.status == 'processing'
        ).order_by(CampaignPayment.created_at.desc()).all()

        # Format payment data with user information
        payments_data = []
        for payment in payments:
            payment_dict = payment.to_dict()

            # Add user information
            if payment.user:
                payment_dict['user_name'] = payment.user.name if hasattr(payment.user, 'name') else payment.user.email
                payment_dict['user_email'] = payment.user.email

            # Add booking information if available
            if payment.booking:
                payment_dict['booking'] = payment.booking.to_dict(include_relations=True)

            payments_data.append(payment_dict)

        # Format booking data as payments
        for booking in bookings_with_proof:
            brand_user = User.query.join(BrandProfile).filter(BrandProfile.id == booking.brand_id).first()
            creator = CreatorProfile.query.get(booking.creator_id)

            payments_data.append({
                'id': f'booking_{booking.id}',
                'booking_id': booking.id,
                'user_id': brand_user.id if brand_user else None,
                'user_name': brand_user.name if brand_user and hasattr(brand_user, 'name') else (brand_user.email if brand_user else 'Unknown'),
                'user_email': brand_user.email if brand_user else 'unknown@email.com',
                'amount': booking.amount,
                'payment_method': booking.payment_method,
                'payment_proof_url': booking.proof_of_payment,
                'status': 'pending_verification',
                'payment_category': booking.payment_category if hasattr(booking, 'payment_category') else 'package',
                'booking_type': booking.booking_type if hasattr(booking, 'booking_type') else 'direct',
                'created_at': booking.created_at.isoformat(),
                'creator_name': creator.username if creator else 'Unknown',
                'creator_email': creator.user.email if creator and creator.user else 'unknown@email.com'
            })

        # Format creator subscription data
        for creator_sub in pending_creator_subs:
            creator = CreatorProfile.query.get(creator_sub.creator_id)
            creator_user = creator.user if creator else None

            payments_data.append({
                'id': f'creator_sub_{creator_sub.id}',
                'creator_subscription_id': creator_sub.id,
                'user_id': creator_user.id if creator_user else None,
                'user_name': creator_user.name if creator_user and hasattr(creator_user, 'name') else (creator_user.email if creator_user else 'Unknown'),
                'user_email': creator_user.email if creator_user else 'unknown@email.com',
                'user_type': 'creator',
                'amount': float(creator_sub.plan.price) if creator_sub.plan else 0,
                'payment_method': creator_sub.payment_method,
                'payment_proof_url': creator_sub.payment_proof_path,
                'status': 'pending_verification',
                'payment_category': 'creator_subscription',
                'subscription_type': creator_sub.plan.subscription_type if creator_sub.plan else 'unknown',
                'subscription_plan': creator_sub.plan.name if creator_sub.plan else 'Unknown Plan',
                'created_at': creator_sub.created_at.isoformat(),
                'creator_name': creator.username if creator else 'Unknown',
                'creator_email': creator_user.email if creator_user else 'unknown@email.com'
            })

        # Format brand subscription data
        for brand_sub in pending_brand_subs:
            brand_user = User.query.get(brand_sub.user_id)
            brand = BrandProfile.query.filter_by(user_id=brand_sub.user_id).first()

            payments_data.append({
                'id': f'brand_sub_{brand_sub.id}',
                'brand_subscription_id': brand_sub.id,
                'user_id': brand_user.id if brand_user else None,
                'user_name': brand_user.name if brand_user and hasattr(brand_user, 'name') else (brand_user.email if brand_user else 'Unknown'),
                'user_email': brand_user.email if brand_user else 'unknown@email.com',
                'user_type': 'brand',
                'amount': float(get_brand_subscription_amount(brand_sub)),
                'payment_method': brand_sub.payment_method,
                'payment_proof_url': brand_sub.payment_proof_path,
                'status': 'pending_verification',
                'payment_category': 'brand_subscription',
                'subscription_plan': brand_sub.plan.name if brand_sub.plan else 'Unknown Plan',
                'billing_cycle': brand_sub.billing_cycle,
                'created_at': brand_sub.created_at.isoformat() if brand_sub.created_at else None,
                'brand_name': brand.company_name if brand else 'Unknown',
                'brand_email': brand_user.email if brand_user else 'unknown@email.com'
            })

        # Format workspace add-on data
        for addon in pending_workspace_addons:
            workspace = addon.workspace
            brand = BrandProfile.query.get(workspace.agency_brand_id) if workspace else None
            brand_user = User.query.get(brand.user_id) if brand else None

            payments_data.append({
                'id': f'workspace_addon_{addon.id}',
                'workspace_addon_id': addon.id,
                'user_id': brand_user.id if brand_user else None,
                'user_name': brand_user.name if brand_user and hasattr(brand_user, 'name') else (brand_user.email if brand_user else 'Unknown'),
                'user_email': brand_user.email if brand_user else 'unknown@email.com',
                'user_type': 'brand',
                'amount': float(addon.amount or 0),
                'payment_method': addon.payment_method,
                'payment_proof_url': addon.payment_proof_path,
                'status': 'pending_verification',
                'payment_category': 'workspace_addon',
                'subscription_plan': 'Extra Workspace Add-on',
                'billing_cycle': addon.billing_cycle,
                'created_at': addon.created_at.isoformat() if addon.created_at else None,
                'brand_name': brand.company_name if brand else 'Unknown',
                'workspace_name': workspace.name if workspace else 'Unknown',
            })

        for campaign_payment in pending_campaign_cart_payments:
            metadata = campaign_payment.payment_metadata or {}
            if not metadata.get('proof_path'):
                continue
            brand_user = User.query.get(campaign_payment.brand_user_id)
            brand = BrandProfile.query.filter_by(user_id=campaign_payment.brand_user_id).first()
            campaign = campaign_payment.campaign

            payments_data.append({
                'id': f'campaign_cart_{campaign_payment.id}',
                'campaign_payment_id': campaign_payment.id,
                'user_id': brand_user.id if brand_user else None,
                'user_name': brand_user.name if brand_user and hasattr(brand_user, 'name') else (brand_user.email if brand_user else 'Unknown'),
                'user_email': brand_user.email if brand_user else 'unknown@email.com',
                'user_type': 'brand',
                'amount': float(campaign_payment.total_amount or 0),
                'payment_method': campaign_payment.payment_method,
                'payment_proof_url': metadata.get('proof_path'),
                'status': 'pending_verification',
                'payment_category': 'campaign_cart',
                'campaign_name': campaign.title if campaign else 'Campaign',
                'brand_name': brand.company_name if brand else 'Unknown',
                'created_at': campaign_payment.created_at.isoformat() if campaign_payment.created_at else None,
            })

        return jsonify({
            'success': True,
            'payments': payments_data
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/statistics', methods=['GET'])
@admin_required
def get_payment_statistics():
    """
    Get payment statistics for admin dashboard
    """
    try:
        today = datetime.utcnow().date()
        month_start = datetime(today.year, today.month, 1)

        # Pending payments
        pending_payments = Payment.query.filter_by(status='pending').all()
        pending_count = len(pending_payments)
        pending_amount = sum(float(p.amount) for p in pending_payments)

        # Also count bookings with pending proof
        pending_bookings = Booking.query.filter(
            Booking.payment_status == 'pending',
            Booking.proof_of_payment.isnot(None)
        ).all()
        pending_count += len(pending_bookings)
        pending_amount += sum(float(b.amount) for b in pending_bookings)

        pending_campaign_cart_payments = CampaignPayment.query.filter(
            CampaignPayment.payment_method == 'bank_transfer',
            CampaignPayment.status == 'processing'
        ).all()
        pending_count += len(pending_campaign_cart_payments)
        pending_amount += sum(float(p.total_amount or 0) for p in pending_campaign_cart_payments)

        # Verified today
        verified_today = Payment.query.filter(
            Payment.verified_at >= datetime.combine(today, datetime.min.time()),
            Payment.status == 'completed'
        ).all()
        verified_today_count = len(verified_today)
        verified_today_amount = sum(float(p.amount) for p in verified_today)

        # This month
        month_payments = Payment.query.filter(
            Payment.created_at >= month_start,
            Payment.status == 'completed'
        ).all()
        month_count = len(month_payments)
        month_amount = sum(float(p.amount) for p in month_payments)

        # Total verified
        total_verified = Payment.query.filter_by(status='completed').all()
        total_verified_count = len(total_verified)
        total_verified_amount = sum(float(p.amount) for p in total_verified)

        return jsonify({
            'success': True,
            'statistics': {
                'pending_count': pending_count,
                'pending_amount': pending_amount,
                'verified_today_count': verified_today_count,
                'verified_today_amount': verified_today_amount,
                'month_count': month_count,
                'month_amount': month_amount,
                'total_verified_count': total_verified_count,
                'total_verified_amount': total_verified_amount
            }
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>', methods=['GET'])
@admin_required
def get_payment_details(payment_id):
    """
    Get detailed information about a specific payment
    """
    try:
        payment = Payment.query.get(payment_id)
        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        return jsonify({
            'success': True,
            'payment': payment.to_dict(include_relations=True)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>/verify', methods=['PUT'])
@admin_required
def verify_payment(payment_id):
    """
    Verify a manual payment
    Body: amount, payment_method, transaction_reference, payment_date, proof_url, notes
    """
    try:
        admin_id = int(get_jwt_identity())
        payment = Payment.query.get(payment_id)

        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        data = request.get_json()

        # Create payment verification record
        verification = PaymentVerification(
            payment_id=payment.id,
            booking_id=payment.booking_id,
            verified_by=admin_id,
            amount_verified=data.get('amount', payment.amount),
            payment_method=data.get('payment_method', payment.payment_method),
            transaction_reference=data.get('transaction_reference'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else None,
            proof_url=data.get('proof_url'),
            verification_notes=data.get('notes')
        )

        # Update payment status
        payment.status = 'completed'
        payment.verified_by = admin_id
        payment.verified_at = datetime.utcnow()
        payment.verification_notes = data.get('notes')
        payment.completed_at = datetime.utcnow()

        # If payment has a booking, update booking status
        if payment.booking:
            payment.booking.payment_status = 'verified'
            payment.booking.status = 'accepted'
            ensure_direct_booking_collaboration(payment.booking)

        db.session.add(verification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment verified successfully',
            'payment': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/<int:payment_id>/reject', methods=['PUT'])
@admin_required
def reject_payment(payment_id):
    """
    Reject a manual payment
    Body: notes (required)
    """
    try:
        admin_id = int(get_jwt_identity())
        payment = Payment.query.get(payment_id)

        if not payment:
            return jsonify({
                'success': False,
                'error': 'Payment not found'
            }), 404

        data = request.get_json()
        notes = data.get('notes')

        if not notes:
            return jsonify({
                'success': False,
                'error': 'Rejection notes are required'
            }), 400

        # Update payment status
        payment.status = 'failed'
        payment.verified_by = admin_id
        payment.verified_at = datetime.utcnow()
        payment.verification_notes = f"REJECTED: {notes}"

        # If payment has a booking, update booking status
        if payment.booking:
            payment.booking.payment_status = 'failed'

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Payment rejected',
            'payment': payment.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/manual', methods=['POST'])
@admin_required
def add_manual_payment():
    """
    Admin adds a manual payment (e.g., cash payment received directly)
    Body: booking_id, amount, payment_method, transaction_reference, payment_date, proof_url, notes
    """
    try:
        admin_id = int(get_jwt_identity())
        data = request.get_json()

        booking_id = data.get('booking_id')
        if not booking_id:
            return jsonify({
                'success': False,
                'error': 'Booking ID is required'
            }), 400

        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Booking not found'
            }), 404

        # Get brand user from booking
        brand = BrandProfile.query.get(booking.brand_id)
        if not brand:
            return jsonify({
                'success': False,
                'error': 'Brand not found'
            }), 404

        # Create payment record
        payment = Payment(
            booking_id=booking_id,
            user_id=brand.user_id,
            amount=data.get('amount', booking.amount),
            payment_method=data.get('payment_method', 'cash'),
            payment_type='admin_added',
            status='completed',
            payment_reference=data.get('transaction_reference'),
            verified_by=admin_id,
            verified_at=datetime.utcnow(),
            verification_notes=data.get('notes', 'Manual payment added by admin'),
            completed_at=datetime.utcnow()
        )

        # Create verification record
        verification = PaymentVerification(
            payment=payment,
            booking_id=booking_id,
            verified_by=admin_id,
            amount_verified=payment.amount,
            payment_method=payment.payment_method,
            transaction_reference=data.get('transaction_reference'),
            payment_date=datetime.fromisoformat(data['payment_date']) if data.get('payment_date') else datetime.utcnow(),
            proof_url=data.get('proof_url'),
            verification_notes=data.get('notes')
        )

        # Update booking payment status
        booking.payment_status = 'verified'
        booking.payment_method = payment.payment_method
        booking.status = 'accepted'
        ensure_direct_booking_collaboration(booking)

        db.session.add(payment)
        db.session.add(verification)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Manual payment added successfully',
            'payment': payment.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/creator-subscription/<int:subscription_id>/verify', methods=['PUT'])
@admin_required
def verify_creator_subscription_payment(subscription_id):
    """
    Verify a creator subscription manual payment
    Body: notes (optional)
    """
    try:
        from app.models import Notification
        admin_id = int(get_jwt_identity())
        subscription = CreatorSubscription.query.get(subscription_id)

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Subscription not found'
            }), 404

        data = request.get_json() or {}
        notes = data.get('notes', '')

        # Activate subscription
        subscription.payment_verified = True
        subscription.payment_status = 'verified'
        subscription.status = 'active'
        subscription.start_date = datetime.utcnow()

        # Set end date based on plan duration
        if subscription.plan and subscription.plan.duration_days:
            subscription.end_date = datetime.utcnow() + timedelta(days=subscription.plan.duration_days)

        subscription.updated_at = datetime.utcnow()

        # Auto-add to featured if this is a featured subscription
        if subscription.plan and subscription.plan.subscription_type == 'featured':
            creator = CreatorProfile.query.get(subscription.creator_id)
            if creator:
                creator.is_featured = True
                creator.featured_type = subscription.plan.featured_category or 'general'
                creator.featured_since = datetime.utcnow()

                # Calculate featured order based on existing featured creators of same type
                existing_featured = CreatorProfile.query.filter(
                    CreatorProfile.is_featured == True,
                    CreatorProfile.featured_type == creator.featured_type
                ).count()
                creator.featured_order = existing_featured

                # Send notification
                notification = Notification(
                    user_id=creator.user_id,
                    title=f'You are now Featured!',
                    message=f'Your profile has been featured on the BantuBuzz homepage ({creator.featured_type.title()} section). This will give you increased visibility to brands.',
                    type='success'
                )
                db.session.add(notification)

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Creator subscription payment verified successfully',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/creator-subscription/<int:subscription_id>/reject', methods=['PUT'])
@admin_required
def reject_creator_subscription_payment(subscription_id):
    """
    Reject a creator subscription manual payment
    Body: notes (required)
    """
    try:
        admin_id = int(get_jwt_identity())
        subscription = CreatorSubscription.query.get(subscription_id)

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Subscription not found'
            }), 404

        data = request.get_json()
        notes = data.get('notes')

        if not notes:
            return jsonify({
                'success': False,
                'error': 'Rejection notes are required'
            }), 400

        # Update subscription status
        subscription.payment_status = 'rejected'
        subscription.status = 'cancelled'
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Creator subscription payment rejected',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/brand-subscription/<int:subscription_id>/verify', methods=['PUT'])
@admin_required
def verify_brand_subscription_payment(subscription_id):
    """
    Verify a brand subscription manual payment.
    This is the bank-transfer path for paid brand plans, including Agency.
    """
    try:
        admin_id = int(get_jwt_identity())
        subscription = Subscription.query.get(subscription_id)

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Subscription not found'
            }), 404

        data = request.get_json() or {}
        notes = data.get('notes', '')
        amount = get_brand_subscription_amount(subscription)

        apply_paid_subscription(
            subscription,
            payment_method=subscription.payment_method or 'manual',
            payment_reference=subscription.payment_reference,
            amount=amount,
            billing_cycle=subscription.billing_cycle or 'monthly'
        )
        subscription.admin_note = notes
        subscription.modified_by_admin = admin_id
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Brand subscription payment verified successfully',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/brand-subscription/<int:subscription_id>/reject', methods=['PUT'])
@admin_required
def reject_brand_subscription_payment(subscription_id):
    """
    Reject a brand subscription manual payment.
    """
    try:
        admin_id = int(get_jwt_identity())
        subscription = Subscription.query.get(subscription_id)

        if not subscription:
            return jsonify({
                'success': False,
                'error': 'Subscription not found'
            }), 404

        data = request.get_json() or {}
        notes = data.get('notes')

        if not notes:
            return jsonify({
                'success': False,
                'error': 'Rejection notes are required'
            }), 400

        subscription.payment_status = 'rejected'
        subscription.status = 'cancelled'
        subscription.admin_note = f"REJECTED: {notes}"
        subscription.modified_by_admin = admin_id
        subscription.updated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Brand subscription payment rejected',
            'subscription': subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/workspace-addon/<int:addon_id>/verify', methods=['PUT'])
@admin_required
def verify_workspace_addon_payment(addon_id):
    """
    Verify an extra workspace add-on manual payment.
    """
    try:
        admin_id = int(get_jwt_identity())
        addon = WorkspaceAddon.query.get(addon_id)

        if not addon:
            return jsonify({
                'success': False,
                'error': 'Workspace add-on not found'
            }), 404

        data = request.get_json() or {}
        notes = data.get('notes', '')

        activate_workspace_addon(addon, 'manual')

        if addon.subscription:
            existing_note = addon.subscription.admin_note or ''
            addon.subscription.admin_note = f"{existing_note}\nWorkspace add-on {addon.id} verified by admin {admin_id}: {notes}".strip()
            addon.subscription.modified_by_admin = admin_id

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workspace add-on payment verified successfully',
            'addon': addon.to_dict(),
            'workspace': addon.workspace.to_dict(include_counts=True) if addon.workspace else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/workspace-addon/<int:addon_id>/reject', methods=['PUT'])
@admin_required
def reject_workspace_addon_payment(addon_id):
    """
    Reject an extra workspace add-on manual payment.
    """
    try:
        admin_id = int(get_jwt_identity())
        addon = WorkspaceAddon.query.get(addon_id)

        if not addon:
            return jsonify({
                'success': False,
                'error': 'Workspace add-on not found'
            }), 404

        data = request.get_json() or {}
        notes = data.get('notes')

        if not notes:
            return jsonify({
                'success': False,
                'error': 'Rejection notes are required'
            }), 400

        addon.payment_status = 'rejected'
        addon.status = 'rejected'
        addon.payment_reference = f'REJECTED-BY-{admin_id}'
        if addon.workspace:
            addon.workspace.is_active = False
            addon.workspace.updated_at = datetime.utcnow()

        if addon.subscription:
            existing_note = addon.subscription.admin_note or ''
            addon.subscription.admin_note = f"{existing_note}\nWorkspace add-on {addon.id} rejected by admin {admin_id}: {notes}".strip()
            addon.subscription.modified_by_admin = admin_id

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Workspace add-on payment rejected',
            'addon': addon.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/payments/campaign-cart/<int:payment_id>/verify', methods=['PUT'])
@admin_required
def verify_campaign_cart_payment(payment_id):
    """Verify a campaign cart bank-transfer payment and activate its collaborations."""
    try:
        admin_id = int(get_jwt_identity())
        payment = CampaignPayment.query.get(payment_id)

        if not payment:
            return jsonify({'success': False, 'error': 'Campaign payment not found'}), 404

        data = request.get_json() or {}
        metadata = payment.payment_metadata or {}
        metadata['verified_by'] = admin_id
        metadata['verification_notes'] = data.get('notes', '')
        payment.payment_metadata = metadata

        from app.services.campaign_cart_payment_service import complete_campaign_cart_payment
        complete_campaign_cart_payment(
            payment,
            data.get('transaction_reference') or payment.payment_reference,
            'bank_transfer',
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Campaign cart payment verified successfully',
            'payment': payment.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/payments/campaign-cart/<int:payment_id>/reject', methods=['PUT'])
@admin_required
def reject_campaign_cart_payment(payment_id):
    """Reject a campaign cart bank-transfer proof."""
    try:
        admin_id = int(get_jwt_identity())
        payment = CampaignPayment.query.get(payment_id)

        if not payment:
            return jsonify({'success': False, 'error': 'Campaign payment not found'}), 404

        data = request.get_json() or {}
        notes = data.get('notes')
        if not notes:
            return jsonify({'success': False, 'error': 'Rejection notes are required'}), 400

        metadata = payment.payment_metadata or {}
        metadata['rejected_by'] = admin_id
        metadata['rejection_notes'] = notes
        payment.payment_metadata = metadata
        payment.status = 'failed'
        payment.failed_reason = notes
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Campaign cart payment rejected',
            'payment': payment.to_dict(),
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/bookings', methods=['GET'])
@admin_required
def get_all_bookings():
    """
    Get all bookings with optional filters
    Query params: payment_status, payment_category, booking_type, start_date, end_date, limit, offset
    """
    try:
        # Get query parameters
        payment_status = request.args.get('payment_status')
        payment_category = request.args.get('payment_category')
        booking_type = request.args.get('booking_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        # Build query
        query = Booking.query

        if payment_status:
            query = query.filter_by(payment_status=payment_status)
        if payment_category and hasattr(Booking, 'payment_category'):
            query = query.filter_by(payment_category=payment_category)
        if booking_type and hasattr(Booking, 'booking_type'):
            query = query.filter_by(booking_type=booking_type)
        if start_date:
            query = query.filter(Booking.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Booking.created_at <= datetime.fromisoformat(end_date))

        # Get total count
        total = query.count()

        # Get paginated results
        bookings = query.order_by(Booking.created_at.desc()).limit(limit).offset(offset).all()

        # Format bookings with full details
        bookings_data = []
        for booking in bookings:
            booking_dict = booking.to_dict(include_relations=True)

            # Add payment type display
            payment_category = booking.payment_category if hasattr(booking, 'payment_category') else 'package'
            booking_type_val = booking.booking_type if hasattr(booking, 'booking_type') else 'direct'

            payment_type_map = {
                'direct-package': 'Package Purchase',
                'campaign_application-campaign': 'Campaign Application Accepted',
                'campaign_package-package': 'Package Added to Campaign',
                'direct-revision': 'Paid Revision',
                'brief_proposal-brief': 'Brief Proposal Accepted'
            }

            key = f'{booking_type_val}-{payment_category}'
            booking_dict['payment_type_display'] = payment_type_map.get(key, 'Payment')

            bookings_data.append(booking_dict)

        return jsonify({
            'success': True,
            'bookings': bookings_data,
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@bp.route('/bookings/<int:booking_id>', methods=['GET'])
@admin_required
def get_booking_details(booking_id):
    """
    Get detailed information about a specific booking
    """
    try:
        booking = Booking.query.get(booking_id)
        if not booking:
            return jsonify({
                'success': False,
                'error': 'Booking not found'
            }), 404

        booking_dict = booking.to_dict(include_relations=True)

        # Get associated payments
        payments = Payment.query.filter_by(booking_id=booking_id).all()
        booking_dict['payments'] = [p.to_dict() for p in payments]

        # Add payment type display
        payment_category = booking.payment_category if hasattr(booking, 'payment_category') else 'package'
        booking_type_val = booking.booking_type if hasattr(booking, 'booking_type') else 'direct'

        payment_type_map = {
            'direct-package': 'Package Purchase',
            'campaign_application-campaign': 'Campaign Application Accepted',
            'campaign_package-package': 'Package Added to Campaign',
            'direct-revision': 'Paid Revision',
            'brief_proposal-brief': 'Brief Proposal Accepted'
        }

        key = f'{booking_type_val}-{payment_category}'
        booking_dict['payment_type_display'] = payment_type_map.get(key, 'Payment')

        return jsonify({
            'success': True,
            'booking': booking_dict
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
