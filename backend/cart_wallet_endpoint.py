# This endpoint needs to be added to backend/app/routes/bookings.py
# Add it after the cart/upload-pop endpoint (around line 751)

"""
@bp.route('/cart/pay-with-wallet', methods=['POST'])
@jwt_required()
def cart_pay_with_wallet():
    '''
    Pay for cart (multiple packages) using brand wallet balance.
    Body: { package_ids: [1, 2, ...] }
    Returns: { success: True, booking_ids, total, payment_method: 'wallet' }
    '''
    try:
        from datetime import timedelta
        from app.services import brand_wallet_service

        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        brand = BrandProfile.query.filter_by(user_id=user_id).first()

        if not brand or not user:
            return jsonify({'error': 'Brand profile not found'}), 404

        data = request.get_json()
        package_ids = data.get('package_ids', [])
        if not package_ids:
            return jsonify({'error': 'No packages provided'}), 400

        # Calculate total
        packages = []
        total = 0.0
        for pkg_id in package_ids:
            package = Package.query.get(pkg_id)
            if not package:
                return jsonify({'error': f'Package {pkg_id} not found'}), 404
            packages.append(package)
            total += float(package.price)

        # Check wallet balance
        if not brand_wallet_service.check_sufficient_balance(user_id, total):
            return jsonify({
                'error': 'Insufficient wallet balance',
                'required': total,
                'available': brand_wallet_service.calculate_brand_wallet_balance(user_id).available_balance
            }), 400

        # Create all bookings
        bookings = []
        for package in packages:
            booking = Booking(
                package_id=package.id,
                creator_id=package.creator_id,
                brand_id=brand.id,
                amount=package.price,
                total_price=package.price,
                payment_method='wallet',
                payment_status='paid',
                escrow_status='escrowed',
                escrowed_at=datetime.utcnow(),
                status='accepted'
            )
            db.session.add(booking)
            db.session.flush()  # Get booking IDs
            bookings.append((booking, package))

        # Deduct from wallet
        wallet_tx = brand_wallet_service.deduct_from_brand_wallet(
            user_id=user_id,
            amount=total,
            collaboration_id=None,
            description=f'Cart payment for {len(packages)} packages'
        )

        # Create collaborations for each booking
        for booking, package in bookings:
            start_date = datetime.utcnow()
            expected_completion = None
            if package.duration_days:
                expected_completion = start_date + timedelta(days=package.duration_days)

            collaboration = Collaboration(
                collaboration_type='package',
                booking_id=booking.id,
                creator_id=booking.creator_id,
                brand_id=booking.brand_id,
                title=f"Collaboration for {package.title}",
                description=package.description or '',
                amount=booking.amount,
                status='in_progress',
                start_date=start_date,
                expected_completion_date=expected_completion,
                deliverables=package.deliverables if package.deliverables else [],
                progress_percentage=0
            )
            db.session.add(collaboration)
            db.session.flush()

            # Auto-create platform-specific deliverables
            create_multiplatform_deliverables(collaboration, package)

            # Notify creator
            creator_user = User.query.get(package.creator.user_id)
            if creator_user:
                notify_new_booking(
                    creator_id=creator_user.id,
                    brand_name=brand.company_name or user.email,
                    booking_id=booking.id
                )

        db.session.commit()

        booking_ids = [b.id for b, _ in bookings]

        return jsonify({
            'success': True,
            'message': 'Cart payment completed successfully using wallet',
            'booking_ids': booking_ids,
            'total': total,
            'payment_method': 'wallet'
        }), 200

    except Exception as e:
        db.session.rollback()
        import traceback
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
"""
