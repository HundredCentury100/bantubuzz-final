"""
Run the subscription_usage table migration
"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

def run_migration():
    """Run the subscription_usage table migration"""
    app = create_app()

    with app.app_context():
        print('='*80)
        print('RUNNING SUBSCRIPTION USAGE TABLE MIGRATION')
        print('='*80)
        print()

        # Read the SQL migration file
        migration_file = os.path.join(
            os.path.dirname(__file__),
            'migrations',
            'create_subscription_usage_table.sql'
        )

        with open(migration_file, 'r') as f:
            sql = f.read()

        print(f'Reading migration from: {migration_file}')
        print()

        try:
            # Execute the migration
            print('Executing migration...')
            db.session.execute(db.text(sql))
            db.session.commit()

            print('✅ Migration completed successfully!')
            print()

            # Verify the table was created
            result = db.session.execute(db.text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'subscription_usage'
                ORDER BY ordinal_position
            """))

            columns = result.fetchall()

            print('Table columns:')
            for col in columns:
                print(f'  - {col[0]}: {col[1]}')

            print()
            print('='*80)
            print('MIGRATION COMPLETE')
            print('='*80)

        except Exception as e:
            db.session.rollback()
            print(f'❌ Migration failed: {str(e)}')
            raise

if __name__ == '__main__':
    run_migration()
