# Clean Request Pro — cleaner app

Expo (React Native) app for cleaners: browse open job requests, accept or
decline them, track jobs you've taken, mark them complete, and set up
payouts through Stripe Connect. Talks to the shared backend in `../../api`.

## Setup

```bash
cd marketplace/apps/cleaner
npm install
npx expo install   # fixes native-module versions to match the installed Expo SDK
```

Edit `app.json` → `expo.extra.apiUrl` to point at your deployed (or local
LAN) API URL.

Then:

```bash
npx expo start
```

## Payout setup (Stripe Connect)

A cleaner can browse the job feed right after signing up, but the backend
blocks accepting a job until they've finished Stripe's Express onboarding
(identity + bank account) — the **Payouts** tab starts that flow in an
in-app browser. `app.json`'s `scheme` (`cleanerapp`) is the deep link
Stripe redirects back to; it must match `STRIPE_CONNECT_RETURN_URL` in the
backend's environment.

## Replacing the placeholder icon/splash

`assets/icon.png` and `assets/splash.png` are solid-color placeholders —
swap them for real artwork before shipping.

## Building for the App Store / Play Store

Same as the homeowner app — see
[`../homeowner/README.md`](../homeowner/README.md#building-for-the-app-store--play-store)
for the full EAS Build walkthrough. Use a different Apple/Google app
listing than the homeowner app (this is a separate app with its own
bundle identifier, `com.cleanrequest.cleaner`).
