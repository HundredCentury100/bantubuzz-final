from datetime import datetime, timedelta
from decimal import Decimal

from app import db
from app.models import (
    Campaign,
    CampaignCartItem,
    CampaignPayment,
    CampaignPaymentItem,
    Collaboration,
    CreatorProfile,
    Payment,
    User,
    Wallet,
    WalletTransaction,
)
from app.services.email_service import EmailService, send_email
from app.utils.notifications import create_notification
from app.utils.subscription_helper import get_brand_service_fee_percentage
from app.utils.bank_details import get_bank_transfer_details


def money(value):
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def coerce_bool(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"false", "0", "no", "n", "off"}:
            return False
        if normalized in {"true", "1", "yes", "y", "on"}:
            return True
    return bool(value)


def get_bank_details(reference):
    return get_bank_transfer_details(reference)


def get_cart_items_for_payment(campaign_id, brand_id, cart_item_ids=None):
    query = CampaignCartItem.query.filter_by(
        campaign_id=campaign_id,
        brand_id=brand_id,
        payment_status="pending",
    )
    if cart_item_ids:
        query = query.filter(CampaignCartItem.id.in_(cart_item_ids))
    items = query.order_by(CampaignCartItem.added_at.asc()).all()
    if cart_item_ids and len(items) != len(set(cart_item_ids)):
        raise ValueError("Some cart items were not found or have already been paid")
    return items


def get_item_subtotal(cart_items):
    return sum((money(item.amount) for item in cart_items), Decimal("0.00"))


def create_campaign_cart_payment(
    campaign,
    brand_user_id,
    cart_items,
    payment_type,
    payment_method,
    collaboration_details=None,
    requires_content_review=True,
):
    if not cart_items:
        raise ValueError("No pending items in cart")

    subtotal = get_item_subtotal(cart_items)
    service_fee_percentage = Decimal(str(get_brand_service_fee_percentage(brand_user_id)))
    platform_fee = (subtotal * service_fee_percentage / Decimal("100")).quantize(Decimal("0.01"))
    total_amount = subtotal + platform_fee
    reference = f"CAMP-CART-{campaign.id}-{int(datetime.utcnow().timestamp())}"

    payment = CampaignPayment(
        campaign_id=campaign.id,
        brand_user_id=brand_user_id,
        workspace_id=campaign.workspace_id,
        payment_type=payment_type,
        total_amount=total_amount,
        platform_fee=platform_fee,
        net_amount=subtotal,
        payment_method=payment_method,
        payment_reference=reference,
        status="pending" if payment_method == "bank_transfer" else "processing",
        payment_metadata={
            "source": "campaign_cart",
            "cart_item_ids": [item.id for item in cart_items],
            "collaboration_details": collaboration_details or {},
            "requires_content_review": coerce_bool(requires_content_review, True),
            "service_fee_percentage": float(service_fee_percentage),
            "subtotal": float(subtotal),
        },
    )
    db.session.add(payment)
    db.session.flush()
    return payment


def _deliverables_for_item(cart_item, campaign):
    if cart_item.custom_deliverables:
        return cart_item.custom_deliverables
    if cart_item.package and cart_item.package.deliverables:
        return cart_item.package.deliverables
    if cart_item.proposal and cart_item.proposal.milestones:
        deliverables = []
        for milestone in cart_item.proposal.milestones or []:
            deliverables.extend(milestone.get("deliverables") or [])
        return deliverables
    deliverables = []
    for milestone in campaign.milestones.all():
        deliverables.extend(milestone.deliverables or [])
    return deliverables


def _title_for_item(cart_item, campaign):
    if cart_item.package:
        return f"{campaign.title}: {cart_item.package.title}"
    if cart_item.proposal:
        return f"{campaign.title}: Creator Proposal"
    return campaign.title


def _description_for_item(cart_item, campaign):
    if cart_item.package:
        return cart_item.package.description
    if cart_item.proposal:
        return cart_item.proposal.proposal_message
    return campaign.description


def _expected_completion_for_item(cart_item, campaign):
    start_date = datetime.utcnow()
    if cart_item.package and cart_item.package.duration_days:
        return start_date + timedelta(days=cart_item.package.duration_days)
    if cart_item.proposal and cart_item.proposal.delivery_timeline_days:
        return start_date + timedelta(days=cart_item.proposal.delivery_timeline_days)
    if campaign.timeline_days:
        return start_date + timedelta(days=campaign.timeline_days)
    return campaign.end_date or (start_date + timedelta(days=30))


def _brand_name(campaign):
    if campaign.brand:
        return campaign.brand.company_name or campaign.brand.display_name or "A brand"
    return "A brand"


def _notify_creator(collaboration, campaign):
    creator_user = User.query.get(collaboration.creator.user_id) if collaboration.creator else None
    if not creator_user:
        return

    create_notification(
        creator_user.id,
        "collaboration",
        "Campaign Collaboration Active",
        f'Your collaboration for "{campaign.title}" is now active. You can start delivery.',
        f"/creator/collaborations/{collaboration.id}",
    )
    try:
        send_email(
            "Your campaign collaboration is active",
            creator_user.email,
            f"""Hi {collaboration.creator.display_name or collaboration.creator.username},

{_brand_name(campaign)} has completed payment for "{campaign.title}".
Your collaboration is now active and ready for delivery.

Open it here: https://bantubuzz.com/creator/collaborations/{collaboration.id}
""",
        )
    except Exception as error:
        print(f"Failed to send campaign collaboration activation email: {error}")


def complete_campaign_cart_payment(payment, payment_reference=None, payment_method=None):
    if payment.status == "completed":
        return []

    campaign = Campaign.query.get(payment.campaign_id)
    if not campaign:
        raise ValueError("Campaign not found")

    metadata = payment.payment_metadata or {}
    cart_item_ids = metadata.get("cart_item_ids") or []
    collaboration_details = metadata.get("collaboration_details") or {}
    requires_content_review = coerce_bool(metadata.get("requires_content_review"), True)
    cart_items = CampaignCartItem.query.filter(
        CampaignCartItem.id.in_(cart_item_ids),
        CampaignCartItem.payment_status == "pending",
    ).all()

    if not cart_items:
        payment.status = "completed"
        payment.completed_at = datetime.utcnow()
        db.session.flush()
        return []

    created_collaborations = []
    item_amounts = {item.id: money(item.amount) for item in cart_items}
    subtotal = sum(item_amounts.values(), Decimal("0.00"))
    service_fee_percentage = Decimal(str(metadata.get("service_fee_percentage") or get_brand_service_fee_percentage(payment.brand_user_id)))

    for cart_item in cart_items:
        deliverables = _deliverables_for_item(cart_item, campaign)
        if not deliverables:
            raise ValueError("Cannot activate a campaign collaboration without at least one deliverable")

        start_date = datetime.utcnow()
        collaboration_type = "package" if cart_item.item_type == "package" and cart_item.package_id else "campaign"

        collaboration = Collaboration(
            collaboration_type=collaboration_type,
            campaign_application_id=cart_item.proposal_id if cart_item.item_type == "application" else None,
            brand_id=cart_item.brand_id,
            creator_id=cart_item.creator_id,
            workspace_id=campaign.workspace_id,
            title=_title_for_item(cart_item, campaign),
            description=_description_for_item(cart_item, campaign),
            amount=cart_item.amount,
            status="in_progress",
            progress_percentage=0,
            escrow_status="escrowed",
            deliverables=deliverables,
            start_date=start_date,
            expected_completion_date=_expected_completion_for_item(cart_item, campaign),
            requires_content_review=requires_content_review,
            brief=collaboration_details.get("brief"),
            guidelines=collaboration_details.get("guidelines"),
            rules=collaboration_details.get("rules"),
            additional_notes=collaboration_details.get("additional_notes") or cart_item.notes,
        )
        db.session.add(collaboration)
        db.session.flush()

        try:
            from app.routes.bookings import create_no_track_deliverables
            create_no_track_deliverables(collaboration)
        except Exception as error:
            print(f"Failed to create campaign cart deliverables for collaboration {collaboration.id}: {error}")

        cart_item.mark_as_paid(payment_reference or payment.payment_reference)
        cart_item.link_collaboration(collaboration.id)

        if cart_item.proposal:
            cart_item.proposal.status = "accepted"
            cart_item.proposal.reviewed_at = datetime.utcnow()
        if cart_item.invitation:
            cart_item.invitation.status = "accepted"

        item_fee = (item_amounts[cart_item.id] * service_fee_percentage / Decimal("100")).quantize(Decimal("0.01"))
        creator_user_id = cart_item.creator.user_id if cart_item.creator else None
        if creator_user_id:
            db.session.add(CampaignPaymentItem(
                campaign_payment_id=payment.id,
                collaboration_id=collaboration.id,
                creator_user_id=creator_user_id,
                amount=cart_item.amount,
                platform_fee=item_fee,
                net_amount=cart_item.amount,
                status="paid",
                paid_at=datetime.utcnow(),
            ))

        db.session.add(Payment(
            collaboration_id=collaboration.id,
            user_id=payment.brand_user_id,
            amount=cart_item.amount,
            payment_method=payment_method or payment.payment_method,
            payment_type="campaign_cart",
            status="completed",
            payment_reference=payment_reference or payment.payment_reference,
            escrow_status="escrowed",
            held_amount=cart_item.amount,
            completed_at=datetime.utcnow(),
        ))

        created_collaborations.append(collaboration)
        _notify_creator(collaboration, campaign)

    payment.status = "completed"
    payment.completed_at = datetime.utcnow()
    payment.payment_reference = payment_reference or payment.payment_reference
    payment.payment_method = payment_method or payment.payment_method
    metadata["completed_cart_item_ids"] = [item.id for item in cart_items]
    metadata["collaboration_ids"] = [collaboration.id for collaboration in created_collaborations]
    metadata["subtotal"] = float(subtotal)
    payment.payment_metadata = metadata

    if campaign.status == "draft":
        campaign.status = "active"

    try:
        brand_user = User.query.get(payment.brand_user_id)
        if brand_user:
            brand_name = campaign.brand.company_name if campaign.brand else brand_user.email
            EmailService.send_campaign_payment_notification_email(
                payment_id=payment.id,
                recipient_email=brand_user.email,
                recipient_name=brand_name,
                is_brand=True,
            )
    except Exception as error:
        print(f"Failed to send campaign paid invoice email: {error}")

    db.session.flush()
    return created_collaborations


def pay_campaign_cart_with_wallet(payment):
    wallet = Wallet.query.filter_by(user_id=payment.brand_user_id).first()
    if not wallet:
        raise ValueError("Wallet not found")

    available_balance = money(wallet.available_balance)
    total_amount = money(payment.total_amount)
    if available_balance < total_amount:
        raise ValueError(f"Insufficient wallet balance. Available: ${available_balance}, Required: ${total_amount}")

    wallet.available_balance = available_balance - total_amount
    wallet.total_spent = money(wallet.total_spent) + total_amount
    wallet.updated_at = datetime.utcnow()

    transaction = WalletTransaction(
        wallet_id=wallet.id,
        user_id=payment.brand_user_id,
        transaction_type="payment",
        amount=-abs(total_amount),
        status="available",
        clearance_required=False,
        description=f"Campaign cart payment for {payment.campaign.title if payment.campaign else 'campaign'}",
        transaction_metadata={
            "campaign_payment_id": payment.id,
            "campaign_id": payment.campaign_id,
            "payment_reference": payment.payment_reference,
        },
    )
    db.session.add(transaction)
    db.session.flush()

    payment.payment_method = "wallet"
    payment.payment_reference = f"WALLET-{transaction.id}"
    return complete_campaign_cart_payment(payment, payment.payment_reference, "wallet")
