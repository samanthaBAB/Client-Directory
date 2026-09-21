# Clean Request — homeowner app

Expo (React Native) app for homeowners: request a cleaning, track its
status, pay once a cleaner accepts, leave a review after it's done.
Talks to the shared backend in `../../api`.

## Setup

```bash
cd marketplace/apps/homeowner
npm install
npx expo install   # fixes native-module versions to match the installed Expo SDK
```

Edit `app.json` → `expo.extra`:
- `apiUrl` — your deployed (or local, e.g. `http://<your-lan-ip>:3000`) API URL
- `stripePublishableKey` — your Stripe **publishable** key (`pk_...`, not secret)

Then:

```bash
npx expo start
```

Scan the QR code with Expo Go (iOS/Android) for quick iteration, or run
`npm run ios` / `npm run android` with a simulator/emulator.

## Push notifications

The app tries to register for push (job accepted, cleaner started/finished)
automatically after login, but it needs an EAS project ID to do that —
which doesn't exist until you run `eas build:configure` once (see below).
Until then, push registration silently no-ops and the app works fine
without it — you'll just need to pull-to-refresh to see status changes.

## Replacing the placeholder icon/splash

`assets/icon.png` and `assets/splash.png` are solid-color placeholders
(scripted, not designed) — swap them for real artwork before shipping.
1024×1024 for the icon, any size with `resizeMode: contain` for splash.

## Building for the App Store / Play Store

This app has no native Xcode/Android Studio project checked in (Expo's
"managed workflow") — you build in the cloud with
[EAS Build](https://docs.expo.dev/build/introduction/), no Mac required
for Android, and no Mac required to *build* iOS either (EAS builds it for
you; you only need a Mac if you want to run the iOS simulator locally):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform ios       # or android, or --platform all
eas submit --platform ios      # uploads the finished build to App Store Connect
```

You'll need:
- An Apple Developer Program membership ($99/yr) for iOS, and a Google
  Play Developer account ($25 one-time) for Android — `eas build`/`eas submit`
  walk you through linking these.
- The API deployed somewhere real (not `localhost`) before you build, since
  `apiUrl` is baked into the build.
- Stripe in **live mode** (not test keys) before submitting for real.
