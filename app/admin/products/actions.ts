"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BillingType, ProductStatus, ProductType } from "@/lib/types";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(formData: FormData, key: string) {
  const v = str(formData, key);
  return v === null ? null : Number(v);
}

export async function createProduct(formData: FormData) {
  const supabase = createClient();
  const name = str(formData, "name") ?? "Untitled Product";
  const slug = str(formData, "slug") || slugify(name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      tagline: str(formData, "tagline") ?? "",
      short_description: str(formData, "short_description") ?? "",
      description: str(formData, "description") ?? "",
      problem_statement: str(formData, "problem_statement"),
      who_its_for: str(formData, "who_its_for"),
      how_it_works: str(formData, "how_it_works"),
      category_id: str(formData, "category_id"),
      product_type: (str(formData, "product_type") ?? "software") as ProductType,
      billing_type: (str(formData, "billing_type") ?? "one_time") as BillingType,
      price: num(formData, "price") ?? 0,
      sale_price: num(formData, "sale_price"),
      requirements: str(formData, "requirements"),
      version: str(formData, "version"),
      status: (str(formData, "status") ?? "draft") as ProductStatus,
      is_featured: formData.get("is_featured") === "on",
      is_new: formData.get("is_new") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
      seo_title: str(formData, "seo_title"),
      seo_description: str(formData, "seo_description"),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Could not create product.");
  }

  revalidatePath("/admin/products");
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
  redirect(`/admin/products/${data.id}/edit`);
}

export async function updateProduct(productId: string, formData: FormData) {
  const supabase = createClient();
  const name = str(formData, "name") ?? "Untitled Product";
  const slug = str(formData, "slug") || slugify(name);

  const { error } = await supabase
    .from("products")
    .update({
      name,
      slug,
      tagline: str(formData, "tagline") ?? "",
      short_description: str(formData, "short_description") ?? "",
      description: str(formData, "description") ?? "",
      problem_statement: str(formData, "problem_statement"),
      who_its_for: str(formData, "who_its_for"),
      how_it_works: str(formData, "how_it_works"),
      category_id: str(formData, "category_id"),
      product_type: (str(formData, "product_type") ?? "software") as ProductType,
      billing_type: (str(formData, "billing_type") ?? "one_time") as BillingType,
      price: num(formData, "price") ?? 0,
      sale_price: num(formData, "sale_price"),
      requirements: str(formData, "requirements"),
      version: str(formData, "version"),
      status: (str(formData, "status") ?? "draft") as ProductStatus,
      is_featured: formData.get("is_featured") === "on",
      is_new: formData.get("is_new") === "on",
      is_best_seller: formData.get("is_best_seller") === "on",
      seo_title: str(formData, "seo_title"),
      seo_description: str(formData, "seo_description"),
    })
    .eq("id", productId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProduct(productId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
  redirect("/admin/products");
}

// --- Child content rows (images, features, benefits, faqs, inclusions) ---

async function nextSortOrder(supabase: ReturnType<typeof createClient>, table: string, productId: string) {
  const { data } = await supabase
    .from(table)
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? -1) + 1;
}

export async function addProductImage(productId: string, formData: FormData) {
  const supabase = createClient();
  const url = str(formData, "url");
  if (!url) return;
  const sort_order = await nextSortOrder(supabase, "product_images", productId);
  await supabase.from("product_images").insert({
    product_id: productId,
    url,
    alt_text: str(formData, "alt_text"),
    is_primary: sort_order === 0,
    sort_order,
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductImage(productId: string, imageId: string) {
  const supabase = createClient();
  await supabase.from("product_images").delete().eq("id", imageId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function addProductFeature(productId: string, formData: FormData) {
  const supabase = createClient();
  const title = str(formData, "title");
  if (!title) return;
  const sort_order = await nextSortOrder(supabase, "product_features", productId);
  await supabase.from("product_features").insert({
    product_id: productId,
    title,
    description: str(formData, "description"),
    sort_order,
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductFeature(productId: string, id: string) {
  const supabase = createClient();
  await supabase.from("product_features").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function addProductBenefit(productId: string, formData: FormData) {
  const supabase = createClient();
  const title = str(formData, "title");
  if (!title) return;
  const sort_order = await nextSortOrder(supabase, "product_benefits", productId);
  await supabase.from("product_benefits").insert({
    product_id: productId,
    title,
    description: str(formData, "description"),
    sort_order,
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductBenefit(productId: string, id: string) {
  const supabase = createClient();
  await supabase.from("product_benefits").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function addProductFaq(productId: string, formData: FormData) {
  const supabase = createClient();
  const question = str(formData, "question");
  const answer = str(formData, "answer");
  if (!question || !answer) return;
  const sort_order = await nextSortOrder(supabase, "product_faqs", productId);
  await supabase.from("product_faqs").insert({ product_id: productId, question, answer, sort_order });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductFaq(productId: string, id: string) {
  const supabase = createClient();
  await supabase.from("product_faqs").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function addProductInclusion(productId: string, formData: FormData) {
  const supabase = createClient();
  const label = str(formData, "label");
  if (!label) return;
  const sort_order = await nextSortOrder(supabase, "product_inclusions", productId);
  await supabase.from("product_inclusions").insert({ product_id: productId, label, sort_order });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductInclusion(productId: string, id: string) {
  const supabase = createClient();
  await supabase.from("product_inclusions").delete().eq("id", id);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function moderateReview(productId: string, reviewId: string, isPublished: boolean) {
  const supabase = createClient();
  await supabase.from("reviews").update({ is_published: isPublished }).eq("id", reviewId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

// --- Deliverables: installer files (uploaded client-side) or web-app links ---

// Called after the browser has already uploaded the installer directly to
// the private 'product-files' storage bucket (see InstallerUploadForm) -
// this just records the metadata row. Keeping the binary upload client-side
// avoids routing large .exe files through a server action / API route.
export async function recordProductFile(
  productId: string,
  data: { fileName: string; storagePath: string; sizeBytes: number; version?: string }
) {
  const supabase = createClient();
  const { error } = await supabase.from("product_files").insert({
    product_id: productId,
    file_name: data.fileName,
    storage_path: data.storagePath,
    size_bytes: data.sizeBytes,
    version: data.version || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductFile(productId: string, fileId: string) {
  const supabase = createClient();
  const { data: file } = await supabase
    .from("product_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (file?.storage_path) {
    await supabase.storage.from("product-files").remove([file.storage_path]);
  }
  await supabase.from("product_files").delete().eq("id", fileId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

// --- Deliverables: hosted web-app access (separate table from installer files) ---

export async function addProductWebApp(productId: string, formData: FormData) {
  const supabase = createClient();
  const label = str(formData, "label");
  const url = str(formData, "url");
  if (!label || !url) return;

  const { data: existing } = await supabase
    .from("product_web_apps")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("product_web_apps").insert({
    product_id: productId,
    label,
    url,
    subdomain: str(formData, "subdomain"),
    access_instructions: str(formData, "access_instructions"),
    sort_order: (existing?.sort_order ?? -1) + 1,
  });
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}

export async function deleteProductWebApp(productId: string, webAppId: string) {
  const supabase = createClient();
  await supabase.from("product_web_apps").delete().eq("id", webAppId);
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidatePath("/", "layout"); // public home/store/product pages are timed-cache (see app/page.tsx)
}
