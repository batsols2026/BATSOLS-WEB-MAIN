import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DownloadsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Entitlements (not licenses) are the real access gate: a purchase grants
  // one per product, and it's what has_product_access() checks before the
  // database will even let product_files/product_web_apps rows be read.
  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("id, product_id, status, created_at, products(name, slug)")
    .eq("customer_id", user!.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (!entitlements || entitlements.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Nothing here yet. Once you purchase a product, its downloads and
        license key will show up on this page.
      </p>
    );
  }

  const productIds = entitlements.map((e: any) => e.product_id).filter(Boolean);

  const [{ data: licenses }, { data: files }, { data: webApps }] = await Promise.all([
    supabase
      .from("licenses")
      .select("id, license_key, status, product_id, issued_at")
      .eq("customer_id", user!.id)
      .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]),
    productIds.length
      ? supabase
          .from("product_files")
          .select("id, product_id, file_name, version")
          .in("product_id", productIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase
          .from("product_web_apps")
          .select("id, product_id, label, access_instructions")
          .in("product_id", productIds)
          .eq("is_active", true)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  return (
    <div className="space-y-6">
      {entitlements.map((ent: any) => {
        const license = (licenses ?? []).find((l: any) => l.product_id === ent.product_id);
        const productFiles = (files ?? []).filter((f: any) => f.product_id === ent.product_id);
        const productWebApps = (webApps ?? []).filter((w: any) => w.product_id === ent.product_id);

        return (
          <div key={ent.id} className="card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href={`/store/${ent.products?.slug ?? ""}`}
                  className="text-base font-semibold text-ink-950 hover:text-accent-600"
                >
                  {ent.products?.name ?? "Product"}
                </Link>
                <p className="mt-1 text-xs text-ink-400">Unlocked {formatDate(ent.created_at)}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className="badge bg-green-100 text-green-700">Active</span>
                <Link href={`/contact?subject=Regarding+Product+${encodeURIComponent(ent.products?.name ?? '')}`} className="btn-secondary py-1 text-xs">
                  Support
                </Link>
              </div>
            </div>

            {license && (
              <div className="mt-4 rounded-lg bg-ink-50 px-4 py-3">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-400">License Key</span>
                <div className="mt-1 font-mono text-sm text-ink-900">{license.license_key}</div>
              </div>
            )}

            {productFiles.length > 0 || productWebApps.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {productFiles.map((file: any) => (
                  <li key={file.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-3">
                    <span className="text-sm text-ink-700">
                      {file.file_name} {file.version && <span className="text-ink-400">v{file.version}</span>}
                    </span>
                    <a href={`/api/download/file/${file.id}`} className="btn-secondary py-1.5 text-xs">
                      Download
                    </a>
                  </li>
                ))}
                {productWebApps.map((app: any) => (
                  <li key={app.id} className="flex items-center justify-between rounded-lg border border-ink-100 px-4 py-3">
                    <span className="text-sm text-ink-700">
                      {app.label}
                      {app.access_instructions && (
                        <span className="ml-2 text-ink-400">{app.access_instructions}</span>
                      )}
                    </span>
                    <a href={`/api/download/webapp/${app.id}`} className="btn-secondary py-1.5 text-xs">
                      Open Web App
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs text-ink-400">No files attached to this product yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
