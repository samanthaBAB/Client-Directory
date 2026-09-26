"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || (!email.trim() && !phone.trim())) {
      setError("Please enter your name and at least an email or phone number.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, businessName, email, phone, message }),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
    } catch {
      setStatus("error");
      setError("Something went wrong sending that. Try again, or call/text directly.");
    }
  }

  if (status === "sent") {
    return (
      <div className={styles.formSuccess}>
        <div className={styles.formSuccessIcon}>✓</div>
        <h3>Got it!</h3>
        <p>Thanks for reaching out — I&apos;ll be in touch personally to get your business set up.</p>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="name">Your name*</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className={styles.field}>
          <label htmlFor="businessName">Business name</label>
          <input id="businessName" type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
        </div>
      </div>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="phone">Phone</label>
          <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor="message">Tell me about your business (optional)</label>
        <textarea id="message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="How many properties, how many cleaners, anything you want me to know" />
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      <button type="submit" className={styles.ctaButton} disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send It My Way →"}
      </button>
    </form>
  );
}
