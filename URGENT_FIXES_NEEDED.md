# Urgent Fixes Still Needed

## Backend Issues

### 1. Payment Model - collaboration_id Missing
**Error**: "Entity namespace for 'payments' has no property 'collaboration_id'"
**Location**: Admin trying to update payment

**Analysis**:
- Payment model only has `booking_id`, not `collaboration_id`
- Admin update payment route might be trying to access `collaboration_id`
- Need to check `backend/app/routes/admin_wallet.py` or wherever admin updates payments

**Fix Required**:
- Check which admin route is being called
- Either add `collaboration_id` to Payment model OR
- Fix the route to not reference `collaboration_id`

### 2. Category Save with Image Upload
**Error**: "Failed to save category when I attached an image"

**Possible Causes**:
- File upload handling issue
- Missing file validation
- Path/permission issue

**Fix Required**:
- Check `backend/app/routes/admin/categories.py` create/update routes
- Verify file upload handling code
- Check if file is being saved to correct directory
- Verify file field name matches frontend

### 3. Messaging Connection Issues
**Error**: "Messaging failing to connect when you open it"

**Fix Required**:
- Implement background task to ensure Socket.IO connection is established
- Add retry logic for Socket.IO connection
- Add connection state management in frontend
- Consider lazy-loading messaging to avoid blocking main page

### 4. Booking Completion for Brands
**Error**: "as a brand I am failing to complete booking after all deliverables approved"

**Fix Required**:
- Check `backend/app/routes/bookings.py` completion logic
- Verify all deliverables are marked as approved before allowing completion
- Check if there's a specific endpoint for brand to complete booking
- May need to add transition from collaboration completion to booking completion

## Frontend Issues

### 5. Messaging Display "01" instead of "1"
**Location**: Messaging component showing message count

**Fix Required**:
- Find where message count is displayed
- Remove leading zero padding
- Change from `01` format to `1` format

### 6. Booking Details - No Back Button
**Location**: `http://173.212.245.22:8080/bookings/3`

**Fix Required**:
- Add back button to `frontend/src/pages/BookingDetails.jsx`
- Use `useNavigate` from react-router-dom
- Add button in header section

### 7. Admin Collaboration Details - Login Required
**Error**: "I cannot view a collaboration as an admin its asking me to login"

**Fix Required**:
- Create modal for collaboration details in admin panel
- Don't navigate to different page (which may not have admin auth)
- Show details in modal within admin dashboard

### 8. Deliverable Submission Limits
**Requirements**:
- If deliverables count is 3, creator cannot submit more than 3
- Add ability to edit and resubmit deliverable that was rejected/needs revision

**Fix Required**:
- Check deliverable count before allowing submission
- Add "Edit" button for deliverables with revision requests
- Allow resubmission after editing

### 9. Real-time Notifications
**Error**: "Frontend not showing notifications in real time, have to refresh"

**Fix Required**:
- Implement Socket.IO listeners for notifications
- Auto-fetch notifications when socket event received
- Update notification count in real-time
- Consider using React Query or SWR for automatic refetching

## Migration Still Needed

Run this on production server:
```bash
cd /var/www/bantubuzz/backend
source venv/bin/activate
python3 migrations/add_total_price_to_bookings.py
```

## Priority Order

1. **HIGH**: CORS PATCH (DONE), Booking total_price (DONE)
2. **HIGH**: Payment collaboration_id issue
3. **HIGH**: Category image upload
4. **MEDIUM**: Back button on booking details
5. **MEDIUM**: Deliverable limits and editing
6. **MEDIUM**: Brand complete booking
7. **MEDIUM**: Messaging display format
8. **LOW**: Real-time notifications (enhancement)
9. **LOW**: Messaging connection reliability (enhancement)
