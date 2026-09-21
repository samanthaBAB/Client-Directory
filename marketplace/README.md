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
2. Every cleaner with `stripeOnboarded: true` sees it in their feed
   (`GET /api/jobs?scope=available`) and can accept (first one wins,
   race-safe) or decline (hides it from just their own feed).
3. Homeowner pays once it's `ACCEPTED` — Stripe PaymentSheet in the
   homeowner app, money routed to the cleaner's connected Stripe account
   minus a platform fee.
4. Cleaner marks it `COMPLETED` after the visit; homeowner can leave a review.

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

## What's deliberately out of scope for this first pass

- **Geolocation/service-radius matching** — `CleanerProfile` has
  `serviceRadiusMi`/`baseLat`/`baseLng` fields, but the job feed currently
  shows every open `PENDING` job to every cleaner rather than filtering by
  distance. Wire up real geocoding (the address fields are there) before
  this matters at any real scale.
- **Push notifications** — a cleaner has to open the app to see a new job;
  there's no "a job near you just posted" push yet. `@capacitor/push-notifications`
  isn't relevant here (that's the other app's stack) — for Expo this would be
  `expo-notifications` + Expo's push service, worth adding once the core
  flow is validated.
- **In-progress tracking / live status between ACCEPTED and COMPLETED** —
  there's no explicit "cleaner started" transition to `IN_PROGRESS` in the
  UI yet (the schema supports it); add a "Start clean" action next to
  "Mark complete" if you want homeowners to see that distinction.
- **Cancellation/refund policy** — a homeowner can cancel a `PENDING` or
  `ACCEPTED` job, but canceling after payment succeeded doesn't
  automatically refund via Stripe — that's a deliberate gap, not an
  oversight, since refund policy (full refund? cutoff time? cleaner
  compensation for last-minute cancellation?) is a business decision, not
  a technical one.
- **Admin/ops tooling** — no dashboard for disputes, manual payouts,
  reviewing flagged accounts, etc.

None of these block getting a working MVP in front of real users; they're
the natural next slice once the core loop (post → accept → pay → complete
→ review) is validated.
