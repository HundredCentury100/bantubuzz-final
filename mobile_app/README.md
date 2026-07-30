# BantuBuzz Mobile App

Capacitor shell for the BantuBuzz mobile app.

## Current Architecture

- Web app source: `../frontend`
- Capacitor app folder: `mobile_app`
- Capacitor web directory: `../frontend/dist`
- Onboarding route: `/mobile/onboarding`

## First Run

```powershell
cd "D:\Bantubuzz Platform\mobile_app"
npm install
npm run sync
npm run open:android
```

## Android Build Notes

Install Android Studio and the Android SDK first. After `npm run sync`, Capacitor will generate/update the Android native project.

## Asset Notes

Onboarding images live in:

`../frontend/public/mobile/onboarding`

Native icon/splash generation will use assets under:

`mobile_app/assets`

## QA Focus

- `/mobile/onboarding`
- Login/signup/OTP inside the app shell
- Creator and brand bottom navigation
- Messaging keyboard behavior
- Collaboration delivery uploads
- Payment redirects and return URLs
- Invite links for creator teams and agency workspaces
