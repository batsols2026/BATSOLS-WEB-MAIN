import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { BankAccount, Category, Product, SiteSettingKey, SiteSettings } from "@/lib/types";
import { SITE_SETTING_KEYS } from "@/lib/types";

const PRODUCT_CARD_FIELDS = `
  id, slug, name, tagline, short_description, price, sale_price, currency,
  product_type, billing_type, is_featured, is_new, is_best_seller,
  rating_avg, rating_count, category_id, created_at,
  category:categories(id, name, slug, description, sort_order),
  images:product_images(id, url, alt_text, is_primary, sort_order)
`;

export interface StoreFilters {
  q?: string;
  category?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "rating" | "featured";
  type?: string;
}

// The functions below back the public storefront (home, store, product
// pages), which are timed-cache (`export const revalidate`) rather than
// force-dynamic - see app/page.tsx for why. They deliberately use the
// cookie-free public client: calling next/headers' cookies() (what
// lib/supabase/server.ts's createClient() does, for good reason elsewhere)
// inside a Server Component opts the whole route into dynamic rendering
// regardless of `revalidate`, which was silently defeating that cache and
// forcing a full server round-trip - and a fresh Supabase query - on every
// single visit. None of these need a user session: they only ever read
// public/active rows, gated by the same RLS an anonymous visitor gets.

export async function getCategories(): Promise<Category[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getStoreProducts(filters: StoreFilters = {}): Promise<Product[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_FIELDS)
    .eq("status", "active");

  if (filters.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,tagline.ilike.%${filters.q}%,short_description.ilike.%${filters.q}%`
    );
  }
  if (filters.category) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", filters.category)
      .maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
  }
  if (filters.type) {
    query = query.eq("product_type", filters.type);
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "rating":
      query = query.order("rating_avg", { ascending: false });
      break;
    case "featured":
      query = query.order("is_featured", { ascending: false }).order("created_at", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_CARD_FIELDS)
    .eq("status", "active")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      category:categories(id, name, slug, description, sort_order),
      images:product_images(id, url, alt_text, is_primary, sort_order),
      videos:product_videos(id, title, url, sort_order),
      features:product_features(id, title, description, icon, sort_order),
      benefits:product_benefits(id, title, description, sort_order),
      faqs:product_faqs(id, question, answer, sort_order),
      inclusions:product_inclusions(id, label, sort_order),
      reviews:reviews(id, author_name, rating, title, body, is_verified_purchase, created_at, is_published),
      web_apps:product_web_apps(id, label, url, subdomain, access_instructions, is_active, sort_order)
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const product = data as unknown as Product;
  product.images = (product.images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  product.features = (product.features ?? []).sort((a, b) => a.sort_order - b.sort_order);
  product.benefits = (product.benefits ?? []).sort((a, b) => a.sort_order - b.sort_order);
  product.faqs = (product.faqs ?? []).sort((a, b) => a.sort_order - b.sort_order);
  product.inclusions = (product.inclusions ?? []).sort((a, b) => a.sort_order - b.sort_order);
  product.reviews = (product.reviews ?? []).filter((r: any) => r.is_published);

  return product;
}

export interface TestimonialRow {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  product_name: string;
  product_slug: string;
}

export async function getTopTestimonials(limit = 6): Promise<TestimonialRow[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, author_name, rating, title, body, products(name, slug)")
    .eq("is_published", true)
    .gte("rating", 4)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    author_name: r.author_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    product_name: r.products?.name ?? "",
    product_slug: r.products?.slug ?? "",
  }));
}

export async function getRelatedProducts(product: Product, limit = 3): Promise<Product[]> {
  const supabase = createPublicClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_CARD_FIELDS)
    .eq("status", "active")
    .neq("id", product.id)
    .limit(limit);

  if (product.category_id) {
    query = query.eq("category_id", product.category_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Product[];
}

// --- Bank accounts (admin-managed, shown to customers at checkout) --------

export async function getActiveBankAccounts(): Promise<BankAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, label, bank_name, account_title, account_number, iban, branch, instructions, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getAllBankAccounts(): Promise<BankAccount[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("bank_accounts")
    .select("id, label, bank_name, account_title, account_number, iban, branch, instructions, is_active, sort_order")
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// --- Site settings (key/value, admin-managed) ------------------------------

const SITE_SETTING_DEFAULTS: SiteSettings = {
  bank_transfer_note: "",
  download_link_ttl_sec: "300",
  support_email: "",
  whatsapp_number: "",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const supabase = createClient();
  const { data, error } = await supabase.from("site_settings").select("key, value");
  if (error) throw error;

  const settings = { ...SITE_SETTING_DEFAULTS };
  for (const row of data ?? []) {
    if ((SITE_SETTING_KEYS as readonly string[]).includes(row.key)) {
      (settings as any)[row.key] = row.value ?? "";
    }
  }
  return settings;
}

export function whatsappLinkFor(number: string) {
  const digits = number.replace(/[^0-9]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}
