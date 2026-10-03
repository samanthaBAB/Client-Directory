# BAB Tasker — native app shell

This folder wraps the deployed BAB Tasker web app in a [Capacitor](https://capacitorjs.com)
native shell so it can be submitted to the Apple App Store and Google Play.
It does **not** contain a separate copy of the app — the native WebView
just loads your live deployment (see `server.url` in `capacitor.config.ts`),
so the phone app and the website always show the same data.

You'll need a Mac with Xcode for the iOS build, and Android Studio for the
Android build. Neither can be done from this sandbox — finish these steps
on your own machine.

## 1. Point it at your live site

Deploy the main app first (see the root `README.md`), get it on your own
domain, then edit `capacitor.config.ts`:

```ts
server: {
  url: "https://app.yourdomain.com",
  cleartext: false,
},
```

## 2. Install dependencies and add platforms

```bash
cd mobile
npm install
npx cap add ios       # requires Xcode, macOS only
npx cap add android    # requires Android Studio
```

## 3. Generate icons and splash screens

Icon and splash source images are already in `resources/` (dark purple
background, white "B", matching the web app's theme/icon). Generate all the
platform-specific sizes with:

```bash
npx capacitor-assets generate
```

## 4. Sync and open in the native IDEs

```bash
npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

From there, set your signing team/keystore and run on a simulator/device
like any other native app.

## 5. Before you submit

Apple in particular scrutinizes apps that are "just a website in a
wrapper" (App Store Review Guideline 4.2). To improve your odds of
approval:

- Use native plugins where it makes sense instead of pure web equivalents.
  `@capacitor/status-bar` and `@capacitor/splash-screen` are wired up
  (see `capacitor.config.ts`) for a native look and feel. `@capacitor/camera`
  and `@capacitor/push-notifications` are installed as dependencies but
  **not yet called from app code** — right now job photos still go through
  the plain web file input, and there's no native push registration (only
  the server's SMS reminders). Wiring those up is real, but optional, future
  work — not calling them isn't a rejection reason by itself.
- ✅ Offline state handled: `public/sw.js` + `public/offline.html` show a
  branded "you're offline" screen instead of a blank one when there's no
  connection (registered from `src/app/layout.tsx`).
- ✅ Privacy policy published at `/privacy` (linked from the login page) —
  covers what's collected (account info, job/customer data, visit logs,
  photos, billing via Stripe) and the third parties used (Twilio, Stripe).
  Point App Store Connect's privacy policy field at
  `https://app.yourdomain.com/privacy` once deployed.
- Test thoroughly on a real device before submitting, and fill out App
  Store Connect's remaining metadata (screenshots, description, app
  privacy "nutrition label" answers) completely.
- Both platforms require a signed build: an Apple Developer Program
  membership ($99/yr) for iOS, and a one-time $25 fee for a Google Play
  Developer account.

## App identity

- **Name:** BAB Tasker
- **Bundle ID / Application ID:** `com.babcleaning.tasker` (change this in
  `capacitor.config.ts` before adding platforms if you want a different one
  — it can't be changed later without a new app listing)
- **Icon:** bubble-lettered "BAB" wordmark (Baloo 2), slanted bottom-left to
  upper-right, on a dark purple gradient background with faint outlined
  cleaning-tool icons (broom, bucket, spray bottle, sponge, glove, mop)
