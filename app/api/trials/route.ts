import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const trialSchema = z.object({
  productId: z.string().uuid(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = trialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { productId } = parsed.data;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in to start a free trial." }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: product, error: productError } = await admin
    .from("products")
    .select("id, name, trial_days, status")
    .eq("id", productId)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (product.status !== "active") {
    return NextResponse.json({ error: "Product is no longer available." }, { status: 400 });
  }

  if (!product.trial_days || product.trial_days <= 0) {
    return NextResponse.json({ error: "This product does not offer a free trial." }, { status: 400 });
  }

  // Check if they already have an active trial or purchase
  const { data: existingEntitlements } = await admin
    .from("entitlements")
    .select("id, status")
    .eq("customer_id", user.id)
    .eq("product_id", product.id)
    .in("status", ["active", "expired", "suspended"]);

  if (existingEntitlements && existingEntitlements.length > 0) {
    return NextResponse.json(
      { error: "You have already claimed a trial or purchased this product." },
      { status: 400 }
    );
  }

  // Insert a new entitlement for the trial
  const startsAt = new Date();
  const expiresAt = new Date();
  expiresAt.setDate(startsAt.getDate() + product.trial_days);

  const { error: insertError } = await admin
    .from("entitlements")
    .insert({
      customer_id: user.id,
      product_id: product.id,
      source: "trial",
      status: "active",
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      note: `Started ${product.trial_days}-day free trial`,
    });

  if (insertError) {
    return NextResponse.json({ error: "Could not start trial." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
