"""
Check Recent Platform Connection Errors from RequestLog
"""

import sys
import os
from datetime import datetime, timedelta

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from app import create_app, db
from app.models.request_log import RequestLog
from app.models import User

app = create_app()

with app.app_context():
    print("="*100)
    print("RECENT PLATFORM CONNECTION ERRORS (Last 24 Hours)")
    print("="*100)
    print()

    # Find user with email tatendatafara100@gmail.com
    user = User.query.filter_by(email='tatendatafara100@gmail.com').first()

    if user:
        print(f"Found user: {user.email} (ID: {user.id})")
        print()

        # Get recent error logs for this user
        recent_logs = RequestLog.query.filter(
            RequestLog.user_id == user.id,
            RequestLog.created_at >= datetime.utcnow() - timedelta(hours=24)
        ).order_by(RequestLog.created_at.desc()).limit(50).all()

        print(f"Total logs in last 24 hours: {len(recent_logs)}")
        print()

        # Filter for platform-related endpoints
        platform_logs = [log for log in recent_logs if '/platform' in log.endpoint.lower()]

        print(f"Platform-related logs: {len(platform_logs)}")
        print()

        if platform_logs:
            print("Recent Platform Connection Logs:")
            print("-" * 100)

            for log in platform_logs[:20]:  # Show last 20
                status_icon = "❌" if log.response_status and log.response_status >= 400 else "✅"
                print(f"\n{status_icon} {log.created_at} | {log.method} {log.endpoint}")
                print(f"   Status: {log.response_status}")

                if log.error_message:
                    print(f"   Error: {log.error_message[:200]}")

                if log.request_body and log.response_status and log.response_status >= 400:
                    print(f"   Response: {log.request_body[:200]}")

            print("-" * 100)

        # Get all error logs (status >= 400)
        error_logs = [log for log in recent_logs if log.response_status and log.response_status >= 400]

        if error_logs:
            print()
            print(f"\n❌ ERRORS FOUND: {len(error_logs)} errors in last 24 hours")
            print("-" * 100)

            for log in error_logs[:10]:  # Show last 10 errors
                print(f"\n{log.created_at} | {log.method} {log.endpoint}")
                print(f"Status: {log.response_status}")

                if log.error_message:
                    print(f"Error: {log.error_message[:300]}")

                if log.request_body:
                    print(f"Request Body: {log.request_body[:300]}")

            print("-" * 100)
        else:
            print("\n✅ No errors found in last 24 hours!")

    else:
        print("❌ User with email tatendatafara100@gmail.com not found")

    # Also check for recent external API logs (ThunziAI)
    print()
    print("="*100)
    print("RECENT EXTERNAL API LOGS (ThunziAI)")
    print("="*100)

    external_logs = RequestLog.query.filter(
        RequestLog.endpoint.like('%ThunziAI%'),
        RequestLog.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).order_by(RequestLog.created_at.desc()).limit(20).all()

    if external_logs:
        for log in external_logs:
            status_icon = "❌" if log.response_status and log.response_status >= 400 else "✅"
            print(f"\n{status_icon} {log.created_at} | {log.endpoint}")
            print(f"   Status: {log.response_status}")

            if log.error_message:
                print(f"   Error: {log.error_message[:200]}")

            if log.request_body and log.response_status and (log.response_status >= 400 or 'error' in log.request_body.lower()):
                print(f"   Request Body: {log.request_body[:200]}")
    else:
        print("\nNo recent ThunziAI API logs found")

    print()
    print("="*100)
