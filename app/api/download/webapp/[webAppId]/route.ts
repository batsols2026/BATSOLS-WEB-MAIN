import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Protected web-app hand-off: verifies the signed-in user holds an active
// entitlement for the product, logs the access, then redirects to the
// hosted product (e.g. https://batgos.batsols.com). Nothing is stored or
// served by us - this route just gates the redirect.
export async function GET(request: Request, { params }: { params: { webAppId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const admin = createAdminClient();

  const { data: app, error: appError } = await admin
    .from("product_web_apps")
    .select("id, product_id, url, is_active")
    .eq("id", params.webAppId)
    .eq("is_active", true)
    .maybeSingle();

  if (appError || !app) {
    return NextResponse.json({ error: "Web app not found." }, { status: 404 });
  }

  const { data: entitlement } = await admin
    .from("entitlements")
    .select("id, expires_at")
    .eq("customer_id", user.id)
    .eq("product_id", app.product_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const hasAccess = Boolean(entitlement) && (!entitlement!.expires_at || new Date(entitlement!.expires_at) > new Date());

  if (!hasAccess) {
    return NextResponse.json(
      { error: "You don't have access to this product. Purchase it to unlock it." },
      { status: 403 }
    );
  }

  await admin.from("download_events").insert({
    customer_id: user.id,
    ip_address: request.headers.get("x-forwarded-for"),
  });

  return NextResponse.redirect(app.url);
}
