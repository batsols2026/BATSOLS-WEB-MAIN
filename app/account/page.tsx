import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: orderCount } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user!.id)
    .eq("status", "paid");

  const { count: licenseCount } = await supabase
    .from("licenses")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", user!.id);

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="card p-6">
        <span className="text-sm text-ink-500">Completed orders</span>
        <div className="mt-2 text-3xl font-semibold text-ink-950">{orderCount ?? 0}</div>
        <Link href="/account/orders" className="mt-4 inline-block text-sm font-medium text-accent-600 hover:text-accent-500">
          View order history &rarr;
        </Link>
      </div>
      <div className="card p-6">
        <span className="text-sm text-ink-500">Active products</span>
        <div className="mt-2 text-3xl font-semibold text-ink-950">{licenseCount ?? 0}</div>
        <Link href="/account/downloads" className="mt-4 inline-block text-sm font-medium text-accent-600 hover:text-accent-500">
          Go to downloads &rarr;
        </Link>
      </div>
      <div className="card p-6 sm:col-span-2">
        <span className="text-sm text-ink-500">Looking for something new?</span>
        <p className="mt-2 text-sm text-ink-600">Browse the full BATsols catalog for your next product.</p>
        <Link href="/store" className="btn-secondary mt-4 inline-flex">Browse Store</Link>
      </div>
    </div>
  );
}
