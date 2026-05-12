import sys
sys.path.insert(0, '/var/www/bantubuzz/backend')

from app import create_app, db
from app.models import RequestLog

app = create_app()

with app.app_context():
    count = RequestLog.query.count()
    print(f"✓ Total logs recorded: {count}")

    if count > 0:
        latest = RequestLog.query.order_by(RequestLog.timestamp.desc()).limit(5).all()
        print("\n✓ Latest 5 log entries:")
        for log in latest:
            print(f"  • {log.timestamp} | {log.method} {log.endpoint} | Status: {log.response_status}")
    else:
        print("\n⚠ No logs yet - make some API requests to test logging")
