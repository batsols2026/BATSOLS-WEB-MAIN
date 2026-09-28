import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateLicenseKey } from "@/lib/license";

/**
 * Marks an order paid and issues one license per order item. Shared by the
 * Stripe webhook (real card payments) and the admin "Confirm Payment" action
 * (manual bank-transfer confirmation) so both paths fulfil an order the same
 * way. Safe to call more than once - already-paid orders are skipped so a
 * retried webhook or a double click never issues duplicate licenses.
 */
export async function fulfillOrder(
  admin: SupabaseClient,
  orderId: string,
  confirmedBy?: string
) {
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false as const, error: "Order not found." };
  if (order.status === "paid") return { ok: true as const, alreadyPaid: true };

  const { error: updateError } = await admin
    .from("orders")
    .update({
      status: "paid",
      confirmed_by: confirmedBy ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) return { ok: false as const, error: updateError.message };

  const { data: items } = await admin
    .from("order_items")
    .select("id, product_id, quantity")
    .eq("order_id", orderId);

  for (const item of items ?? []) {
    if (!item.product_id) continue;
    await admin.from("licenses").insert({
      order_item_id: item.id,
      product_id: item.product_id,
      customer_id: order.customer_id,
      license_key: generateLicenseKey(),
      activation_limit: item.quantity,
    });
  }

  return { ok: true as const, alreadyPaid: false };
}
