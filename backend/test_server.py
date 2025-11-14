"""
Simple test script to diagnose backend issues
"""
import os
import sys

print("=" * 60)
print("BantuBuzz Backend Diagnostic Test")
print("=" * 60)

# Test 1: Import modules
print("\n[Test 1] Testing imports...")
try:
    from app import create_app, socketio, db
    print("[OK] Successfully imported app modules")
except Exception as e:
    print(f"[FAIL] Import failed: {e}")
    sys.exit(1)

# Test 2: Create app
print("\n[Test 2] Creating Flask app...")
try:
    app = create_app('development')
    print("[OK] Flask app created successfully")
except Exception as e:
    print(f"[FAIL] App creation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Check routes
print("\n[Test 3] Checking registered routes...")
try:
    with app.app_context():
        routes = []
        for rule in app.url_map.iter_rules():
            routes.append(f"{rule.methods} {rule.rule}")

        print(f"[OK] Found {len(routes)} routes")
        print("\nAPI routes:")
        for route in sorted(routes):
            if 'api' in route:
                print(f"  {route}")
except Exception as e:
    print(f"[FAIL] Route check failed: {e}")

# Test 4: Test health endpoint
print("\n[Test 4] Testing health endpoint...")
try:
    with app.test_client() as client:
        response = client.get('/api/health')
        print(f"[OK] Status Code: {response.status_code}")
        print(f"[OK] Response: {response.get_json()}")
except Exception as e:
    print(f"[FAIL] Health endpoint test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Check configuration
print("\n[Test 5] Checking configuration...")
try:
    print(f"[OK] Debug Mode: {app.config.get('DEBUG')}")
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if len(db_uri) > 50:
        print(f"[OK] Database URI: {db_uri[:50]}...")
    else:
        print(f"[OK] Database URI: {db_uri}")
    print(f"[OK] Secret Key: {'Set' if app.config.get('SECRET_KEY') else 'Not Set'}")
except Exception as e:
    print(f"[FAIL] Config check failed: {e}")

print("\n" + "=" * 60)
print("Diagnostic Complete!")
print("=" * 60)
print("\nIf all tests passed, the backend should work.")
print("To start the server, run: python run.py")
