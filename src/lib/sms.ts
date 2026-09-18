export async function sendSms(to: string | null | undefined, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!to) return { sent: false, reason: "no-recipient-phone" as const };
  if (!sid || !token || !from) {
    console.warn("[sms] Twilio not configured; skipping message to", to);
    return { sent: false, reason: "twilio-not-configured" as const };
  }

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[sms] Twilio send failed", res.status, text);
      return { sent: false, reason: "twilio-error" as const };
    }
    return { sent: true as const };
  } catch (err) {
    console.error("[sms] Twilio request threw", err);
    return { sent: false, reason: "network-error" as const };
  }
}
