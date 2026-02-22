from app import create_app, db
from werkzeug.security import generate_password_hash
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Insert admin user directly with SQL
    password_hash = generate_password_hash('Admin@2026')

    db.session.execute(text("""
        INSERT INTO users (email, password_hash, user_type, is_verified, created_at)
        VALUES ('admin@bantubuzz.com', :password_hash, 'admin', true, NOW())
    """), {'password_hash': password_hash})

    db.session.commit()

    # Verify
    user_count = db.session.execute(text('SELECT COUNT(*) FROM users')).scalar()
    print('✅ Admin user created successfully!')
    print('📧 Email: admin@bantubuzz.com')
    print('🔑 Password: Admin@2026')
    print('')
    print(f'Total users in database: {user_count}')
    print('🎯 Database is fresh and ready for testing!')
