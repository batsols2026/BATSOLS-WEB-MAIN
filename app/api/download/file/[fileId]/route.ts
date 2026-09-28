import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Protected digital delivery for installer files. Never exposes the
// storage path or a public URL - it verifies the signed-in user actually
// holds an active entitlement for the file's product (has_product_access),
// then mints a short-lived signed URL server-side.
export async function GET(request: Request, { params }: { params: { fileId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();

  const { data: file, error: fileError } = await admin
    .from("product_files")
    .select("id, product_id, storage_path, file_name, is_active")
    .eq("id", params.fileId)
    .eq("is_active", true)
    .maybeSingle();

  if (fileError || !file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  // has_product_access() reads auth.uid(), which is only set for a real
  // user session - the service-role admin client has none, so the same
  // check is done here explicitly instead of via RPC.
  const { data: entitlement } = await admin
    .from("entitlements")
    .select("id, expires_at")
    .eq("customer_id", user.id)
    .eq("product_id", file.product_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const hasAccess = Boolean(entitlement) && (!entitlement!.expires_at || new Date(entitlement!.expires_at) > new Date());
  if (!hasAccess) {
    return NextResponse.json(
      { error: "You don't have access to this file. Purchase the product to unlock it." },
      { status: 403 }
    );
  }

  await admin.from("download_events").insert({
    customer_id: user.id,
    product_file_id: file.id,
    ip_address: request.headers.get("x-forwarded-for"),
  });

  const { data: ttlSetting } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "download_link_ttl_sec")
    .maybeSingle();
  const ttl = Number(ttlSetting?.value) || 300;

  const { data: signed, error: signError } = await admin.storage
    .from("product-files")
    .createSignedUrl(file.storage_path, ttl, { download: file.file_name });

  if (signError || !signed) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
