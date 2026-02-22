from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print('🗑️ Deleting all campaign-related data...')

    # Delete in order to respect foreign key constraints

    # 1. Delete collaborations related to campaign applications (via campaign_application_id)
    result = db.session.execute(text('''
        DELETE FROM collaborations
        WHERE campaign_application_id IS NOT NULL
    '''))
    print(f'   ✓ Deleted {result.rowcount} collaborations from campaign applications')

    # 2. Delete collaborations related to campaign bookings
    result = db.session.execute(text('''
        DELETE FROM collaborations
        WHERE booking_id IN (
            SELECT id FROM bookings WHERE booking_type IN ('campaign_application', 'campaign_package')
        )
    '''))
    print(f'   ✓ Deleted {result.rowcount} collaborations from campaign bookings')

    # 3. Delete bookings related to campaigns
    result = db.session.execute(text('''
        DELETE FROM bookings
        WHERE booking_type IN ('campaign_application', 'campaign_package')
    '''))
    print(f'   ✓ Deleted {result.rowcount} campaign bookings')

    # 4. Delete campaign applications
    result = db.session.execute(text('DELETE FROM campaign_applications'))
    print(f'   ✓ Deleted {result.rowcount} campaign applications')

    # 5. Delete campaign_packages associations
    result = db.session.execute(text('DELETE FROM campaign_packages'))
    print(f'   ✓ Deleted {result.rowcount} campaign-package associations')

    # 6. Delete campaigns
    result = db.session.execute(text('DELETE FROM campaigns'))
    print(f'   ✓ Deleted {result.rowcount} campaigns')

    db.session.commit()

    print('')
    print('✅ All campaign data deleted successfully!')
    print('   You can now test the campaign flow from scratch.')
