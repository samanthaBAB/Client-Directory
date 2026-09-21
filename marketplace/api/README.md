# Cleaning Marketplace API

Shared backend for the two mobile apps in `../apps/homeowner` and
`../apps/cleaner`. Next.js (App Router, API routes only) + Prisma +
PostgreSQL + Stripe Connect.

This is a separate product from the `bab-tasker` app at the repo root
(BAB Cleaning's internal tool for managing its own cleaners) — this is a
public two-sided marketplace: any homeowner can post a job, any onboarded
cleaner can accept it.

## Data model

- `User` — one account, `role` is `HOMEOWNER` or `CLEANER`.
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

## How a job flows

1. Homeowner posts a job (`POST /api/jobs`) — address, service type, date,
   estimated hours. Price is computed from a flat platform rate, so
   homeowners see a price before anyone accepts. Every onboarded cleaner
   with a registered push token gets notified.
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
`STRIPE_CONNECT_RETURN_URL` as environment variables, then point Stripe's
webhook settings at `https://your-domain.com/api/webhooks/stripe`
(`payment_intent.succeeded`, `payment_intent.payment_failed`,
`account.updated`). Both mobile apps' `EXPO_PUBLIC_API_URL` should point
at this deployed URL.
