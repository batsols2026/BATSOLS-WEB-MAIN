import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAdminAlert } from "@/lib/email";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

// Lets a signed-in customer upload a bank-transfer payment screenshot (or
// PDF receipt) against their own order's payment. The file goes into the
// private 'payment-proofs' bucket under a folder named after the
// customer's own user id (the storage policy requires this), and a
// 'payment_proofs' row records it against the payment. Moves the payment
// from 'pending' to 'submitted' - the payments_sync_order trigger then
// flips the order to 'awaiting_verification' so it surfaces in the admin
// queue.
export async function POST(request: Request, { params }: { params: { orderId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, customer_id, billing_email")
    .eq("id", params.orderId)
    .maybeSingle();

  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount, currency")
    .eq("order_id", order.id)
    .eq("method", "bank_transfer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: "No bank-transfer payment found for this order." }, { status: 404 });
  }
  if (!["pending", "submitted"].includes(payment.status)) {
    return NextResponse.json({ error: "This payment can no longer accept proof." }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Please upload a PNG, JPG, WEBP, or PDF file." },
      { status: 400 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File is too large (max 8MB)." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "bin";
  // Folder must be the uploader's own user id - that's what the
  // payment-proofs storage policy checks (storage.foldername(name)[1]).
  const path = `${user.id}/${payment.id}-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from("payment-proofs")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }

  await admin.from("payment_proofs").insert({
    payment_id: payment.id,
    storage_path: path,
    source: "upload",
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: user.id,
  });

  if (payment.status === "pending") {
    await admin.from("payments").update({ status: "submitted" }).eq("id", payment.id);
  }

  // Best-effort admin notification - a customer just uploaded proof for a
  // bank-transfer order, so this is the moment that actually shortens the
  // "up to 24 hours" wait. Never blocks or fails the upload itself; see
  // lib/email.ts for what happens when Resend isn't configured yet.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  await sendAdminAlert(
    `Payment proof uploaded - order ${order.order_number}`,
    `<p>${order.billing_email} uploaded payment proof for order <strong>${order.order_number}</strong> (${payment.currency} ${payment.amount}).</p>
     <p><a href="${siteUrl}/admin/orders">Review and confirm in the admin panel</a></p>`
  );

  return NextResponse.json({ ok: true });
}

// Lets a customer self-report "I sent it on WhatsApp" without a file -
// still creates a payment_proofs row (source 'whatsapp') so the payment
// surfaces in the admin queue instead of silently waiting forever.
export async function PATCH(request: Request, { params }: { params: { orderId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id")
    .eq("id", params.orderId)
    .maybeSingle();
  if (!order || order.customer_id !== user.id) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: payment } = await admin
    .from("payments")
    .select("id, status")
    .eq("order_id", order.id)
    .eq("method", "bank_transfer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment || !["pending", "submitted"].includes(payment.status)) {
    return NextResponse.json({ error: "This payment can no longer accept proof." }, { status: 400 });
  }

  // storage_path is NOT NULL in the schema even though there's no actual
  // file here - use a sentinel value that documents itself in the admin
  // view rather than pointing at a real storage object.
  await admin.from("payment_proofs").insert({
    payment_id: payment.id,
    storage_path: `whatsapp/${payment.id}`,
    source: "whatsapp",
    uploaded_by: user.id,
    note: "Customer reported sending proof via WhatsApp.",
  });

  if (payment.status === "pending") {
    await admin.from("payments").update({ status: "submitted" }).eq("id", payment.id);
  }

  return NextResponse.json({ ok: true });
}
