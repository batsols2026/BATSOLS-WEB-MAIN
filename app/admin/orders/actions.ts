"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

// Manually confirms a bank-transfer payment: marks it 'confirmed', which
// fires the database trigger payments_sync_order -> grant_order_access(),
// marking the order 'paid' and issuing one license + entitlement per item -
// the exact same path the Stripe webhook uses for card payments. This is
// the ONLY thing that unlocks a bank-transfer order; nothing marks it paid
// automatically.
//
// Deliberately calls the confirm_bank_transfer() RPC through the signed-in
// admin's own session client, not the service-role admin client: the
// function re-checks is_admin() against auth.uid() itself, which only
// exists for a real user session. requireAdmin() is still called first as
// defense in depth (and to fail with a clear error before hitting the DB).
export async function confirmBankTransferPayment(paymentId: string) {
  await requireAdmin();

  const supabase = createClient();
  const { error } = await supabase.rpc("confirm_bank_transfer", {
    p_payment_id: paymentId,
    p_note: null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
}

export async function rejectBankTransferPayment(paymentId: string, formData: FormData) {
  await requireAdmin();

  const reasonValue = formData.get("reason");
  const reason = typeof reasonValue === "string" && reasonValue.trim() !== "" ? reasonValue.trim() : null;

  const supabase = createClient();
  const { error } = await supabase.rpc("reject_bank_transfer", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/orders");
}

// Generates a short-lived signed URL so an admin can view a customer's
// uploaded payment screenshot/receipt. The 'payment-proofs' bucket is
// private; this is the only way to see the file, so it must stay
// admin-only even though it's only ever called from the admin orders page.
export async function getPaymentProofUrl(proofPath: string) {
  await requireAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("payment-proofs")
    .createSignedUrl(proofPath, 300);
  if (error || !data) return null;
  return data.signedUrl;
}
