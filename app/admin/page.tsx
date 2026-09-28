import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = createClient();

  const [{ count: productCount }, { count: activeCount }, { data: paidOrders }, { count: pendingMessages }] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("orders").select("total").eq("status", "paid"),
      supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("is_read", false),
    ]);

  const revenue = (paidOrders ?? []).reduce((sum, o) => sum + Number(o.total), 0);

  const stats = [
    { label: "Total products", value: productCount ?? 0 },
    { label: "Active in store", value: activeCount ?? 0 },
    { label: "Paid orders", value: (paidOrders ?? []).length },
    { label: "Total revenue", value: formatPrice(revenue) },
    { label: "Unread messages", value: pendingMessages ?? 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-6">
          <span className="text-sm text-ink-500">{s.label}</span>
          <div className="mt-2 text-2xl font-semibold text-ink-950">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
