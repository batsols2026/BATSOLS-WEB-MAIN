import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = createClient();

  const { data: products } = await supabase
    .from("products")
    .select("slug, created_at")
    .eq("status", "active");

  const staticRoutes: MetadataRoute.Sitemap = ["", "/store", "/about", "/contact"].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
  }));

  const productRoutes: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${siteUrl}/store/${p.slug}`,
    lastModified: new Date(p.created_at),
  }));

  return [...staticRoutes, ...productRoutes];
}
