import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { confirmBankTransferPayment, getPaymentProofUrl, rejectBankTransferPayment } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-ink-100 text-ink-600",
  awaiting_verification: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-ink-100 text-ink-600",
  cancelled: "bg-ink-100 text-ink-600",
};

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, billing_email, status, total, currency, created_at, order_items(id, product_name, quantity, unit_price)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const orderIds = (orders ?? []).map((o) => o.id);
  const { data: payments } = orderIds.length
    ? await supabase
        .from("payments")
        .select("id, order_id, method, status, admin_note, rejection_reason, created_at, payment_proofs(id, storage_path, source, uploaded_at)")
        .in("order_id", orderIds)
        .order("created_at", { ascending: false })
    : { data: [] as any[] };

  const paymentsByOrder = new Map<string, any>();
  for (const p of payments ?? []) {
    if (!paymentsByOrder.has(p.order_id)) paymentsByOrder.set(p.order_id, p);
  }

  // Only 'upload' proofs point at a real object in the payment-proofs
  // bucket - a 'whatsapp' self-report also has a storage_path (the column
  // is NOT NULL) but it's a sentinel, not a file, so signing it would just
  // produce a broken link.
  const proofUrls: Record<string, string | null> = {};
  for (const payment of payments ?? []) {
    const latestProof = (payment.payment_proofs ?? [])
      .filter((pr: any) => pr.source === "upload" && pr.storage_path)
      .sort((a: any, b: any) => (a.uploaded_at < b.uploaded_at ? 1 : -1))[0];
    if (latestProof) {
      proofUrls[payment.id] = await getPaymentProofUrl(latestProof.storage_path);
    }
  }

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-ink-950">Orders</h2>

      {!orders || orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const payment = paymentsByOrder.get(order.id);
            const needsReview =
              payment?.method === "bank_transfer" && ["pending", "submitted"].includes(payment.status);
            const hasWhatsappProof = (payment?.payment_proofs ?? []).some((p: any) => p.source === "whatsapp");

            return (
              <div key={order.id} className={`card p-5 ${needsReview ? "border-amber-300" : ""}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-medium text-ink-900">{order.order_number}</span>
                    <span className="ml-3 text-xs text-ink-400">{order.billing_email}</span>
                    <span className="ml-3 text-xs text-ink-400">{formatDate(order.created_at)}</span>
                    {payment && (
                      <span className="badge ml-3 bg-ink-100 text-ink-600">
                        {payment.method === "bank_transfer" ? "Bank Transfer" : "Card"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${STATUS_STYLES[order.status] ?? "bg-ink-100 text-ink-600"}`}>
                      {order.status.replace("_", " ")}
                    </span>
                    <span className="font-semibold text-ink-950">{formatPrice(order.total, order.currency)}</span>
                  </div>
                </div>
                <ul className="mt-3 text-sm text-ink-500">
                  {order.order_items.map((item: any) => (
                    <li key={item.id}>{item.product_name} &times; {item.quantity}</li>
                  ))}
                </ul>

                {payment?.status === "rejected" && payment.rejection_reason && (
                  <p className="mt-2 text-xs italic text-red-600">Rejected: {payment.rejection_reason}</p>
                )}

                {needsReview && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink-100 pt-4">
                    {proofUrls[payment.id] ? (
                      <a
                        href={proofUrls[payment.id]!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary py-1.5 text-xs"
                      >
                        View Payment Proof
                      </a>
                    ) : hasWhatsappProof ? (
                      <span className="text-xs text-ink-400">Customer said they sent it on WhatsApp. Check there.</span>
                    ) : (
                      <span className="text-xs text-ink-400">No proof submitted yet.</span>
                    )}
                    <form action={confirmBankTransferPayment.bind(null, payment.id)}>
                      <button className="btn-primary py-1.5 text-xs">Confirm Payment</button>
                    </form>
                    <details className="inline-block">
                      <summary className="cursor-pointer list-none rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-red-300 hover:text-red-600">
                        Reject
                      </summary>
                      <form
                        action={rejectBankTransferPayment.bind(null, payment.id)}
                        className="mt-2 flex flex-wrap items-center gap-2"
                      >
                        <input
                          name="reason"
                          placeholder="Reason (shown to customer context, optional)"
                          className="field max-w-xs py-1.5 text-xs"
                        />
                        <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                          Confirm Reject
                        </button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
