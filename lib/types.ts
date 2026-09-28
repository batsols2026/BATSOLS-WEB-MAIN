// Central product/data model. Every page renders from these shapes instead
// of hardcoding product content, so new products only ever require a new
// row in Supabase - never a code change.
//
// These types mirror the LIVE database schema in the "BATsols" Supabase
// project (ikipcdezxywajggjjasc) - payments, entitlements, bank accounts
// and web-app deliverables are separate tables from `orders`/`products`,
// not columns bolted onto them. See supabase/CURRENT_SCHEMA.md for the
// full reference (tables, enums, functions, RLS policies) as they actually
// exist in the database today.

export type ProductType =
  | "software"
  | "web_app"
  | "mobile_app"
  | "template"
  | "system"
  | "ai_tool"
  | "automation"
  | "educational"
  | "other";

export type BillingType = "one_time" | "subscription";
export type ProductStatus = "draft" | "active" | "archived";
export type PaymentMethod = "card" | "bank_transfer";
export type PaymentStatus = "pending" | "submitted" | "confirmed" | "rejected" | "failed" | "refunded";
export type ProofSource = "upload" | "whatsapp" | "admin";
export type OrderStatus = "pending" | "awaiting_verification" | "paid" | "failed" | "refunded" | "cancelled";
export type LicenseStatus = "active" | "revoked";
export type EntitlementSource = "purchase" | "manual" | "trial";
export type EntitlementStatus = "active" | "suspended" | "expired";
export type DiscountType = "percent" | "fixed";

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  storage_path: string;
  version: string | null;
  size_bytes: number | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductWebApp {
  id: string;
  product_id: string;
  label: string;
  url: string;
  subdomain: string | null;
  access_instructions: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

export interface ProductVideo {
  id: string;
  title: string | null;
  url: string;
  sort_order: number;
}

export interface ProductFeature {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
}

export interface ProductBenefit {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

export interface ProductFAQ {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

export interface ProductInclusion {
  id: string;
  label: string;
  sort_order: number;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  short_description: string;
  description: string;
  problem_statement: string | null;
  who_its_for: string | null;
  how_it_works: string | null;
  category_id: string | null;
  category?: Category | null;
  product_type: ProductType;
  billing_type: BillingType;
  price: number;
  sale_price: number | null;
  currency: string;
  requirements: string | null;
  version: string | null;
  status: ProductStatus;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  rating_avg: number;
  rating_count: number;
  seo_title: string | null;
  seo_description: string | null;
  trial_days: number;
  created_at: string;
  images?: ProductImage[];
  videos?: ProductVideo[];
  features?: ProductFeature[];
  benefits?: ProductBenefit[];
  faqs?: ProductFAQ[];
  inclusions?: ProductInclusion[];
  reviews?: Review[];
  files?: ProductFile[];
  web_apps?: ProductWebApp[];
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  software: "Desktop Software",
  web_app: "Web Application",
  mobile_app: "Mobile Application",
  template: "Template",
  system: "Digital System",
  ai_tool: "AI-Powered Tool",
  automation: "Automation",
  educational: "Educational Resource",
  other: "Digital Product",
};

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
}

export interface BankAccount {
  id: string;
  label: string;
  bank_name: string;
  account_title: string;
  account_number: string;
  iban: string | null;
  branch: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string | null;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: string;
  provider: string | null;
  provider_payment_id: string | null;
  bank_account_id: string | null;
  sender_name: string | null;
  sender_bank: string | null;
  transfer_reference: string | null;
  transferred_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_note: string | null;
  rejection_reason: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentProof {
  id: string;
  payment_id: string;
  storage_path: string | null;
  source: ProofSource;
  mime_type: string | null;
  size_bytes: number | null;
  note: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface Entitlement {
  id: string;
  customer_id: string;
  product_id: string;
  order_item_id: string | null;
  source: EntitlementSource;
  status: EntitlementStatus;
  starts_at: string | null;
  expires_at: string | null;
  note: string | null;
  created_at: string;
}

export type BlogPostType = "article" | "case_study" | "user_guide" | "other";
export type BlogPostStatus = "draft" | "published";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  post_type: BlogPostType;
  status: BlogPostStatus;
  featured_image_url: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface License {
  id: string;
  order_item_id: string;
  product_id: string;
  customer_id: string | null;
  license_key: string;
  status: LicenseStatus;
  activation_limit: number;
  activations_used: number;
  issued_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  currency: string;
  created_at: string;
  order_items: OrderItemRow[];
}

export const SITE_SETTING_KEYS = [
  "bank_transfer_note",
  "download_link_ttl_sec",
  "support_email",
  "whatsapp_number",
] as const;

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];
export type SiteSettings = Record<SiteSettingKey, string>;
