import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Protected digital delivery. Never exposes the storage path or a public
// URL - it verifies the signed-in user actually owns a license for the
// file's product, then mints a short-lived signed URL server-side.
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
    .select("id, product_id, delivery_type, storage_path, external_url, file_name, is_active")
    .eq("id", params.fileId)
    .eq("is_active", true)
    .maybeSingle();

  if (fileError || !file) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  const { data: license } = await admin
    .from("licenses")
    .select("id")
    .eq("customer_id", user.id)
    .eq("product_id", file.product_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!license) {
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

  // Web-app deliverable: send the customer straight to their access link
  // (e.g. https://batgos.batsols.com) - nothing is stored/served by us.
  if (file.delivery_type === "url") {
    if (!file.external_url) {
      return NextResponse.json({ error: "This product's access link isn't set up yet." }, { status: 500 });
    }
    return NextResponse.redirect(file.external_url);
  }

  // Installer file: mint a short-lived signed URL from the private bucket.
  if (!file.storage_path) {
    return NextResponse.json({ error: "This product's file isn't set up yet." }, { status: 500 });
  }

  const { data: signed, error: signError } = await admin.storage
    .from("product-files")
    .createSignedUrl(file.storage_path, 60, { download: file.file_name });

  if (signError || !signed) {
    return NextResponse.json({ error: "Could not generate download link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
