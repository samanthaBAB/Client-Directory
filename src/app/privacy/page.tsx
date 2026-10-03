import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — BAB Tasker",
};

export default function PrivacyPage() {
  return (
    <div className="policy-page">
      <h1>BAB Tasker Privacy Policy</h1>
      <p className="updated">Last updated: October 2026</p>

      <p>
        BAB Tasker is a job-scheduling app used by cleaning businesses to manage
        jobs, employees, and visit records. This page explains what information
        the app collects, how it&apos;s used, and who can see it.
      </p>

      <h2>Who this covers</h2>
      <p>
        BAB Tasker is used by multiple independent cleaning businesses
        (&quot;organizations&quot;). Each organization&apos;s data — its jobs,
        employees, customers, and photos — is private to that organization and
        is never visible to any other organization using the app.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account information:</strong> name, email address, phone
          number, and role (owner, admin, or employee) for each person who logs
          into the app.
        </li>
        <li>
          <strong>Job information:</strong> customer names, service addresses,
          schedules, prices, and property access details (such as door codes or
          key locations) that an owner enters to assign work.
        </li>
        <li>
          <strong>Visit records:</strong> when an employee starts and ends a
          job, and any notes logged about that visit.
        </li>
        <li>
          <strong>Photos:</strong> job-site photos that employees or owners
          upload (for example, to document a completed clean or report
          damage).
        </li>
        <li>
          <strong>Billing information:</strong> organizations pay for BAB
          Tasker through Stripe. We do not store credit card numbers — Stripe
          handles and stores payment details directly.
        </li>
      </ul>

      <h2>How we use this information</h2>
      <p>
        Information in the app is used only to run the app itself: assigning
        and tracking jobs, sending text message reminders and job
        notifications (via Twilio), and billing organizations for their
        subscription. We do not sell personal information, and we do not use
        it for advertising.
      </p>

      <h2>Who can see your information</h2>
      <p>
        Within an organization, an owner or admin can see all jobs and
        employees in that organization. An employee can see only the jobs
        assigned to them. Data is never shared across organizations.
      </p>

      <h2>Third-party services we use</h2>
      <ul>
        <li>
          <strong>Twilio</strong> — sends SMS text reminders and job
          notifications.
        </li>
        <li>
          <strong>Stripe</strong> — processes subscription payments for
          organizations using BAB Tasker.
        </li>
      </ul>
      <p>
        These providers only receive the information needed to perform their
        specific service (for example, a phone number to send a text, or
        billing details to process a payment).
      </p>

      <h2>Data retention</h2>
      <p>
        We keep job, employee, and visit data for as long as an organization
        has an active account. An organization owner can ask us to delete
        their organization&apos;s data at any time by contacting us below.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        BAB Tasker is a business tool intended for adults running or working
        for a cleaning business. It is not directed at children, and we do not
        knowingly collect information from anyone under 16.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes, we&apos;ll update the date at the top of this
        page.
      </p>

      <h2>Contact us</h2>
      <p>
        Questions about this policy or your data? Email{" "}
        <a href="mailto:babcleaning@outlook.com">babcleaning@outlook.com</a>.
      </p>
    </div>
  );
}
