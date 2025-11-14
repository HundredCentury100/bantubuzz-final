"""
Simple server startup without reloader (for testing)
"""
import os
from app import create_app, socketio

# Create app
app = create_app(os.getenv('FLASK_ENV', 'development'))

if __name__ == '__main__':
    print("=" * 60)
    print("Starting BantuBuzz Backend Server")
    print("=" * 60)
    print("\nServer will be available at:")
    print("  - http://localhost:5000")
    print("  - http://127.0.0.1:5000")
    print("\nPress CTRL+C to stop\n")

    # Run with SocketIO, no reloader
    socketio.run(
        app,
        debug=False,  # Disable debug to avoid reloader
        host='0.0.0.0',
        port=5000,
        use_reloader=False  # Explicitly disable reloader
    )
