# BAB Tasker

A real, deployable web app for BAB Cleaning to manage jobs, employees,
access details, and visit history — with real cleaner logins (email +
password, not a shared PIN), a real Postgres database, and text message
notifications to cleaners.

This replaces the earlier Claude artifact prototype. Everything that
prototype did is here, backed by a real database and real accounts instead
of client-side storage:

- **Owners/admins**: create jobs, assign them to cleaners, see access
  codes/keys/supplies locations, review damage & supply notes, manage
  employee accounts, and view each cleaner's visit history on a calendar.
- **Cleaners**: see only their own assigned jobs, start/end a clean (with
  time tracking), log a past visit, upload job photos, and leave notes for
  the owner.
- **Text notifications**: cleaners get a text when they're assigned a new
  job, when they start a clean, when they finish a clean, and a reminder
  shortly before a scheduled clean is due to start.

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
   npm run db:seed      # creates the owner account + BAB Cleaning's job/employee data
   ```

   The seed script creates the owner account from `OWNER_EMAIL` /
   `OWNER_PASSWORD` in your `.env`, and (only the first time, if the
   employees table is empty) the original client list and Kirstin Nash's
   employee account with a random temporary password — **read the
   terminal output**, that's the only place the temporary password is
   shown.

3. **Run it:**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`, sign in with the owner email/password
   from your `.env`.

## Roles

- **OWNER** — the one account with full control: manage employees,
  promote/demote admins, reset anyone's password, remove employees.
- **ADMIN** — same job-management powers as the owner, but can't manage
  other admins or remove employees (mirrors the original app's "Make
  Admin" toggle).
- **EMPLOYEE** — sees and works only their own assigned jobs.

New employees are created from the **Employees** tab (owner/admin only).
Creating one generates a temporary password shown once on screen — send
it to them directly (text, call, in person). They're required to set
their own password the first time they log in.

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
   - `OWNER_NAME`, `OWNER_EMAIL`, `OWNER_PASSWORD` — only needed when you
     run the seed script
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
3. Give each employee a real mobile phone number when you create their
   account (or add it later) — that's where their texts go.

Without Twilio configured, the app still works fully; it just skips
sending texts (and logs that it skipped, so nothing crashes).

### The "time for your clean" reminder

This one can't run on a request from a person — it has to run on a timer
that checks upcoming jobs throughout the day. `/api/cron/reminders` does
that check; something needs to call it every few minutes.

The included `.github/workflows/cron-reminders.yml` does this for free
using GitHub Actions. In your GitHub repo's Settings → Secrets and
variables → Actions, add:

- `APP_URL` — your deployed URL (e.g. `https://app.yourdomain.com`)
- `CRON_SECRET` — the same value you set in your app's environment variables

(Any other scheduler that can hit a URL every few minutes with that
`Authorization: Bearer <CRON_SECRET>` header works too — cron-job.org,
Vercel Cron on a paid plan, etc.)

## Getting this onto the App Store / Play Store

See [`mobile/README.md`](./mobile/README.md) — it wraps this deployed web
app in a [Capacitor](https://capacitorjs.com) native shell so it can be
submitted to both app stores once you have it deployed on your own domain.

## Security notes

- Change `OWNER_PASSWORD` in your `.env`/hosting environment before
  seeding a real deployment — don't ship with the example value.
- `AUTH_SECRET` and `CRON_SECRET` should be long random strings, not
  reused between environments.
- Photos are stored as compressed base64 images directly in Postgres,
  same approach the original prototype used — fine at this scale, but if
  the photo library grows large, consider moving to object storage
  (S3, Vercel Blob, etc).
