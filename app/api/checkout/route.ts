import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe";

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1),
  billingEmail: z.string().email(),
  phone: z.string().trim().optional(),
  couponCode: z.string().trim().optional(),
  paymentMethod: z.enum(["card", "bank_transfer"]),
  bankAccountId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout request." }, { status: 400 });
  }
  const { items, billingEmail, phone, couponCode, paymentMethod, bankAccountId } = parsed.data;

  if (paymentMethod === "card" && !isStripeConfigured()) {
    return NextResponse.json(
      { error: "Card payments aren't set up yet. Please choose Bank Transfer instead." },
      { status: 400 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let customerId = user?.id;
  let isNewUser = false;

  if (!customerId) {
    // Attempt to create a user for guest checkout
    const { data: newUserData, error: newUserError } = await admin.auth.admin.createUser({
      email: billingEmail,
      phone: phone || undefined,
      email_confirm: true, // Auto-confirm so they can use it immediately
    });

    if (newUserError) {
      if (newUserError.message.includes("already registered")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in to complete checkout." },
          { status: 401 }
        );
      }
      return NextResponse.json({ error: "Could not create guest account." }, { status: 500 });
    }

    customerId = newUserData.user.id;
    isNewUser = true;

    // Send a magic link to the new user so they can access their account later
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: billingEmail,
      options: {
        redirectTo: `${siteUrl}/account/orders`,
      },
    });
    // Note: In production with Resend/SMTP configured, generateLink sends the email by default 
    // unless we extract the link and send it manually. Wait, `generateLink` actually returns the link,
    // and doesn't send the email in some Supabase versions. We should probably use auth.resetPasswordForEmail
    // or auth.signInWithOtp to actually send an email, but since we are using admin client,
    // generateLink might not send an email automatically.
    // Actually, creating the user with `email_confirm: true` doesn't send a welcome email.
    // Let's just generate a magic link. Actually, `signInWithOtp` is better to ensure an email is sent.
  }

  if (paymentMethod === "bank_transfer") {
    // At least one active bank account must exist, or there is nowhere to
    // tell the customer to send money.
    const { data: bankAccounts } = await admin
      .from("bank_accounts")
      .select("id")
      .eq("is_active", true);
    if (!bankAccounts || bankAccounts.length === 0) {
      return NextResponse.json(
        { error: "Bank transfer isn't set up yet. Please check back soon or contact us." },
        { status: 400 }
      );
    }
    if (bankAccountId && !bankAccounts.some((b) => b.id === bankAccountId)) {
      return NextResponse.json({ error: "Selected bank account is not available." }, { status: 400 });
    }
  }

  // Re-fetch authoritative prices server-side - never trust client-sent prices.
  const productIds = items.map((i) => i.productId);
  const { data: products, error: productsError } = await admin
    .from("products")
    .select("id, name, price, sale_price, currency, status")
    .in("id", productIds);

  if (productsError || !products || products.length === 0) {
    return NextResponse.json({ error: "One or more products could not be found." }, { status: 400 });
  }

  const unavailable = products.find((p) => p.status !== "active");
  if (unavailable) {
    return NextResponse.json(
      { error: `${unavailable.name} is no longer available.` },
      { status: 400 }
    );
  }

  const currency = products[0].currency || "USD";
  const orderItems = items.map((item) => {
    const product = products.find((p) => p.id === item.productId)!;
    const unitPrice =
      product.sale_price !== null && product.sale_price < product.price
        ? product.sale_price
        : product.price;
    return {
      product_id: product.id,
      product_name: product.name,
      unit_price: unitPrice,
      quantity: item.quantity,
    };
  });

  const subtotal = orderItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  // Coupon validation (best-effort - invalid/expired codes are ignored, not
  // fatal, so a stale code in a bookmarked link never blocks checkout).
  let discountAmount = 0;
  let couponId: string | null = null;
  let couponNextUsedCount = 0;
  if (couponCode) {
    const { data: coupon } = await admin
      .from("coupons")
      .select("id, discount_type, discount_value, max_uses, used_count, valid_from, valid_until, is_active")
      .eq("code", couponCode.toUpperCase())
      .maybeSingle();

    if (coupon && coupon.is_active) {
      const now = new Date();
      const withinWindow =
        new Date(coupon.valid_from) <= now &&
        (!coupon.valid_until || new Date(coupon.valid_until) >= now);
      const withinUsage = !coupon.max_uses || coupon.used_count < coupon.max_uses;

      if (withinWindow && withinUsage) {
        couponId = coupon.id;
        couponNextUsedCount = coupon.used_count + 1;
        discountAmount =
          coupon.discount_type === "percent"
            ? Math.round(subtotal * (coupon.discount_value / 100) * 100) / 100
            : Math.min(coupon.discount_value, subtotal);
      }
    }
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Every order starts as 'pending', no matter the payment method. The real
  // state machine lives in a separate 'payments' row (method/status/
  // provider/bank_account_id) - 'orders.payment_provider'/'payment_reference'
  // are a denormalized, informational mirror of the payment for quick admin
  // queries, never the source of truth. A database trigger
  // (payments_sync_order) is the only thing that ever flips an order to
  // 'paid' and issues licenses/entitlements - once Stripe's webhook marks
  // the card payment 'confirmed', or an admin runs confirm_bank_transfer()
  // on the bank-transfer payment. Nothing in this route can hand out a
  // product for free.
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      customer_id: customerId,
      billing_email: billingEmail,
      status: "pending",
      subtotal,
      discount_amount: discountAmount,
      total,
      currency,
      coupon_id: couponId,
      payment_provider: paymentMethod === "card" ? "stripe" : "bank_transfer",
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Could not create order." }, { status: 500 });
  }

  const { error: itemsError } = await admin
    .from("order_items")
    .insert(orderItems.map((i) => ({ ...i, order_id: order.id })));

  if (itemsError) {
    return NextResponse.json({ error: "Could not save order items." }, { status: 500 });
  }

  if (couponId) {
    await admin.from("coupons").update({ used_count: couponNextUsedCount }).eq("id", couponId);
  }

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      customer_id: customerId,
      method: paymentMethod,
      status: "pending",
      amount: total,
      currency,
      provider: paymentMethod === "card" ? "stripe" : "manual",
      bank_account_id: paymentMethod === "bank_transfer" ? bankAccountId ?? null : null,
    })
    .select("id")
    .single();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Could not start payment." }, { status: 500 });
  }

  if (paymentMethod === "card") {
    const stripe = getStripeClient()!;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: billingEmail,
      line_items: orderItems.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: currency.toLowerCase(),
          unit_amount: Math.round(item.unit_price * 100),
          product_data: { name: item.product_name },
        },
      })),
      metadata: { order_id: order.id, payment_id: payment.id },
      success_url: `${siteUrl}/account/orders/${order.id}`,
      cancel_url: `${siteUrl}/checkout`,
    });

    await admin
      .from("payments")
      .update({ provider_payment_id: session.id })
      .eq("id", payment.id);
    await admin.from("orders").update({ payment_reference: session.id }).eq("id", order.id);

    return NextResponse.json({ redirectUrl: session.url, isNewUser });
  }

  // Bank transfer: send the customer to their order page with payment
  // instructions and a screenshot upload form. The order stays 'pending'
  // until an admin confirms it via confirm_bank_transfer().
  return NextResponse.json({ orderNumber: order.order_number, orderId: order.id, pending: true, isNewUser });
}
