"""Helpers for public brand identity.

Agency parent accounts own records in the database, but creators must only see
the client/workspace brand they are working with. Keep this logic centralized so
creator-facing serializers do not accidentally expose the agency name or logo.
"""


def public_brand_payload(brand=None, workspace=None, include_user=False):
    """Return the brand identity safe for creator/public-facing surfaces."""
    if workspace:
        payload = {
            'id': getattr(workspace, 'id', None),
            'company_name': getattr(workspace, 'name', None) or 'A brand',
            'display_name': getattr(workspace, 'name', None) or 'A brand',
            'business_name': getattr(workspace, 'name', None) or 'A brand',
            'logo': getattr(workspace, 'logo', None),
            'industry': getattr(workspace, 'industry', None),
            'description': getattr(workspace, 'description', None),
            'website': getattr(workspace, 'website', None),
            'is_workspace_brand': True,
        }
        if include_user and brand:
            # The account owner is still the agency user internally, but do not
            # expose the agency profile name/logo in this public payload.
            payload['user_id'] = getattr(brand, 'user_id', None)
        return payload

    if brand and hasattr(brand, 'to_dict'):
        try:
            return brand.to_dict(include_user=include_user)
        except TypeError:
            return brand.to_dict()

    return {
        'id': getattr(brand, 'id', None),
        'company_name': (
            getattr(brand, 'company_name', None)
            or getattr(brand, 'display_name', None)
            or 'A brand'
        ),
        'display_name': (
            getattr(brand, 'display_name', None)
            or getattr(brand, 'company_name', None)
            or 'A brand'
        ),
        'logo': getattr(brand, 'logo', None),
    }


def public_brand_name(brand=None, workspace=None, fallback='A brand'):
    payload = public_brand_payload(brand=brand, workspace=workspace)
    return payload.get('company_name') or payload.get('display_name') or fallback


def public_brand_logo(brand=None, workspace=None):
    payload = public_brand_payload(brand=brand, workspace=workspace)
    return payload.get('logo')


def public_brand_for_campaign(campaign, include_user=False):
    if not campaign:
        return public_brand_payload(include_user=include_user)
    return public_brand_payload(
        brand=getattr(campaign, 'brand', None),
        workspace=getattr(campaign, 'workspace', None),
        include_user=include_user,
    )


def public_brand_for_collaboration(collaboration, include_user=False):
    if not collaboration:
        return public_brand_payload(include_user=include_user)
    return public_brand_payload(
        brand=getattr(collaboration, 'brand', None),
        workspace=getattr(collaboration, 'workspace', None),
        include_user=include_user,
    )


def public_brand_for_booking(booking, include_user=False):
    if not booking:
        return public_brand_payload(include_user=include_user)
    return public_brand_payload(
        brand=getattr(booking, 'brand', None),
        workspace=getattr(booking, 'workspace', None),
        include_user=include_user,
    )
