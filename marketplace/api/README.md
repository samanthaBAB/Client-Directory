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
   homeowners see a price before anyone accepts.
2. Every onboarded cleaner sees it in their feed (`GET /api/jobs?scope=available`)
   and can `POST /api/jobs/:id/accept` (first to accept gets it —
   race-safe via a conditional update) or `POST /api/jobs/:id/decline`
   (just hides it from their own feed).
3. Once accepted, the homeowner pays (`POST /api/payments/create-intent`,
   then confirms with Stripe's mobile SDK). Money is held on the platform's
   Stripe account and routed to the cleaner's connected account minus a
   15% platform fee (`application_fee_amount` in
   `src/app/api/payments/create-intent/route.ts` — change
   `PLATFORM_FEE_BPS` to adjust).
4. Cleaner marks it done (`POST /api/jobs/:id/complete`).
5. Homeowner leaves a review (`POST /api/reviews`).

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
