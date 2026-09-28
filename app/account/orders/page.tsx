import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  pending: "bg-amber-100 text-amber-700",
  awaiting_verification: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-ink-100 text-ink-600",
  cancelled: "bg-ink-100 text-ink-600",
};

const STATUS_LABELS: Record<string, string> = {
  awaiting_verification: "verifying payment",
};

export default async function OrdersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, status, total, currency, created_at, order_items(id, product_name, unit_price, quantity)")
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false });

  if (!orders || orders.length === 0) {
    return <p className="text-sm text-ink-500">You haven't placed any orders yet.</p>;
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div key={order.id} className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link href={`/account/orders/${order.id}`} className="text-sm font-semibold text-ink-950 hover:text-accent-600">
                {order.order_number}
              </Link>
              <span className="ml-3 text-xs text-ink-400">{formatDate(order.created_at)}</span>
            </div>
            <span className={`badge ${STATUS_STYLES[order.status] ?? "bg-ink-100 text-ink-600"}`}>
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <ul className="mt-4 divide-y divide-ink-100">
            {order.order_items.map((item: any) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">{item.product_name} &times; {item.quantity}</span>
                <span className="text-ink-500">{formatPrice(item.unit_price * item.quantity, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end border-t border-ink-100 pt-3 text-sm font-semibold text-ink-950">
            Total: {formatPrice(order.total, order.currency)}
          </div>
        </div>
      ))}
    </div>
  );
}
