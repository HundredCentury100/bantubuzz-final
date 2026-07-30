# BantuBuzz Mobile App Plan

## Direction

BantuBuzz mobile V1 will use Capacitor around the existing React frontend. The goal is to move fast while still making the app feel native through a dedicated mobile onboarding layer, native splash/icon assets, app-safe routing, and mobile QA hardening.

We will not rebuild the whole product in React Native for V1. The current web app already contains the product surface: creator/brand auth, dashboards, collaborations, campaigns, messaging, payments, agency workspaces, creator teams, and public profiles.

## Mobile App Folder

Target folder:

`D:\Bantubuzz Platform\mobile_app`

The mobile folder will hold Capacitor config, Android/iOS native projects, native assets, mobile build scripts, and QA notes. The web build remains in `frontend/dist`.

## Onboarding Screens

Assets copied into:

`frontend/public/mobile/onboarding`

Current asset map:

- `logo-b.png` - first splash/onboarding logo
- `discover.png` - Discover Top Talent
- `monetize.png` - Monetize Your Influence
- `connect.png` - Connect Seamlessly

Frontend route:

`/mobile/onboarding`

Flow:

1. Launch splash with centered BantuBuzz B logo.
2. Discover Top Talent.
3. Monetize Your Influence.
4. Connect Seamlessly.
5. Route to the correct logged-in dashboard, or to `/login` for unauthenticated users.

Completion flag:

`bantubuzz_mobile_onboarding_seen=true`

## Native Features For V1

- Native app splash screen.
- App icon.
- Mobile onboarding carousel.
- Auth/session persistence using existing frontend auth.
- Deep link routing for invite/payment/profile flows.
- Android APK/AAB build first.
- iOS project after Android is stable.

## Deep Links

Planned deep links:

- `bantubuzz://creator/:username`
- `bantubuzz://messages`
- `bantubuzz://collaborations/:id`
- `bantubuzz://creator/team-invite/:token`
- `bantubuzz://brand/workspace-invite/:token`
- `bantubuzz://payment/return`

## Mobile UX Audit Checklist

Before app-store release, verify:

- Login, creator signup, brand signup, OTP, password reset.
- Creator dashboard card density.
- Brand dashboard and search.
- Bottom nav for creators and brands.
- Messaging keyboard behavior and attachments.
- Collaboration delivery and content review.
- Campaign details and campaign cart payment flows.
- Wallet, bank transfer proof upload, SmilePay return.
- Creator profile public view and share links.
- Creator team invite and agency workspace invite links.
- Safe-area spacing around notches and bottom system bars.
- No horizontal overflow on all primary pages.

## Implementation Phases

### Phase 1 - App Shell And Onboarding

- Add `/mobile/onboarding` React route.
- Add onboarding assets and completion routing.
- Create Capacitor app in `mobile_app`.
- Configure Android package, app name, app icon, and native splash.
- Build and run Android locally.

### Phase 2 - Native Integrations

- Push notifications.
- App deep links.
- App-safe external browser/payment redirects.
- Camera/gallery/file upload testing.

### Phase 3 - Mobile Polish

- Fix mobile layout issues found during QA.
- Improve loading/offline/error states.
- Add app-only shortcuts where needed.

### Phase 4 - Store Readiness

- Android release build.
- Privacy policy and permissions review.
- Play Store internal test track.
- iOS project and TestFlight.

## Notes

Keep Capacitor V1 focused. If later we need a truly native daily-use experience, rebuild selected high-use flows in React Native or native components, not the entire platform at once.
