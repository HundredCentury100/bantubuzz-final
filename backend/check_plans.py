"""
Script to check current subscription plans in database
"""
import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models.subscription_plan import SubscriptionPlan

app = create_app()

with app.app_context():
    plans = SubscriptionPlan.query.all()

    print("\n=== Current Subscription Plans ===")
    print(f"{'ID':<5} {'Name':<20} {'Slug':<20} {'Monthly':<10} {'Yearly':<10}")
    print("-" * 70)

    for plan in plans:
        print(f"{plan.id:<5} {plan.name:<20} {plan.slug:<20} ${float(plan.price_monthly):<9.2f} ${float(plan.price_yearly):<9.2f}")

    print(f"\nTotal plans: {len(plans)}\n")
