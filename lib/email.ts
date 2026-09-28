import "server-only";
import { Resend } from "resend";

// Sends transactional email alerts via Resend. Fully inert (logs and
// returns instead of throwing) when RESEND_API_KEY isn't set, so the app
// keeps working with no email configured - the admin just has to check
// /admin/orders manually until this is turned on. Add the key to enable it,
// no other code changes required. See README.md "Email alerts" section.
export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && process.env.ADMIN_ALERT_EMAIL);

export async function sendAdminAlert(subject: string, html: string) {
  if (!isEmailConfigured()) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.ADMIN_ALERT_EMAIL!,
      subject,
      html,
    });
  } catch (err) {
    // Never let a failed email break the customer-facing request that
    // triggered it (e.g. a proof upload). Just log it for later.
    console.error("sendAdminAlert failed:", err);
  }
}
