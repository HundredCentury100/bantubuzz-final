"""
Run Flask app WITHOUT SocketIO (for testing/debugging)
"""
import os
from app import create_app, db

# Create app
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    print("=" * 60)
    print("Starting BantuBuzz Backend (Flask Only - No SocketIO)")
    print("=" * 60)
    print("\nServer will be available at:")
    print("  - http://localhost:5000")
    print("  - http://127.0.0.1:5000")
    print("\nPress CTRL+C to stop\n")

    # Use regular Flask run (no SocketIO)
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
