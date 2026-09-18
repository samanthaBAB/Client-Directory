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

- Use native plugins where it makes sense instead of pure web equivalents
  — this shell already includes `@capacitor/camera` (native camera for
  job photos), `@capacitor/push-notifications` (native push, in addition
  to the SMS texts the server already sends), and `@capacitor/status-bar`
  / `@capacitor/splash-screen` for a native look and feel.
- Make sure the app works well offline or shows a clear offline state
  (a blank white screen on no connection is a common rejection reason).
- Test thoroughly on a real device before submitting, and fill out
  App Store Connect's metadata (screenshots, description, privacy policy
  — required since this app collects employee names/contact info and
  photos) completely.
- Both platforms require a signed build: an Apple Developer Program
  membership ($99/yr) for iOS, and a one-time $25 fee for a Google Play
  Developer account.

## App identity

- **Name:** BAB Tasker
- **Bundle ID / Application ID:** `com.babcleaning.tasker` (change this in
  `capacitor.config.ts` before adding platforms if you want a different one
  — it can't be changed later without a new app listing)
- **Icon:** dark purple (`#2B2140`) background, white "B"
