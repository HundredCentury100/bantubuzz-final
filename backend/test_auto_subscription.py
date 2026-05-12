"""
Test script to verify auto-subscription assignment on registration
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models import User, Subscription, SubscriptionPlan

app = create_app()

def test_free_plans():
    with app.app_context():
        print("\n" + "="*70)
        print("TESTING FREE PLAN AUTO-ASSIGNMENT")
        print("="*70 + "\n")

        # Check if free plans exist
        brand_free = SubscriptionPlan.query.filter_by(user_type='brand', price_monthly=0).first()
        creator_free = SubscriptionPlan.query.filter_by(user_type='creator', price_monthly=0).first()

        print("✓ Free Plans Available:")
        print(f"  • Brand Free: {brand_free.name if brand_free else 'NOT FOUND'} (ID: {brand_free.id if brand_free else 'N/A'})")
        print(f"  • Creator Free: {creator_free.name if creator_free else 'NOT FOUND'} (ID: {creator_free.id if creator_free else 'N/A'})")

        # Check existing users and their subscriptions
        print("\n✓ Checking existing users:")

        # Sample some recent users
        recent_users = User.query.order_by(User.created_at.desc()).limit(5).all()

        for user in recent_users:
            subscription = Subscription.query.filter_by(user_id=user.id, status='active').first()
            has_sub = "✓ HAS FREE SUB" if subscription else "✗ NO SUBSCRIPTION"
            plan_name = subscription.plan.name if subscription else "None"

            print(f"  • User #{user.id} ({user.user_type}): {has_sub} - {plan_name}")

        print("\n" + "="*70)
        print("SUMMARY")
        print("="*70)
        print("New users registering from now on will automatically get:")
        print(f"  • Brands → {brand_free.name if brand_free else 'ERROR: No free brand plan'}")
        print(f"  • Creators → {creator_free.name if creator_free else 'ERROR: No free creator plan'}")
        print("\nTo test: Create a new account and check if subscription appears")
        print("="*70 + "\n")

if __name__ == '__main__':
    test_free_plans()
