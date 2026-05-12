"""
Subscription Enforcement Service
Centralized service to check subscription limits and permissions
"""
from typing import Tuple, Dict, Optional
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

from app.models import (
    User, Subscription, SubscriptionPlan, SubscriptionUsage,
    Collaboration, Package, CreatorProfile, Campaign,
    Proposal
)
from app import db
from app.services.email_service import send_subscription_limit_reached_email


class SubscriptionEnforcementService:
    """Service for enforcing subscription plan restrictions"""

    # ========================================================================
    # CREATOR ENFORCEMENT METHODS
    # ========================================================================

    @staticmethod
    def can_accept_collaboration(creator_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if creator can accept a new collaboration
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(creator_user_id)
        if not user or user.user_type != 'creator':
            return False, 'Invalid creator', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=creator_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current active collaborations count
        active_collabs = Collaboration.query.filter_by(
            creator_id=creator_user_id,
            status='active'
        ).count()

        # Get limit from plan
        max_active = subscription.plan.max_active_collaborations

        # -1 or None means unlimited
        if max_active and max_active != -1 and active_collabs >= max_active:
            # Send email notification
            SubscriptionEnforcementService.send_limit_reached_notification(
                creator_user_id, 'active_collaborations', max_active
            )

            return False, f'You have reached your plan limit of {max_active} active collaborations', {
                'current': active_collabs,
                'limit': max_active,
                'feature': 'active_collaborations',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': active_collabs,
            'limit': max_active if max_active and max_active != -1 else 'Unlimited',
            'feature': 'active_collaborations'
        }

    @staticmethod
    def can_send_proposal(creator_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if creator can send a proposal this month
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(creator_user_id)
        if not user or user.user_type != 'creator':
            return False, 'Invalid creator', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=creator_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current month usage
        usage = SubscriptionUsage.get_or_create_current_month(creator_user_id)

        # Get limit from plan
        max_proposals = subscription.plan.max_bookings_per_month

        # -1 or None means unlimited
        if max_proposals and max_proposals != -1 and usage.proposals_sent >= max_proposals:
            # Send email notification
            SubscriptionEnforcementService.send_limit_reached_notification(
                creator_user_id, 'proposals_per_month', max_proposals
            )

            next_month = usage.month + relativedelta(months=1)
            return False, f'You have reached your plan limit of {max_proposals} proposals per month', {
                'current': usage.proposals_sent,
                'limit': max_proposals,
                'feature': 'proposals_per_month',
                'plan_name': subscription.plan.name,
                'resets_at': next_month.isoformat(),
                'upgrade_required': True
            }

        return True, '', {
            'current': usage.proposals_sent,
            'limit': max_proposals if max_proposals and max_proposals != -1 else 'Unlimited',
            'feature': 'proposals_per_month',
            'resets_at': (usage.month + relativedelta(months=1)).isoformat()
        }

    @staticmethod
    def can_create_package(creator_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if creator can create a new package
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(creator_user_id)
        if not user or user.user_type != 'creator':
            return False, 'Invalid creator', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=creator_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current package count
        package_count = Package.query.filter_by(
            creator_id=creator_user_id,
            is_active=True
        ).count()

        # Get limit from plan
        max_packages = subscription.plan.max_packages

        # -1 or None means unlimited
        if max_packages and max_packages != -1 and package_count >= max_packages:
            # Send email notification
            SubscriptionEnforcementService.send_limit_reached_notification(
                creator_user_id, 'packages', max_packages
            )

            return False, f'You have reached your plan limit of {max_packages} active packages', {
                'current': package_count,
                'limit': max_packages,
                'feature': 'max_packages',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': package_count,
            'limit': max_packages if max_packages and max_packages != -1 else 'Unlimited',
            'feature': 'max_packages'
        }

    @staticmethod
    def can_add_portfolio_item(creator_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if creator can add a portfolio item
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(creator_user_id)
        if not user or user.user_type != 'creator':
            return False, 'Invalid creator', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=creator_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current portfolio count (assuming portfolio items are stored in creator_profile)
        creator = CreatorProfile.query.filter_by(user_id=creator_user_id).first()
        if not creator:
            return False, 'Creator profile not found', {}

        # Assuming portfolio_items is a JSON field or separate table
        # For now, we'll use a placeholder count
        portfolio_count = 0  # TODO: Implement actual portfolio count

        # Get limit from plan
        max_portfolio = subscription.plan.max_portfolio_items

        # -1 or None means unlimited
        if max_portfolio and max_portfolio != -1 and portfolio_count >= max_portfolio:
            return False, f'You have reached your plan limit of {max_portfolio} portfolio items', {
                'current': portfolio_count,
                'limit': max_portfolio,
                'feature': 'portfolio_items',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': portfolio_count,
            'limit': max_portfolio if max_portfolio and max_portfolio != -1 else 'Unlimited',
            'feature': 'portfolio_items'
        }

    @staticmethod
    def can_message_brand_first(creator_user_id: int, brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if creator can initiate DM with a brand
        Returns: (can_proceed, error_message, subscription_info)
        """
        user = User.query.get(creator_user_id)
        if not user or user.user_type != 'creator':
            return False, 'Invalid creator', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=creator_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Check if plan allows messaging brands first
        can_message = subscription.plan.can_message_brands_first

        if not can_message:
            return False, 'Your plan does not allow initiating messages with brands. Upgrade to Pro Creator to unlock this feature.', {
                'feature': 'message_brands_first',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'feature': 'message_brands_first',
            'plan_name': subscription.plan.name
        }

    # ========================================================================
    # BRAND ENFORCEMENT METHODS
    # ========================================================================

    @staticmethod
    def can_create_campaign(brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if brand can create a new campaign
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(brand_user_id)
        if not user or user.user_type != 'brand':
            return False, 'Invalid brand', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=brand_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current active campaigns count
        active_campaigns = Campaign.query.filter_by(
            brand_id=brand_user_id,
            status='active'
        ).count()

        # Get limit from plan
        max_campaigns = subscription.plan.max_active_campaigns

        # -1 or None means unlimited
        if max_campaigns and max_campaigns != -1 and active_campaigns >= max_campaigns:
            # Send email notification
            SubscriptionEnforcementService.send_limit_reached_notification(
                brand_user_id, 'campaigns_per_month', max_campaigns
            )

            return False, f'You have reached your plan limit of {max_campaigns} active campaigns', {
                'current': active_campaigns,
                'limit': max_campaigns,
                'feature': 'active_campaigns',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': active_campaigns,
            'limit': max_campaigns if max_campaigns and max_campaigns != -1 else 'Unlimited',
            'feature': 'active_campaigns'
        }

    @staticmethod
    def can_initiate_collaboration(brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if brand can initiate a new collaboration
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(brand_user_id)
        if not user or user.user_type != 'brand':
            return False, 'Invalid brand', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=brand_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current active collaborations count
        active_collabs = Collaboration.query.filter_by(
            brand_id=brand_user_id,
            status='active'
        ).count()

        # Get limit from plan
        max_collabs = subscription.plan.max_active_collaborations

        # -1 or None means unlimited
        if max_collabs and max_collabs != -1 and active_collabs >= max_collabs:
            return False, f'You have reached your plan limit of {max_collabs} active collaborations', {
                'current': active_collabs,
                'limit': max_collabs,
                'feature': 'active_collaborations',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': active_collabs,
            'limit': max_collabs if max_collabs and max_collabs != -1 else 'Unlimited',
            'feature': 'active_collaborations'
        }

    @staticmethod
    def can_add_team_member(brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if brand can add a team member
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(brand_user_id)
        if not user or user.user_type != 'brand':
            return False, 'Invalid brand', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=brand_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current team member count
        # TODO: Implement team members table/model
        team_count = 1  # Placeholder - includes the brand owner

        # Get limit from plan
        max_team = subscription.plan.max_team_members

        # -1 or None means unlimited
        if max_team and max_team != -1 and team_count >= max_team:
            return False, f'You have reached your plan limit of {max_team} team members', {
                'current': team_count,
                'limit': max_team,
                'feature': 'team_members',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': team_count,
            'limit': max_team if max_team and max_team != -1 else 'Unlimited',
            'feature': 'team_members'
        }

    @staticmethod
    def can_create_creator_list(brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if brand can create a saved creator list
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(brand_user_id)
        if not user or user.user_type != 'brand':
            return False, 'Invalid brand', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=brand_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current creator list count
        # TODO: Implement creator lists table/model
        list_count = 0  # Placeholder

        # Get limit from plan
        max_lists = subscription.plan.max_creator_lists

        # -1 or None means unlimited
        if max_lists and max_lists != -1 and list_count >= max_lists:
            return False, f'You have reached your plan limit of {max_lists} creator lists', {
                'current': list_count,
                'limit': max_lists,
                'feature': 'creator_lists',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': list_count,
            'limit': max_lists if max_lists and max_lists != -1 else 'Unlimited',
            'feature': 'creator_lists'
        }

    @staticmethod
    def can_create_client_workspace(brand_user_id: int) -> Tuple[bool, str, Dict]:
        """
        Check if brand can create a client workspace (agencies only)
        Returns: (can_proceed, error_message, usage_data)
        """
        user = User.query.get(brand_user_id)
        if not user or user.user_type != 'brand':
            return False, 'Invalid brand', {}

        # Get active subscription
        subscription = Subscription.query.filter_by(
            user_id=brand_user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return False, 'No active subscription plan', {}

        # Get current client workspace count
        # TODO: Implement client workspaces table/model
        workspace_count = 0  # Placeholder

        # Get limit from plan
        max_workspaces = subscription.plan.max_client_workspaces

        # 0 means feature not available
        if max_workspaces == 0:
            return False, 'Client workspaces are only available on Enterprise plans', {
                'current': 0,
                'limit': 0,
                'feature': 'client_workspaces',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        # -1 or None means unlimited
        if max_workspaces and max_workspaces != -1 and workspace_count >= max_workspaces:
            return False, f'You have reached your plan limit of {max_workspaces} client workspaces', {
                'current': workspace_count,
                'limit': max_workspaces,
                'feature': 'client_workspaces',
                'plan_name': subscription.plan.name,
                'upgrade_required': True
            }

        return True, '', {
            'current': workspace_count,
            'limit': max_workspaces if max_workspaces and max_workspaces != -1 else 'Unlimited',
            'feature': 'client_workspaces'
        }

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    @staticmethod
    def get_current_usage(user_id: int, user_type: str) -> Dict:
        """
        Get current usage stats for a user
        Returns: dictionary with all relevant counts
        """
        if user_type == 'creator':
            usage_month = SubscriptionUsage.get_current_month_usage(user_id)
            active_collabs = Collaboration.query.filter_by(
                creator_id=user_id,
                status='active'
            ).count()
            packages = Package.query.filter_by(
                creator_id=user_id,
                is_active=True
            ).count()

            return {
                'active_collaborations': active_collabs,
                'proposals_sent_this_month': usage_month['proposals_sent'],
                'packages': packages,
                'month_resets_at': usage_month['resets_at']
            }
        else:  # brand
            usage_month = SubscriptionUsage.get_current_month_usage(user_id)
            active_campaigns = Campaign.query.filter_by(
                brand_id=user_id,
                status='active'
            ).count()
            active_collabs = Collaboration.query.filter_by(
                brand_id=user_id,
                status='active'
            ).count()

            return {
                'active_campaigns': active_campaigns,
                'active_collaborations': active_collabs,
                'campaigns_created_this_month': usage_month['campaigns_created'],
                'month_resets_at': usage_month['resets_at']
            }

    @staticmethod
    def get_upgrade_prompt(user_id: int, user_type: str, feature: str) -> Dict:
        """
        Get upgrade prompt data with next tier benefits
        Returns: upgrade modal content
        """
        # Get current subscription
        subscription = Subscription.query.filter_by(
            user_id=user_id,
            status='active'
        ).first()

        if not subscription or not subscription.plan:
            return {}

        current_plan = subscription.plan

        # Find next tier plan
        next_plan = SubscriptionPlan.query.filter(
            SubscriptionPlan.user_type == user_type,
            SubscriptionPlan.price_monthly > current_plan.price_monthly,
            SubscriptionPlan.is_active == True
        ).order_by(SubscriptionPlan.price_monthly).first()

        if not next_plan:
            return {}

        return {
            'current_plan': {
                'name': current_plan.name,
                'price': float(current_plan.price_monthly),
                'features': current_plan.to_dict()['features']
            },
            'next_plan': {
                'id': next_plan.id,
                'name': next_plan.name,
                'price': float(next_plan.price_monthly),
                'features': next_plan.to_dict()['features']
            },
            'feature': feature,
            'upgrade_url': f'/subscriptions/upgrade?plan_id={next_plan.id}'
        }

    @staticmethod
    def send_limit_reached_notification(user_id: int, feature: str, limit: int):
        """
        Send email notification when user hits a limit
        Called internally by enforcement methods
        """
        try:
            user = User.query.get(user_id)
            if not user:
                return

            subscription = Subscription.query.filter_by(
                user_id=user_id,
                status='active'
            ).first()

            if not subscription or not subscription.plan:
                return

            # Find next tier plan
            next_plan = SubscriptionPlan.query.filter(
                SubscriptionPlan.user_type == user.user_type,
                SubscriptionPlan.price_monthly > subscription.plan.price_monthly,
                SubscriptionPlan.is_active == True
            ).order_by(SubscriptionPlan.price_monthly).first()

            if not next_plan:
                return

            # Get user name
            if user.user_type == 'creator':
                from app.models import CreatorProfile
                profile = CreatorProfile.query.filter_by(user_id=user_id).first()
                user_name = profile.display_name if profile and profile.display_name else user.email.split('@')[0]
            else:
                from app.models import BrandProfile
                profile = BrandProfile.query.filter_by(user_id=user_id).first()
                user_name = profile.company_name if profile and profile.company_name else user.email.split('@')[0]

            # Send email
            send_subscription_limit_reached_email(
                user_email=user.email,
                user_name=user_name,
                user_type=user.user_type,
                feature_name=feature,
                current_limit=limit,
                plan_name=subscription.plan.name,
                next_plan_name=next_plan.name
            )
        except Exception as e:
            # Log error but don't fail the enforcement check
            print(f"Error sending limit notification: {e}")
