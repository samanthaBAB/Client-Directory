import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import { PRICE_PER_PROPERTY_CENTS, SIGN_ON_FEE_CENTS } from "@/lib/pricing";
import ContactForm from "./ContactForm";
import styles from "./page.module.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--font-display" });
const body = Manrope({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "BAB Tasker for Your Cleaning Business",
  description: "Scheduling, automatic payouts, property details, and your whole team — one app, built by a cleaning business owner.",
};

const PRICE_DOLLARS = PRICE_PER_PROPERTY_CENTS / 100;
const SIGN_ON_DOLLARS = SIGN_ON_FEE_CENTS / 100;

const PROBLEMS = [
  "Job details scattered across text threads, sticky notes, and whatever you remember",
  "Cleaners showing up without the access code, key location, or supply list",
  "Doing payout math by hand, every single week, for every single cleaner",
  "No record of damage, missing items, or what a property actually looked like after the clean",
  "Contractors who feel directed and managed instead of like independent partners",
];

const FEATURES = [
  {
    icon: "📅",
    title: "Scheduling that actually fits your business",
    desc: "One-time jobs, weekly and biweekly routines, “1st & 3rd Thursday” patterns, even a multi-week project with no fixed day — it all shows up right on the calendar.",
  },
  {
    icon: "💵",
    title: "Payouts calculate themselves",
    desc: "Set each cleaner's rate once — a percentage off plus a flat fee — and every job's payout is calculated automatically, rounded up, no arguments.",
  },
  {
    icon: "🔑",
    title: "Everything on the property, in their pocket",
    desc: "Access codes, key locations, supply closets, and your notes travel with the job — no more texting “what's the code again?” mid-clean.",
  },
  {
    icon: "🤝",
    title: "Built for 1099, the right way",
    desc: "Jobs go out as offers your cleaners accept or decline themselves, protecting their status as independent contractors instead of employees you're directing.",
  },
  {
    icon: "⚡",
    title: "Same-day turnover alerts",
    desc: "Flag the vacation rentals with a same-day checkout and check-in so nobody's caught scrambling between guests.",
  },
  {
    icon: "📸",
    title: "Photos and damage reports, attached",
    desc: "Before/after photos and damage notes live on the job itself — not buried three days deep in a group text.",
  },
  {
    icon: "🔒",
    title: "Price and payout, kept separate",
    desc: "You see what the client pays. Your cleaners only ever see what they earn. Nobody has to have that awkward conversation.",
  },
  {
    icon: "📱",
    title: "No app store, no fees, no waiting",
    desc: "Your team adds it straight to their phone's home screen — iPhone or Android — free, instantly, and it's always the latest version.",
  },
];

const STEPS = [
  {
    title: "We set up your account",
    desc: "Tell us how many properties you manage and we build your business's account — your own private space, separate from every other company using BAB Tasker.",
  },
  {
    title: "Add your team and properties",
    desc: "Enter each cleaner's pay rate once. Add your clients' addresses, access codes, supply notes — whatever they need to walk in and get to work.",
  },
  {
    title: "Everything runs itself from there",
    desc: "Jobs land on the calendar, payouts calculate automatically, and your team gets notified the moment there's a job for them.",
  },
];

export default function GetStartedPage() {
  return (
    <div className={`${styles.page} ${display.variable} ${body.variable}`}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoMark}>B</span>
            BAB Tasker
          </div>
          <Link href="/login" className={styles.navLink}><span className={styles.navLinkFull}>Already a customer? </span>Log in →</Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>Built by a cleaning business, for cleaning businesses</span>
          <h1 className={styles.heroTitle}>
            Run your cleaning business like it&apos;s <em>already figured out.</em>
          </h1>
          <p className={styles.heroSub}>
            One app for scheduling, automatic payouts, property details, and your whole team &mdash;
            so nothing falls through a group text again.
          </p>
          <div className={styles.heroCtas}>
            <a href="#pricing" className={styles.ctaButton}>See Pricing</a>
            <a href="#contact" className={styles.ctaButtonGhost}>Get Started</a>
          </div>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <div className={styles.heroStatNum}>${PRICE_DOLLARS}</div>
            <div className={styles.heroStatLabel}>per property, per month</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatNum}>0</div>
            <div className={styles.heroStatLabel}>app store fees, ever</div>
          </div>
          <div className={styles.heroStat}>
            <div className={styles.heroStatNum}>1</div>
            <div className={styles.heroStatLabel}>app for your whole team</div>
          </div>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>The problem</div>
            <h2 className={styles.sectionTitle}>You didn&apos;t start a cleaning business to manage spreadsheets.</h2>
            <p className={styles.sectionSub}>If any of this sounds familiar, BAB Tasker was built for exactly this.</p>
          </div>
          <div className={styles.problemGrid}>
            {PROBLEMS.map((p) => (
              <div className={styles.problemItem} key={p}>
                <span className={styles.problemIcon}>×</span>
                <span className={styles.problemText}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>What you get</div>
            <h2 className={styles.sectionTitle}>Everything your business needs, nothing it doesn&apos;t.</h2>
            <p className={styles.sectionSub}>Real features, built from actually running a cleaning business — not a generic scheduling app with your logo on it.</p>
          </div>
          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div className={styles.featureCard} key={f.title}>
                <div className={styles.featureIcon}>{f.icon}</div>
                <div className={styles.featureTitle}>{f.title}</div>
                <div className={styles.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>How it works</div>
            <h2 className={styles.sectionTitle}>Up and running in three steps.</h2>
          </div>
          <div className={styles.stepsGrid}>
            {STEPS.map((s, i) => (
              <div className={styles.stepCard} key={s.title}>
                <div className={styles.stepNumber}>{i + 1}</div>
                <div className={styles.stepTitle}>{s.title}</div>
                <div className={styles.stepDesc}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.sectionInner}>
          <div className={styles.founderCard}>
            <div className={styles.founderAvatar}>S</div>
            <div>
              <p className={styles.founderQuote}>
                &ldquo;I built BAB Tasker because I run a cleaning business myself, and I was tired of
                losing track of who was cleaning what and paying people the wrong amount by accident.
                If it works for my business, it&apos;ll work for yours.&rdquo;
              </p>
              <div className={styles.founderName}>Samantha</div>
              <div className={styles.founderRole}>Owner, BAB Cleaning Services LLC</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} id="pricing">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>Pricing</div>
            <h2 className={styles.sectionTitle}>Simple, honest pricing.</h2>
            <p className={styles.sectionSub}>No tiers to decode, no hidden fees. You pay for what you actually manage.</p>
          </div>
          <div className={styles.pricingCard}>
            <span className={styles.pricingBadge}>Per Property</span>
            <div className={styles.priceMain}>${PRICE_DOLLARS}<span>/property/mo</span></div>
            <p className={styles.priceSignOn}>Plus a one-time <b>${SIGN_ON_DOLLARS} sign-on fee</b> to get your business set up.</p>
            <ul className={styles.priceFeatureList}>
              <li><span className={styles.priceCheck}>✓</span> Unlimited cleanings on every property</li>
              <li><span className={styles.priceCheck}>✓</span> Every cleaner on your team included</li>
              <li><span className={styles.priceCheck}>✓</span> Automatic payout calculations</li>
              <li><span className={styles.priceCheck}>✓</span> Text notifications for job offers and reminders</li>
              <li><span className={styles.priceCheck}>✓</span> Works on any phone, no app store required</li>
            </ul>
            <a href="#contact" className={styles.ctaButton}>Get Started Below</a>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`} id="contact">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionEyebrow}>Get started</div>
            <h2 className={styles.sectionTitle}>Ready to get BAB Tasker for your business?</h2>
            <p className={styles.sectionSub}>Fill this out and I&apos;ll reach out personally to get you set up — usually the same day.</p>
          </div>
          <ContactForm />
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerText}>BAB Tasker &mdash; a product of BAB Cleaning Services LLC</span>
          <Link href="/login" className={styles.footerLink}>Already a customer? Log in</Link>
        </div>
      </footer>
    </div>
  );
}
