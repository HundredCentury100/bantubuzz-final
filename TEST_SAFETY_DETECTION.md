# Safety Detection Testing Guide

## How to Test the Safety Features

### 1. Start the Development Server

```bash
cd "d:\Bantubuzz Platform\frontend"
npm run dev
```

### 2. Test Cases for Safety Detection

#### Harmful Language Detection Tests:

**Test 1: Violence Keywords**
- Message: `I will kill you`
- Expected: Red warning modal with "harmful_language" type
- Detected patterns: ["kill", "i will kill"]

**Test 2: Threat Keywords**
- Message: `Watch out, you'll regret this`
- Expected: Red warning modal with "harmful_language" type
- Detected patterns: ["watch out", "you'll regret"]

**Test 3: Multiple Threats**
- Message: `I will hurt you and find you`
- Expected: Red warning modal with "harmful_language" type
- Detected patterns: ["hurt", "i will hurt", "find you"]

**Test 4: Harassment Keywords**
- Message: `You deserve to be harassed`
- Expected: Red warning modal with "harmful_language" type
- Detected patterns: ["harass"]

**Test 5: Hate Speech**
- Message: `I hate you and wish you were dead`
- Expected: Red warning modal with "harmful_language" type
- Detected patterns: ["hate you", "wish you were dead", "die"]

#### Contact Sharing Detection Tests:

**Test 6: Phone Number (US Format)**
- Message: `Call me at 555-123-4567`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["phone number"]

**Test 7: Phone Number (International)**
- Message: `My number is +1 (555) 123-4567`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["phone number"]

**Test 8: Email Address**
- Message: `Email me at john.doe@example.com`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["email address"]

**Test 9: WhatsApp**
- Message: `WhatsApp me for details`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["whatsapp"]

**Test 10: Multiple Platforms**
- Message: `DM me on Instagram or text me`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["dm me on instagram", "text me"]

**Test 11: Email + Phone**
- Message: `Contact me: john@example.com or 555-1234`
- Expected: Yellow warning modal with "contact_sharing" type
- Detected patterns: ["email address", "phone number"]

#### Safe Messages (Should NOT Trigger Warning):

**Test 12: Normal Conversation**
- Message: `Hey, how are you doing today?`
- Expected: Message sends immediately without warning

**Test 13: Business Discussion**
- Message: `Can we discuss the project timeline?`
- Expected: Message sends immediately without warning

**Test 14: Friendly Message**
- Message: `Thanks for your help! I appreciate it.`
- Expected: Message sends immediately without warning

**Test 15: False Positive Check**
- Message: `I love to kill time by watching movies`
- Expected: Red warning modal (this is a limitation - "kill" is detected)
- Note: Future improvement needed for context awareness

### 3. Test Block User Feature

**Steps:**
1. Open a conversation with any user
2. Click the 3-dot menu button in the conversation header
3. Click "Block User"
4. Verify modal shows:
   - User's profile picture or initials
   - User's name and email
   - Warning about blocking consequences
5. Click "Cancel" - modal should close
6. Repeat steps 1-3
7. Click "Block User" button
8. Verify:
   - Success toast appears
   - Conversation closes
   - Returns to conversation list
   - Blocked user no longer appears (or shows as blocked)

### 4. Test Report User Feature

**Steps:**
1. Open a conversation where the other user has sent messages
2. Click the 3-dot menu button
3. Click "Report User"
4. Verify modal shows:
   - Last message from the other user
   - User's name and email
5. Try submitting without selecting category
   - Should show error: "Please select a report category"
6. Select "Harassment" category
7. Add optional description: "Test report description"
8. Click "Submit Report"
9. Verify:
   - Success toast appears
   - Modal closes
   - Report created on backend

### 5. Test Actions Menu UX

**Steps:**
1. Open a conversation
2. Click 3-dot menu - menu should open
3. Click outside the menu - menu should close
4. Click 3-dot menu again
5. Press Escape key - menu should close (if implemented)
6. Resize window to mobile size
7. Verify menu still works on mobile

### 6. Expected API Calls

Monitor Network tab in DevTools during testing:

**On Block:**
```
POST http://localhost:5000/api/messaging/block/<user_id>
Headers: Authorization: Bearer <token>
Response: 200 OK
```

**On Report:**
```
POST http://localhost:5000/api/messaging/report
Body: {
  reported_user_id, conversation_id, message_id,
  message_content, report_category, description
}
Response: 200 OK
```

**On Safety Warning (Send Anyway):**
```
POST http://localhost:5000/api/messaging/safety/log-warning
Body: {
  conversation_id, warning_type, message_content,
  detected_patterns, user_action: "sent_anyway"
}
Response: 200 OK
```

### 7. Console Testing (Quick Validation)

Open browser console and run:

```javascript
import { checkMessageSafety } from './utils/messageSafety.js';

// Test harmful language
console.log(checkMessageSafety('I will kill you'));
// Expected: { needsWarning: true, warningType: 'harmful_language', patterns: ['kill', 'i will kill'] }

// Test contact sharing
console.log(checkMessageSafety('Call me at 555-1234'));
// Expected: { needsWarning: true, warningType: 'contact_sharing', patterns: ['phone number'] }

// Test safe message
console.log(checkMessageSafety('Hello, how are you?'));
// Expected: { needsWarning: false, warningType: null, patterns: [] }
```

### 8. Edge Cases to Test

1. **Empty Message**: Try sending empty message (should be blocked before safety check)
2. **Only Spaces**: Try sending "   " (should be blocked before safety check)
3. **Very Long Message**: Test with 1000+ character message containing keywords
4. **Mixed Case**: Test "KiLl" vs "kill" (should both detect due to toLowerCase)
5. **Special Characters**: Test "k!ll" (won't detect - limitation)
6. **Unicode**: Test emoji messages (should pass through)
7. **Multiple Warnings**: Test message with both harmful language AND contact info
   - Expected: Shows harmful_language warning (higher priority)

### 9. Performance Testing

1. Type message with keywords
2. Click Send
3. Warning should appear within 100ms (instant)
4. Click "Send Anyway"
5. Message should send and appear in thread within 500ms

### 10. Accessibility Testing

1. **Keyboard Navigation**:
   - Tab through modal buttons
   - Press Enter to activate buttons
   - Press Escape to close modals

2. **Screen Reader**:
   - Verify all buttons have descriptive labels
   - Verify modals have proper ARIA labels
   - Verify form fields have labels

## Automated Test Suite (Future)

### Unit Tests for messageSafety.js:
```javascript
describe('checkHarmfulLanguage', () => {
  it('should detect violence keywords', () => {
    const result = checkHarmfulLanguage('I will kill you');
    expect(result.detected).toBe(true);
    expect(result.patterns).toContain('kill');
  });

  it('should be case insensitive', () => {
    const result = checkHarmfulLanguage('KILL');
    expect(result.detected).toBe(true);
  });

  it('should handle null input', () => {
    const result = checkHarmfulLanguage(null);
    expect(result.detected).toBe(false);
  });
});

describe('checkContactSharing', () => {
  it('should detect phone numbers', () => {
    const result = checkContactSharing('Call 555-123-4567');
    expect(result.detected).toBe(true);
    expect(result.patterns).toContain('phone number');
  });

  it('should detect email addresses', () => {
    const result = checkContactSharing('test@example.com');
    expect(result.detected).toBe(true);
    expect(result.patterns).toContain('email address');
  });
});
```

### Integration Tests for Messages.jsx:
```javascript
describe('Messages Safety Integration', () => {
  it('should show warning modal for harmful message', async () => {
    render(<Messages />);
    // Select conversation
    // Type harmful message
    // Click Send
    // Verify modal appears
  });

  it('should block user when confirmed', async () => {
    render(<Messages />);
    // Click actions menu
    // Click Block User
    // Click confirm
    // Verify API call made
    // Verify navigation occurs
  });
});
```

## Success Criteria

✅ All 15 test cases produce expected results
✅ No console errors during testing
✅ API calls complete successfully
✅ Toast notifications appear correctly
✅ Modal animations work smoothly
✅ Mobile responsive behavior works
✅ Actions menu click-away works
✅ Loading states display correctly
✅ Messages send after warnings when confirmed

## Bug Reporting Template

If you find issues during testing, report them with:

```
Bug Title: [Short description]

Steps to Reproduce:
1. [Step 1]
2. [Step 2]
3. [Step 3]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Browser/Device:
[Chrome 120, Windows 11, etc.]

Console Errors:
[Any error messages]

Screenshots:
[Attach if applicable]
```

---

**Start Testing Now**: Run `npm run dev` and open http://localhost:5173/messages
