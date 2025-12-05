"""
Admin routes package for BantuBuzz API

This package contains all admin-related routes organized by feature:
- dashboard: Dashboard statistics and overview
- users: User management (verify, suspend, delete)
- cashouts: Cashout request management
- collaborations: Collaboration and payment management
- categories: Category and niche management (using existing routes/categories.py)
- featured: Featured creators management
"""

from flask import Blueprint

# Create main admin blueprint (url_prefix will be set during app registration)
bp = Blueprint('admin', __name__)

# Import sub-modules to register routes
# These imports must happen AFTER the blueprint is created
from . import dashboard
from . import users
from . import cashouts
from . import collaborations
from . import featured
from . import categories_management

__all__ = ['bp']
