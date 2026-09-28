import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-amber-100 text-amber-700",
  archived: "bg-ink-100 text-ink-600",
};

export default async function AdminProductsPage() {
  const supabase = createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, price, sale_price, currency, status, is_featured, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-950">Products</h2>
        <Link href="/admin/products/new" className="btn-primary">New Product</Link>
      </div>

      {!products || products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
          No products yet. Create your first one to populate the store.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-100">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-400">
              <tr>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-ink-900">{p.name}</div>
                    <div className="text-xs text-ink-400">/{p.slug}</div>
                  </td>
                  <td className="px-5 py-4 text-ink-700">
                    {formatPrice(p.sale_price ?? p.price, p.currency)}
                    {p.sale_price && <span className="ml-2 text-xs text-ink-400 line-through">{formatPrice(p.price, p.currency)}</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`badge ${STATUS_STYLES[p.status] ?? "bg-ink-100 text-ink-600"}`}>{p.status}</span>
                    {p.is_featured && <span className="badge ml-2 bg-accent-600/10 text-accent-600">Featured</span>}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link href={`/admin/products/${p.id}/edit`} className="text-sm font-medium text-accent-600 hover:text-accent-500">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
