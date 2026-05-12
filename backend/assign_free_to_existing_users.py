"""
Assign free subscriptions to all existing users who don't have one
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models import User, Subscription, SubscriptionPlan
from datetime import datetime

app = create_app()

def assign_free_subscriptions():
    with app.app_context():
        print("\n" + "="*70)
        print("ASSIGNING FREE SUBSCRIPTIONS TO EXISTING USERS")
        print("="*70 + "\n")

        # Get free plans
        brand_free = SubscriptionPlan.query.filter_by(user_type='brand', price_monthly=0).first()
        creator_free = SubscriptionPlan.query.filter_by(user_type='creator', price_monthly=0).first()

        if not brand_free or not creator_free:
            print("ERROR: Free plans not found!")
            return

        print(f"Using plans:")
        print(f"  • Brand Free: {brand_free.name} (ID: {brand_free.id})")
        print(f"  • Creator Free: {creator_free.name} (ID: {creator_free.id})\n")

        # Get all users without active subscriptions
        all_users = User.query.all()
        assigned_count = 0
        skipped_count = 0

        for user in all_users:
            # Check if user already has an active subscription
            existing_sub = Subscription.query.filter_by(
                user_id=user.id,
                status='active'
            ).first()

            if existing_sub:
                print(f"⊘ User #{user.id} ({user.user_type}) already has subscription: {existing_sub.plan.name}")
                skipped_count += 1
                continue

            # Assign appropriate free plan
            free_plan = brand_free if user.user_type == 'brand' else creator_free

            free_subscription = Subscription(
                user_id=user.id,
                plan_id=free_plan.id,
                status='active',
                billing_cycle='monthly',
                payment_method='free'
            )
            free_subscription.set_billing_period('monthly')
            free_subscription.last_payment_date = datetime.utcnow()

            db.session.add(free_subscription)
            print(f"✓ Assigned {free_plan.name} to User #{user.id} ({user.user_type})")
            assigned_count += 1

        # Commit all changes
        db.session.commit()

        print("\n" + "="*70)
        print("MIGRATION COMPLETE")
        print("="*70)
        print(f"✓ Assigned free plans: {assigned_count} users")
        print(f"⊘ Skipped (already have subscription): {skipped_count} users")
        print(f"Total users processed: {len(all_users)}")
        print("="*70 + "\n")

if __name__ == '__main__':
    print("\nWARNING: This will assign free subscriptions to all existing users without one.")
    confirm = input("Do you want to proceed? (yes/no): ")

    if confirm.lower() == 'yes':
        assign_free_subscriptions()
    else:
        print("\nMigration cancelled.")
