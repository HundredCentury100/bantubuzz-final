from app import create_app, db
from app.models import SubscriptionPlan

app = create_app()
with app.app_context():
    brand_plans = SubscriptionPlan.query.filter_by(user_type='brand').order_by(SubscriptionPlan.price_monthly).all()
    print('Updated Brand Plans:')
    print('-' * 100)
    print(f"{'Plan':<15} {'Price':<10} {'Fee':<8} {'Campaigns':<12} {'Collabs':<10} {'Team':<8} {'Lists':<10}")
    print('-' * 100)
    for plan in brand_plans:
        campaigns = 'Unlimited' if plan.max_active_campaigns == -1 else str(plan.max_active_campaigns)
        collabs = 'Unlimited' if plan.max_active_collaborations == -1 else str(plan.max_active_collaborations)
        lists = 'Unlimited' if plan.max_creator_lists == -1 else str(plan.max_creator_lists)
        print(f"{plan.name:<15} ${plan.price_monthly:<9.2f} {plan.platform_fee_percentage:<7.0f}% {campaigns:<12} {collabs:<10} {plan.max_team_members:<8} {lists:<10}")
