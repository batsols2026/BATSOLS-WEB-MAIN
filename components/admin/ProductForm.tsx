"use client";

import type { Category, Product } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";

export default function ProductForm({
  product,
  categories,
  action,
}: {
  product?: Product;
  categories: Category[];
  action: (formData: FormData) => void;
}) {
  return (
    <form action={action} className="flex flex-col gap-8">
      <section className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Product name</label>
          <input name="name" required defaultValue={product?.name} className="field" />
        </div>
        <div>
          <label className="label">Slug (URL)</label>
          <input name="slug" defaultValue={product?.slug} placeholder="auto-generated if blank" className="field" />
        </div>
        <div>
          <label className="label">Category</label>
          <select name="category_id" defaultValue={product?.category_id ?? ""} className="field">
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Tagline (one-line value proposition)</label>
          <input name="tagline" required defaultValue={product?.tagline} className="field" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Short description</label>
          <textarea name="short_description" required defaultValue={product?.short_description} className="field min-h-[70px]" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Full description</label>
          <textarea name="description" required defaultValue={product?.description} className="field min-h-[140px]" />
        </div>
      </section>

      <section className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Problem it solves</label>
          <textarea name="problem_statement" defaultValue={product?.problem_statement ?? ""} className="field min-h-[80px]" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">How it works</label>
          <textarea name="how_it_works" defaultValue={product?.how_it_works ?? ""} className="field min-h-[80px]" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Who it's for</label>
          <textarea name="who_its_for" defaultValue={product?.who_its_for ?? ""} className="field min-h-[80px]" />
        </div>
      </section>

      <section className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <div>
          <label className="label">Product type</label>
          <select name="product_type" defaultValue={product?.product_type ?? "software"} className="field">
            {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Billing</label>
          <select name="billing_type" defaultValue={product?.billing_type ?? "one_time"} className="field">
            <option value="one_time">One-time purchase</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select name="status" defaultValue={product?.status ?? "draft"} className="field">
            <option value="draft">Draft</option>
            <option value="active">Active (visible in store)</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <div>
          <label className="label">Price</label>
          <input name="price" type="number" step="0.01" min="0" required defaultValue={product?.price ?? 0} className="field" />
        </div>
        <div>
          <label className="label">Sale price (optional)</label>
          <input name="sale_price" type="number" step="0.01" min="0" defaultValue={product?.sale_price ?? ""} className="field" />
        </div>
        <div>
          <label className="label">Version</label>
          <input name="version" defaultValue={product?.version ?? ""} className="field" />
        </div>
        <div className="sm:col-span-3">
          <label className="label">Requirements</label>
          <input name="requirements" defaultValue={product?.requirements ?? ""} className="field" placeholder="e.g. Windows 10+, or 'None, runs in browser'" />
        </div>
        <div className="flex items-center gap-2">
          <input id="is_featured" name="is_featured" type="checkbox" defaultChecked={product?.is_featured} className="h-4 w-4 rounded border-ink-300" />
          <label htmlFor="is_featured" className="text-sm text-ink-700">Featured</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="is_new" name="is_new" type="checkbox" defaultChecked={product?.is_new} className="h-4 w-4 rounded border-ink-300" />
          <label htmlFor="is_new" className="text-sm text-ink-700">New</label>
        </div>
        <div className="flex items-center gap-2">
          <input id="is_best_seller" name="is_best_seller" type="checkbox" defaultChecked={product?.is_best_seller} className="h-4 w-4 rounded border-ink-300" />
          <label htmlFor="is_best_seller" className="text-sm text-ink-700">Best Seller</label>
        </div>
      </section>

      <section className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <label className="label">SEO title</label>
          <input name="seo_title" defaultValue={product?.seo_title ?? ""} className="field" />
        </div>
        <div>
          <label className="label">SEO description</label>
          <input name="seo_description" defaultValue={product?.seo_description ?? ""} className="field" />
        </div>
      </section>

      <button type="submit" className="btn-primary self-start">
        {product ? "Save Changes" : "Create Product"}
      </button>
    </form>
  );
}
