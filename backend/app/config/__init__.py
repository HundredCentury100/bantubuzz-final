"""
Configuration package for BantuBuzz backend

This package contains OAuth configurations for third-party services.
The main app config is in app/config.py and is re-exported here to avoid
import conflicts.
"""

# Re-export config dict from app.config module (the file, not this package)
# We use importlib to avoid circular import issues
import importlib.util
import os

# Load the config.py file from the parent directory
config_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.py')
spec = importlib.util.spec_from_file_location("app_config", config_file)
config_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config_module)

# Export the config dict
config = config_module.config

__all__ = ['config']
