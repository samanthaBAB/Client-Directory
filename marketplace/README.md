# Cleaning Marketplace

A two-sided marketplace, separate from the `bab-tasker` app at the repo
root: any homeowner can request a cleaning, any onboarded cleaner can
accept or decline it. Two mobile apps, one backend.

```
marketplace/
  api/               Next.js API backend (Prisma + Postgres + Stripe Connect)
  apps/
    homeowner/       Expo app — request cleanings, pay, review
    cleaner/         Expo app — browse job feed, accept/decline, get paid
  scripts/           One-off dev scripts (placeholder icon/splash generator)
```

Read each project's own README for the full detail:
[`api/README.md`](./api/README.md), [`apps/homeowner/README.md`](./apps/homeowner/README.md),
[`apps/cleaner/README.md`](./apps/cleaner/README.md).

## How the pieces fit together

Both apps are thin clients over the same REST API — they hold a JWT
(from `/api/auth/register` or `/api/auth/login`) in secure on-device
storage and send it as `Authorization: Bearer <token>` on every request.
There's no shared session between the two apps or with the root
`bab-tasker` app; this is an independent product with its own accounts.

```
Homeowner app ──┐
                 ├──> marketplace/api (Next.js) ──> Postgres
Cleaner app ────┘                    │
                                       └──> Stripe (Connect + payments)
```

**Posting and filling a job:**
1. Homeowner posts a job in the Home tab → `POST /api/jobs`, status `PENDING`.
   Onboarded cleaners get a push notification.
2. Every cleaner with `stripeOnboarded: true` sees it in their feed
   (`GET /api/jobs?scope=available`, filtered to their service radius when
   both sides have shared a device location) and can accept (first one
   wins, race-safe, notifies the homeowner) or decline (hides it from just
   their own feed).
3. Homeowner pays once it's `ACCEPTED` — Stripe PaymentSheet in the
   homeowner app, money routed to the cleaner's connected Stripe account
   minus a platform fee. Cleaner gets notified once it clears.
4. Cleaner starts the clean (`ACCEPTED` → `IN_PROGRESS`, notifies the
   homeowner) then marks it `COMPLETED`; homeowner can leave a review.

A homeowner can cancel any time before `COMPLETED` — a paid job is
refunded in full automatically.

## Getting a local dev environment running end-to-end

You'll want three terminals.

**1. Backend**

```bash
cd marketplace/api
cp .env.example .env   # DATABASE_URL, JWT_SECRET, Stripe test keys
npm install
npm run db:push
npm run dev             # http://localhost:3000
```

**2 & 3. Both apps**, each in its own terminal:

```bash
cd marketplace/apps/homeowner && npm install
cd marketplace/apps/cleaner && npm install
```

In each app's `app.json`, set `expo.extra.apiUrl` to your machine's LAN IP
(not `localhost` — a physical phone or simulator on the same network needs
a real address, e.g. `http://192.168.1.23:3000`) and start each with
`npx expo start`.

Try the flow: register a homeowner account in one app, a cleaner account
in the other, post a job as the homeowner, accept it as the cleaner, pay
with a [Stripe test card](https://docs.stripe.com/testing#cards)
(`4242 4242 4242 4242`, any future date/CVC) as the homeowner — you'll need
the cleaner to have completed Stripe's test-mode Express onboarding first
(the Payouts tab; test mode accepts fake identity/bank details).

For ops/support, seed an admin account (`ADMIN_EMAIL=... ADMIN_PASSWORD=...
npm run db:seed` from `marketplace/api`) and sign in at `/admin` — see
`api/README.md`'s "Admin dashboard" section.

## What's deliberately out of scope for this first pass

- **Real geocoding of typed addresses** — location matching works off
  device GPS captured at the moment a cleaner sets their service area or a
  homeowner posts a job (see each README's "Location" section), not by
  geocoding the typed street address itself. That's a deliberate choice to
  avoid needing a Google/Mapbox API key for the MVP; it means a job posted
  without tapping "use my current location" isn't distance-filterable
  (it still shows to everyone, just not radius-limited).
- **Cancellation fee / cutoff window** — cancellation policy right now is
  "full refund, any time before COMPLETED, no fee." Whether a last-minute
  cancellation should partially compensate the cleaner for reserved time
  is a business call worth revisiting once there's real usage, not
  something to guess at now (`src/app/api/jobs/[id]/cancel/route.ts`).
- **Rich in-app notification history** — notifications are fire-and-forget
  pushes; there's no in-app notification center/inbox to review past ones.

None of these block getting a working MVP in front of real users; they're
the natural next slice once the core loop (post → accept → pay → start →
complete → review) is validated.
