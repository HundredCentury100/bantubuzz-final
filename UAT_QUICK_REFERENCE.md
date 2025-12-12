# BantuBuzz UAT - Quick Reference Card

**Platform URL:** https://bantubuzz.com

---

## Test Accounts

| Account Type | Email | Password | Username/Company |
|--------------|-------|----------|------------------|
| Creator | creator@demo.com | password123 | creativepro |
| Brand | brand@demo.com | password123 | Demo Brand Inc. |
| Admin | admin@bantubuzz.com | password123 | Admin |

---

## Quick Test Scenarios

### For Creators (30-minute test)

1. **Login & Profile** (5 min)
   - Login at https://bantubuzz.com/login
   - Update profile picture
   - Add social media links
   - Update bio

2. **Browse & Apply** (10 min)
   - Browse available campaigns
   - Filter by category
   - View campaign details
   - Apply to a campaign

3. **Messaging** (5 min)
   - Send message to brand
   - Check notifications
   - Reply to messages

4. **Wallet** (5 min)
   - View wallet balance
   - Check transaction history
   - Request cashout

5. **Deliverables** (5 min)
   - Submit deliverable
   - View deliverable status
   - Resubmit if revision requested

### For Brands (30-minute test)

1. **Login & Profile** (5 min)
   - Login at https://bantubuzz.com/login
   - Update company logo
   - Update company information

2. **Create Campaign** (10 min)
   - Create new campaign
   - Add campaign details
   - Set budget and deadline
   - Publish campaign

3. **Find Creators** (5 min)
   - Browse creator profiles
   - Filter by niche/category
   - View creator portfolios
   - Book/invite creator

4. **Manage Collaboration** (5 min)
   - View collaboration status
   - Review deliverables
   - Approve or request revision

5. **Payment & Review** (5 min)
   - Process payment
   - Leave review for creator
   - Check campaign analytics

---

## Key Features to Test

### Must Test
- [ ] Registration & Login
- [ ] Profile updates
- [ ] Campaign creation (brands)
- [ ] Campaign browsing (creators)
- [ ] Messaging
- [ ] Notifications
- [ ] Wallet/payments
- [ ] Deliverable submission
- [ ] Reviews/ratings

### Should Test
- [ ] Password reset
- [ ] Search functionality
- [ ] Filters
- [ ] Mobile responsiveness
- [ ] Email notifications
- [ ] Cashout requests

### Nice to Test
- [ ] Analytics
- [ ] Multiple browsers
- [ ] Tablet devices
- [ ] Different network speeds

---

## Payment Flow (Important!)

**For Brands:**
1. Create collaboration with creator
2. Creator submits deliverable
3. Review deliverable → Approve
4. Process payment (system deducts 15% platform fee)
5. Creator receives 85% in wallet
6. Platform receives 15% commission

**For Creators:**
1. Complete collaboration
2. Submit deliverable
3. Brand approves
4. Brand processes payment
5. Receive 85% of total (15% goes to platform)
6. Check wallet balance
7. Request cashout when ready

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Can't login | Clear browser cache, try password reset |
| Images not uploading | Check file size (max 5MB), use JPG/PNG |
| Messages not sending | Refresh page, check internet connection |
| Wallet balance incorrect | Check transaction history for details |
| Email not received | Check spam folder, wait 5 minutes |

---

## What Success Looks Like

### Creator Journey
1. ✅ Register → 2. ✅ Complete profile → 3. ✅ Browse campaigns → 4. ✅ Apply to campaign → 5. ✅ Get accepted → 6. ✅ Submit deliverable → 7. ✅ Get approved → 8. ✅ Receive payment → 9. ✅ Request cashout

### Brand Journey
1. ✅ Register → 2. ✅ Complete profile → 3. ✅ Create campaign → 4. ✅ Receive applications → 5. ✅ Accept creator → 6. ✅ Receive deliverable → 7. ✅ Review & approve → 8. ✅ Process payment → 9. ✅ Leave review

---

## Browser Testing Priority

1. **Chrome** (Primary) - Test everything
2. **Safari** (Mobile) - Test on iPhone
3. **Firefox** - Test core features
4. **Edge** - Basic smoke test

---

## Severity Levels for Bugs

- **CRITICAL:** Can't login, app crashes, data loss, payment issues
- **HIGH:** Major feature broken, can't complete key workflow
- **MEDIUM:** Feature works but has issues, workaround exists
- **LOW:** Typos, minor UI glitches, cosmetic issues

---

## Quick Bug Report Format

```
TITLE: [What broke]
STEPS:
1. Go to...
2. Click on...
3. Enter...

EXPECTED: [What should happen]
ACTUAL: [What actually happened]
BROWSER: [Chrome/Safari/etc.]
SEVERITY: [Critical/High/Medium/Low]
```

---

## Contact for Issues

- Email: support@bantubuzz.com
- Report bugs in UAT documentation

---

**Happy Testing!**
