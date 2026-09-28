import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

// Confirms real Stripe payments and issues licenses once Stripe reports a
// checkout session as complete. Only relevant once STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET are configured - inert otherwise since Stripe would
// never call it.
//
// This only ever flips the 'payments' row to 'confirmed'. A database
// trigger (payments_sync_order) is what actually marks the order 'paid'
// and issues the license + entitlement (via grant_order_access) - so this
// route stays a thin, auditable "Stripe said so" signal, and the same
// unlock logic runs identically for card and admin-confirmed bank
// transfers.
export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature!, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_intent?: string | null;
      metadata?: { order_id?: string; payment_id?: string };
    };
    const paymentId = session.metadata?.payment_id;

    if (paymentId) {
      const admin = createAdminClient();
      await admin
        .from("payments")
        .update({
          status: "confirmed",
          provider_payment_id:
            (typeof session.payment_intent === "string" ? session.payment_intent : null) ?? session.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .in("status", ["pending", "submitted"]);
    }
  }

  return NextResponse.json({ received: true });
}
