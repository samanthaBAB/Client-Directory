# BAB Tasker

A multi-tenant SaaS app for cleaning businesses to manage jobs, cleaners,
access details, and visit history — with real logins (email + password),
a real Postgres database, text message notifications, and a job-offer
workflow built to keep cleaners as 1099 independent contractors rather
than employees.

BAB Cleaning is the first customer of its own product: you run your
business on it, and you (as the platform operator) can manually onboard
other cleaning businesses as paying customers through a separate admin
console.

- **You (Super Admin)**: manage every customer business from `/admin` —
  create a new business's account, set their plan (property limit +
  monthly price), suspend/reactivate accounts. You don't belong to any one
  business's data.
- **A business owner/admin**: create jobs, **offer** them to cleaners
  (see "Job offers" below), see access codes/keys/supplies locations,
  review damage & supply notes, manage cleaner accounts, and view each
  cleaner's visit history on a calendar. Only sees their own business's
  data — never another customer's.
- **A cleaner**: sees job offers and their accepted jobs, can accept or
  decline an offer, start/end a clean (with time tracking), log a past
  visit, upload job photos, and leave notes for the owner.
- **Text notifications**: cleaners get a text when they're offered a new
  job, when they start a clean, when they finish a clean, and a reminder
  shortly before a scheduled clean is due to start. Owners get a text if a
  cleaner declines an offer.

## Job offers, not assignments (1099 contractor status)

Assigning a job doesn't hand it to a cleaner directly — it **offers** it
to them. They see it under "Job Offers" and choose to Accept or Decline.
Only after accepting does it become a real job on their list with full
access (start/end, photos, notes). Decline sends it back to unassigned
and texts the owner so they can offer it to someone else.

This exists because the business doesn't get to simply direct a
contractor's schedule — the contractor accepts or declines work — which
matters for staying a 1099 relationship instead of W-2. This is one
factor among several classification depends on (equipment, exclusivity,
how they're paid, etc.) — it isn't legal advice, and worth confirming
your specific setup with an employment attorney.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + PostgreSQL
- [Auth.js / NextAuth](https://authjs.dev) (credentials login, bcrypt-hashed
  passwords, JWT sessions)
- [Twilio](https://www.twilio.com) for SMS
- Plain CSS matching the original app's dark purple theme (no UI framework
  dependency)

## Local development

1. **Postgres.** Point `DATABASE_URL` at any Postgres database (local,
   Neon, Supabase, etc). Copy `.env.example` to `.env` and fill it in.

2. **Install and set up the database:**

   ```bash
   npm install
   npm run db:push     # creates the tables from prisma/schema.prisma
   npm run db:seed      # creates the super admin account + your own business
   ```

   The seed script creates two separate accounts, because they do two
   separate jobs:
   - A **super admin** account from `SUPER_ADMIN_EMAIL` /
     `SUPER_ADMIN_PASSWORD` — this is you, managing every customer
     business from `/admin`.
   - An **owner** account from `OWNER_EMAIL` / `OWNER_PASSWORD`, tied to
     a new organization named by `OWNER_ORG_NAME` (defaults to
     "BAB Cleaning") — this is you again, but running your own business
     day-to-day. No jobs or employees are seeded; add them from the app.

   These must be different email addresses — see `.env.example`.

3. **Run it:**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` and sign in with either account above,
   depending on which side you want to see.

## Roles

- **SUPER_ADMIN** — you, the platform operator. Logs into `/admin`, not
  the regular dashboard. Manages every customer business but belongs to
  none of them.
- **OWNER** — the one account per business with full control: manage
  cleaners, promote/demote admins, reset anyone's password, remove
  cleaners.
- **ADMIN** — same job-management powers as the owner, but can't manage
  other admins or remove cleaners.
- **EMPLOYEE** — a cleaner. Sees job offers and accepted jobs for their
  own business only.

New cleaners are created from a business's **Employees** tab
(owner/admin only). Creating one generates a temporary password shown
once on screen — send it to them directly. They're required to set their
own password on first login.

## Onboarding a new customer business (manual, by you)

There's no public signup page yet — you create every customer account
yourself:

1. Log into `/admin` with your super admin account.
2. Click **+ Add Business**, fill in the business name, the owner's name
   and email, their property limit, and monthly price.
3. You'll get a temporary password on screen — send it to that business's
   owner directly (however you'd normally reach a client).
4. They log in, set their own password, and start adding their own jobs
   and cleaners. Their data is completely isolated from every other
   business, including yours.

From the same console you can suspend an account (blocks all logins for
that business) or reactivate it, and see how many properties/cleaners
each business is using against their plan.

## Deploying it for real, on your own domain

The straightforward path is **Vercel** for hosting + **Neon** or
**Supabase** for a free managed Postgres database, either of which lets you
attach your own domain.

1. **Database:** create a free Postgres database on
   [Neon](https://neon.tech) or [Supabase](https://supabase.com), copy its
   connection string.
2. **Deploy:** push this repo to GitHub, then import it in
   [Vercel](https://vercel.com/new). Set these environment variables in
   the Vercel project settings:
   - `DATABASE_URL` — your Postgres connection string
   - `AUTH_SECRET` — generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL` — your production URL (e.g. `https://app.yourdomain.com`)
   - `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` —
     only needed when you run the seed script
   - `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_ORG_NAME` —
     same, for your own business's first account
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` — see below
   - `CRON_SECRET` — generate another random string
   - `REMINDER_MINUTES_BEFORE` — how long before a job's start time to
     text the reminder (default `30`)
3. **Run the schema + seed once against production**, from your machine,
   with `DATABASE_URL` set to the production connection string:
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. **Custom domain:** in Vercel, go to the project's Domains settings and
   add your domain, then point your domain's DNS at Vercel as instructed
   there. Update `NEXTAUTH_URL` to match.

Any other Node host (Render, Railway, a VPS) works too — just run
`npm run build && npm start` with the same environment variables, and
point your domain at whatever the host gives you.

## Text notifications (Twilio)

1. Create a [Twilio](https://www.twilio.com/try-twilio) account and buy a
   phone number capable of sending SMS.
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`
   (your Twilio number, e.g. `+13375551234`).
3. Give each cleaner a real mobile phone number when you create their
   account (or add it later) — that's where their texts go.

Without Twilio configured, the app still works fully; it just skips
sending texts (and logs that it skipped, so nothing crashes).

### The "time for your clean" reminder

This one can't run on a request from a person — it has to run on a timer
that checks upcoming jobs throughout the day, across every business.
`/api/cron/reminders` does that check; something needs to call it every
few minutes.

The included `.github/workflows/cron-reminders.yml` does this for free
using GitHub Actions, but **its schedule is currently commented out** —
it only makes sense to turn on once the app is actually deployed and the
secrets below are set (otherwise it just fails repeatedly and floods your
email). Once you're deployed:

1. In your GitHub repo's Settings → Secrets and variables → Actions, add:
   - `APP_URL` — your deployed URL (e.g. `https://app.yourdomain.com`)
   - `CRON_SECRET` — the same value you set in your app's environment variables
2. Uncomment the `schedule:` block in `.github/workflows/cron-reminders.yml`.

(Any other scheduler that can hit a URL every few minutes with that
`Authorization: Bearer <CRON_SECRET>` header works too — cron-job.org,
Vercel Cron on a paid plan, etc.)

## Getting this onto the App Store / Play Store

See [`mobile/README.md`](./mobile/README.md) — it wraps this deployed web
app in a [Capacitor](https://capacitorjs.com) native shell so it can be
submitted to both app stores once you have it deployed on your own domain.
The same app works for every customer business — like Slack, one app,
many separate accounts.

## Security notes

- Change `SUPER_ADMIN_PASSWORD` and `OWNER_PASSWORD` before seeding a
  real deployment — don't ship with the example values.
- `AUTH_SECRET` and `CRON_SECRET` should be long random strings, not
  reused between environments.
- Every business's data (jobs, cleaners, photos, visits) is scoped by
  organization at the database and API level — one customer can never
  see another's data through the app.
- Photos are stored as compressed base64 images directly in Postgres,
  same approach the original prototype used — fine at this scale, but if
  the photo library grows large, consider moving to object storage
  (S3, Vercel Blob, etc).
