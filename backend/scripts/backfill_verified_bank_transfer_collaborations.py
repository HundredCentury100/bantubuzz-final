"""Backfill collaborations for verified direct bank-transfer bookings."""

from app import create_app, db
from app.models import Booking, Collaboration
from app.routes.admin.payments import ensure_direct_booking_collaboration


def main():
    app = create_app()

    with app.app_context():
        bookings = Booking.query.filter(
            Booking.payment_method == 'bank_transfer',
            Booking.payment_status.in_(['verified', 'paid']),
            Booking.booking_type.in_([None, 'direct'])
        ).all()

        created = 0
        skipped = 0

        for booking in bookings:
            existing = Collaboration.query.filter_by(booking_id=booking.id).first()
            if existing:
                skipped += 1
                continue

            ensure_direct_booking_collaboration(booking)
            booking.status = 'accepted'
            created += 1

        db.session.commit()

        print(f"Created {created} missing collaborations")
        print(f"Skipped {skipped} bookings that already had collaborations")


if __name__ == '__main__':
    main()
