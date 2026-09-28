import "server-only";
import Stripe from "stripe";

// Returns null when no Stripe key is configured, so checkout can fall back
// to demo mode instead of throwing. Add STRIPE_SECRET_KEY to .env.local to
// enable real payments - no other code changes required.
export function getStripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);
