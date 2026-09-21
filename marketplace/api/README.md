# Cleaning Marketplace API

Shared backend for the two mobile apps in `../apps/homeowner` and
`../apps/cleaner`. Next.js (App Router, API routes only) + Prisma +
PostgreSQL + Stripe Connect.

This is a separate product from the `bab-tasker` app at the repo root
(BAB Cleaning's internal tool for managing its own cleaners) — this is a
public two-sided marketplace: any homeowner can post a job, any onboarded
cleaner can accept it.

## Data model

- `User` — one account, `role` is `HOMEOWNER`, `CLEANER`, or `ADMIN`
  (admin accounts are seeded, not self-registered — see Admin dashboard below).
- `HomeownerProfile` / `CleanerProfile` — role-specific data, 1:1 with `User`.
- `Address` — a homeowner's property.
- `JobRequest` — a posted cleaning job. Lifecycle:
  `PENDING → ACCEPTED → IN_PROGRESS → COMPLETED` (or `CANCELED` by the
  homeowner while still `PENDING`/`ACCEPTED`).
- `JobDecline` — tracks which cleaners declined which job, so a declined
  job stops showing up in that cleaner's feed but stays visible to everyone
  else.
- `Payment` — one Stripe PaymentIntent per job, created once a cleaner has
  accepted.
- `Review` — homeowner rates the cleaner after `COMPLETED`.

## Pricing

Flat and itemized, never hourly — see `src/lib/catalog.ts` for the full
model and reasoning. In short: `(square footage × price/sq ft for the
service type) + (bedroom/bathroom/kitchen counts × their per-room price)
+ any extras`, minus a first-clean or subscriber discount if either
applies. A cleaner is paid the same regardless of how long the job
actually takes, and a homeowner sees the full breakdown before booking —
never just a total. `commercial` is square-footage-only (no rooms).

## How a job flows

1. Homeowner posts a job (`POST /api/jobs`) — address, service type,
   square footage, room counts, any extras. Price is computed and
   itemized from the catalog (see Pricing above), so homeowners see a
   full breakdown before anyone accepts. Every onboarded cleaner with a
   registered push token gets notified.
2. Every onboarded cleaner sees it in their feed (`GET /api/jobs?scope=available`,
   distance-filtered — see Location below) and can `POST /api/jobs/:id/accept`
   (first to accept gets it — race-safe via a conditional update, and
   notifies the homeowner) or `POST /api/jobs/:id/decline` (just hides it
   from their own feed).
3. Once accepted, the homeowner pays (`POST /api/payments/create-intent`,
   then confirms with Stripe's mobile SDK). Money is held on the platform's
   Stripe account and routed to the cleaner's connected account minus a
   15% platform fee (`application_fee_amount` in
   `src/app/api/payments/create-intent/route.ts` — change
   `PLATFORM_FEE_BPS` to adjust). The cleaner gets notified once the
   payment clears (`payment_intent.succeeded` webhook).
4. Cleaner starts the clean (`POST /api/jobs/:id/start`, `ACCEPTED` →
   `IN_PROGRESS`, notifies the homeowner) then marks it done
   (`POST /api/jobs/:id/complete`, notifies the homeowner).
5. Homeowner leaves a review (`POST /api/reviews`).

A homeowner can cancel a `PENDING` or `ACCEPTED` job at any point before
`COMPLETED` (`POST /api/jobs/:id/cancel`) — if it had already been paid,
this issues a full Stripe refund automatically.

## Auth

Mobile apps can't use cookie-based sessions well, so this uses a plain
JWT issued on register/login (`Authorization: Bearer <token>`), verified
per-request in `src/lib/auth.ts`. Not shared with the root app's NextAuth
setup — this is an independent product with its own accounts.

## Stripe Connect

Cleaners must complete Express onboarding
(`POST /api/stripe/connect/onboard` returns a hosted onboarding URL, opened
in the cleaner app) before they can accept jobs that require payment.
`account.updated` webhooks keep `CleanerProfile.stripeOnboarded` in sync;
`GET /api/stripe/connect/status` lets the app poll/refresh it directly too.

## Location-based matching

No geocoding API/key involved — `CleanerProfile.baseLat`/`baseLng` is set
from the cleaner's own device GPS (`PATCH /api/cleaner-profile`), and
`Address.lat`/`lng` is set from the homeowner's device GPS at the moment
they post a job (both optional — the "use my current location" button in
each app). `GET /api/jobs?scope=available` filters to jobs within the
cleaner's `serviceRadiusMi` (haversine distance, `src/lib/geo.ts`) whenever
both sides have coordinates; missing either one falls back to showing the
job/feed unfiltered rather than hiding it.

## Push notifications

Uses Expo's push service (`expo-server-sdk`, `src/lib/push.ts`) — no
Firebase/APNs setup needed on our side, Expo relays to both platforms.
Each `User` has an optional `pushToken` set via `POST /api/me/push-token`
(both apps register on login, once notification permission is granted and
the app has an EAS project ID — see each app's README). Notifications are
fire-and-forget (a missing/invalid token, or the push service being down,
never fails the request that triggered it): new job posted → all onboarded
cleaners; job accepted/started/completed → the homeowner; payment cleared
→ the cleaner.

## Discounts & subscription

Two promotions, both computed in `computeDiscount` (`src/lib/catalog.ts`)
and applied at booking time in `POST /api/jobs`:

- **First clean, 50% off** — only for `residential` (standard) cleans, and
  only if this is the homeowner's very first booking of any kind. If their
  first booking happens to be a different service type, they don't get it
  later either (it's a one-time intro offer, not a banked credit).
- **Monthly subscriber, 25% off** — any service type, for as long as
  `HomeownerProfile.subscriptionStatus` is `"active"` or `"trialing"`
  (use `isActiveSubscription()`, not a direct string check). $14.99/mo,
  first month free, unlimited bookings that month each still billed
  separately at the discount — see `src/app/api/subscription/`. Real
  Stripe Subscriptions: `POST /api/subscription/start` creates the
  subscription and returns a SetupIntent client secret during the trial
  (or a PaymentIntent once billing starts) for the mobile app's
  PaymentSheet to confirm; `POST /api/subscription/cancel` cancels at
  period end; the webhook keeps `subscriptionStatus` in sync with Stripe.

**Known simplification, not settled policy**: the discount reduces
`priceCents` before the 85/15 cleaner/platform split happens, so today a
promo reduces the cleaner's payout proportionally along with the
platform's cut rather than being absorbed by the platform alone. Flagged
in code comments too — revisit if the intent is for cleaners to be fully
insulated from promotional pricing (would need a separate Charge +
Transfer flow instead of a single destination charge).

## Cleaner accountability

Policy text lives in `CLEANER_POLICIES` (`src/lib/catalog.ts`), shown in
the cleaner app's Support screen:

- Canceling an **accepted** job within 24h of its scheduled time disables
  the account automatically (`POST /api/jobs/:id/cleaner-cancel` — not the
  same as declining an offer before accepting, which has no consequence).
  If the job was already paid, canceling refunds the homeowner and closes
  the job out entirely (money already routed to that cleaner's Stripe
  account can't be silently reassigned to a different one); if unpaid, the
  job reopens for another cleaner to accept.
- No-shows can't be auto-detected (no check-in feature), so they're a
  human call: an admin disables the account manually from `/admin`
  (`PATCH /api/admin/users/:id`) after a homeowner reports one.

`User.disabled` is checked both at login and on every authenticated
request (`getAuthedUser` in `src/lib/auth.ts`), so a disable takes effect
immediately even on a token issued before it.

## Admin dashboard

`/admin` (served by this same Next.js app, no separate deploy) — sign in
with an `ADMIN` account to browse all users (and disable/enable an
account, e.g. for a reported no-show — see Cleaner accountability above),
filter/browse all jobs, force-cancel a non-terminal job with an automatic
refund (for disputes or stuck jobs), and see every payment. Auth reuses
`/api/auth/login`; the dashboard just
checks the returned role is `ADMIN` and stores the JWT in the browser's
`localStorage` — fine for small-scale internal tooling, but note that's
weaker than an httpOnly cookie (vulnerable to XSS reading the token) if
this ever needs to be hardened for a larger ops team.

There's no admin signup route on purpose. Create one with:

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:seed
```

(safe to re-run — it upserts by email, so re-running with a new
`ADMIN_PASSWORD` rotates the password for that same account).

## Local development

```bash
cd marketplace/api
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, Stripe keys
npm install
npm run db:push
npm run dev
```

For Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
and put the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Deploying

Same pattern as the root app: Vercel + a managed Postgres (Neon/Supabase).
Set `DATABASE_URL`, `JWT_SECRET`, `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_REFRESH_URL`,
`STRIPE_CONNECT_RETURN_URL`, `STRIPE_SUBSCRIPTION_PRICE_ID` (create that
Price once in the Stripe Dashboard first) as environment variables, then
point Stripe's webhook settings at
`https://your-domain.com/api/webhooks/stripe` (`payment_intent.succeeded`,
`payment_intent.payment_failed`, `account.updated`,
`customer.subscription.updated`, `customer.subscription.deleted`). Both
mobile apps' `app.json` → `expo.extra.apiUrl` should point at this
deployed URL.

**Not yet verified against a real Stripe account** — the Stripe Connect
payment flow, the webhook handlers, and the subscription/SetupIntent flow
are all standard, documented Stripe patterns, but this sandbox has no
live Stripe credentials to actually test against. Budget time to test the
full payment and subscription flows against Stripe test mode before
going live.
