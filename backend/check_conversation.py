from app import create_app, db
from app.models import User, BrandProfile, CreatorProfile, Message, CustomPackageRequest

app = create_app()

with app.app_context():
    # Find Bakoena Technologies brand
    brand = db.session.query(BrandProfile).filter(BrandProfile.company_name.ilike('%bakoena%')).first()
    if brand:
        print(f'✓ Brand found: {brand.company_name}, User ID: {brand.user_id}')

        # Find Hundred creator
        creator = db.session.query(CreatorProfile).filter(CreatorProfile.username.ilike('%hundred%')).first()
        if creator:
            print(f'✓ Creator found: {creator.username}, User ID: {creator.user_id}')

            # Check messages between them
            messages = db.session.query(Message).filter(
                ((Message.sender_id == brand.user_id) & (Message.receiver_id == creator.user_id)) |
                ((Message.sender_id == creator.user_id) & (Message.receiver_id == brand.user_id))
            ).order_by(Message.created_at.desc()).limit(10).all()

            print(f'\n=== LAST 10 MESSAGES (Most Recent First) ===')
            for msg in messages:
                direction = "Brand→Creator" if msg.sender_id == brand.user_id else "Creator→Brand"
                print(f'\nMessage ID: {msg.id}')
                print(f'  Direction: {direction}')
                print(f'  Type: {msg.message_type}')
                print(f'  Custom Request ID: {msg.custom_request_id}')
                print(f'  Custom Offer ID: {msg.custom_offer_id}')
                print(f'  Content: {msg.content[:100] if msg.content else "None"}...')
                print(f'  Created: {msg.created_at}')

            # Check custom package requests
            requests = db.session.query(CustomPackageRequest).filter(
                (CustomPackageRequest.brand_id == brand.user_id) &
                (CustomPackageRequest.creator_id == creator.user_id)
            ).order_by(CustomPackageRequest.created_at.desc()).limit(5).all()

            print(f'\n=== CUSTOM PACKAGE REQUESTS (Most Recent First) ===')
            for req in requests:
                print(f'\nRequest ID: {req.id}')
                print(f'  Status: {req.status}')
                print(f'  Budget: ${req.budget}')
                print(f'  Deliverables: {req.expected_deliverables}')
                print(f'  Created: {req.created_at}')
        else:
            print('✗ Creator "Hundred" not found')
            # List all creators
            all_creators = db.session.query(CreatorProfile).limit(10).all()
            print('\nAvailable creators:')
            for c in all_creators:
                print(f'  - {c.username} (ID: {c.user_id})')
    else:
        print('✗ Brand "Bakoena Technologies" not found')
        # List all brands
        all_brands = db.session.query(BrandProfile).limit(10).all()
        print('\nAvailable brands:')
        for b in all_brands:
            print(f'  - {b.company_name} (ID: {b.user_id})')
