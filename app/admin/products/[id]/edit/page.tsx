import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import InstallerUploadForm from "@/components/admin/InstallerUploadForm";
import {
  updateProduct,
  deleteProduct,
  addProductImage,
  deleteProductImage,
  addProductFeature,
  deleteProductFeature,
  addProductBenefit,
  deleteProductBenefit,
  addProductFaq,
  deleteProductFaq,
  addProductInclusion,
  deleteProductInclusion,
  addProductWebApp,
  deleteProductWebApp,
  deleteProductFile,
  moderateReview,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        *,
        images:product_images(id, url, alt_text, is_primary, sort_order),
        features:product_features(id, title, description, sort_order),
        benefits:product_benefits(id, title, description, sort_order),
        faqs:product_faqs(id, question, answer, sort_order),
        inclusions:product_inclusions(id, label, sort_order),
        reviews:reviews(id, author_name, rating, title, body, is_published, created_at),
        files:product_files(id, file_name, storage_path, version, size_bytes, is_active),
        web_apps:product_web_apps(id, label, url, subdomain, access_instructions, is_active, sort_order)
      `)
      .eq("id", params.id)
      .maybeSingle(),
    supabase.from("categories").select("id, name, slug, description, sort_order").order("sort_order"),
  ]);

  if (!product) notFound();

  const updateWithId = updateProduct.bind(null, product.id);
  const deleteWithId = deleteProduct.bind(null, product.id);
  const addImage = addProductImage.bind(null, product.id);
  const addFeature = addProductFeature.bind(null, product.id);
  const addBenefit = addProductBenefit.bind(null, product.id);
  const addFaq = addProductFaq.bind(null, product.id);
  const addInclusion = addProductInclusion.bind(null, product.id);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink-950">Edit: {product.name}</h2>
        <form action={deleteWithId}>
          <button className="text-sm font-medium text-red-600 hover:text-red-700">Delete Product</button>
        </form>
      </div>

      <ProductForm product={product as any} categories={categories ?? []} action={updateWithId} />

      {/* Deliverables: what the customer gets after payment */}
      <EditorSection title="Installer Files (unlocked after payment)">
        <p className="mb-4 text-sm text-ink-500">
          Add a downloadable installer (.exe, .dmg, .zip) for desktop
          products. Customers only ever see these after their order is
          marked paid (an active entitlement is required to even read the
          row).
        </p>

        {(product.files ?? []).length > 0 && (
          <ul className="mb-4 divide-y divide-ink-100">
            {(product.files ?? []).map((f: any) => (
              <li key={f.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span>
                  <span className="font-medium">{f.file_name}</span>
                  {f.version && <span className="text-ink-400"> v{f.version}</span>}
                  {f.size_bytes && (
                    <span className="ml-2 text-ink-400">{(f.size_bytes / (1024 * 1024)).toFixed(1)} MB</span>
                  )}
                  {!f.is_active && <span className="badge ml-2 bg-ink-100 text-ink-600">Inactive</span>}
                </span>
                <form action={deleteProductFile.bind(null, product.id, f.id)}>
                  <button className="text-xs text-ink-400 hover:text-red-500">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-ink-100 pt-4">
          <InstallerUploadForm productId={product.id} />
        </div>
      </EditorSection>

      <EditorSection title="Web App Access (unlocked after payment)">
        <p className="mb-4 text-sm text-ink-500">
          For hosted products (e.g. a web app at batgos.batsols.com).
          Customers see this link and any access instructions only once
          they own an active entitlement for this product.
        </p>

        {(product.web_apps ?? []).length > 0 && (
          <ul className="mb-4 divide-y divide-ink-100">
            {(product.web_apps ?? []).map((w: any) => (
              <li key={w.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                <span>
                  <span className="font-medium">{w.label}</span>
                  <span className="ml-2 text-ink-400">{w.url}</span>
                  {!w.is_active && <span className="badge ml-2 bg-ink-100 text-ink-600">Inactive</span>}
                </span>
                <form action={deleteProductWebApp.bind(null, product.id, w.id)}>
                  <button className="text-xs text-ink-400 hover:text-red-500">Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addProductWebApp.bind(null, product.id)} className="flex flex-col gap-3 border-t border-ink-100 pt-4 sm:flex-row sm:flex-wrap">
          <input name="label" required placeholder="Label, e.g. Web App Access" className="field flex-1" />
          <input name="url" required placeholder="https://batgos.batsols.com" className="field flex-1" type="url" />
          <input name="subdomain" placeholder="Subdomain (optional)" className="field sm:max-w-[160px]" />
          <input name="access_instructions" placeholder="Access instructions (optional)" className="field flex-1" />
          <button className="btn-secondary">Add Web App</button>
        </form>
      </EditorSection>

      {/* Images */}
      <EditorSection title="Images">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(product.images ?? []).map((img: any) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-ink-50">
              <Image src={img.url} alt={img.alt_text ?? ""} fill className="object-contain" />
              <form action={deleteProductImage.bind(null, product.id, img.id)} className="absolute right-1 top-1">
                <button className="rounded bg-white/90 px-2 py-0.5 text-xs text-red-600">Remove</button>
              </form>
            </div>
          ))}
        </div>
        <form action={addImage} className="flex flex-wrap gap-3">
          <input name="url" required placeholder="Image URL (from product-images storage bucket)" className="field flex-1" />
          <input name="alt_text" placeholder="Alt text" className="field sm:max-w-[200px]" />
          <button className="btn-secondary">Add Image</button>
        </form>
      </EditorSection>

      {/* Inclusions */}
      <EditorSection title="What's included">
        <ItemList
          items={product.inclusions ?? []}
          render={(item: any) => item.label}
          onDelete={deleteProductInclusion.bind(null, product.id)}
        />
        <form action={addInclusion} className="mt-3 flex gap-3">
          <input name="label" required placeholder="e.g. Lifetime updates" className="field flex-1" />
          <button className="btn-secondary">Add</button>
        </form>
      </EditorSection>

      {/* Features */}
      <EditorSection title="Features">
        <ItemList
          items={product.features ?? []}
          render={(item: any) => (
            <>
              <span className="font-medium">{item.title}</span>
              {item.description && <span className="text-ink-500">: {item.description}</span>}
            </>
          )}
          onDelete={deleteProductFeature.bind(null, product.id)}
        />
        <form action={addFeature} className="mt-3 flex flex-wrap gap-3">
          <input name="title" required placeholder="Feature title" className="field flex-1" />
          <input name="description" placeholder="Description (optional)" className="field flex-1" />
          <button className="btn-secondary">Add</button>
        </form>
      </EditorSection>

      {/* Benefits */}
      <EditorSection title="Benefits">
        <ItemList
          items={product.benefits ?? []}
          render={(item: any) => (
            <>
              <span className="font-medium">{item.title}</span>
              {item.description && <span className="text-ink-500">: {item.description}</span>}
            </>
          )}
          onDelete={deleteProductBenefit.bind(null, product.id)}
        />
        <form action={addBenefit} className="mt-3 flex flex-wrap gap-3">
          <input name="title" required placeholder="Benefit title" className="field flex-1" />
          <input name="description" placeholder="Description (optional)" className="field flex-1" />
          <button className="btn-secondary">Add</button>
        </form>
      </EditorSection>

      {/* FAQs */}
      <EditorSection title="FAQs">
        <ItemList
          items={product.faqs ?? []}
          render={(item: any) => (
            <>
              <span className="font-medium">{item.question}</span>
              <span className="text-ink-500">: {item.answer}</span>
            </>
          )}
          onDelete={deleteProductFaq.bind(null, product.id)}
        />
        <form action={addFaq} className="mt-3 flex flex-wrap gap-3">
          <input name="question" required placeholder="Question" className="field flex-1" />
          <input name="answer" required placeholder="Answer" className="field flex-1" />
          <button className="btn-secondary">Add</button>
        </form>
      </EditorSection>

      {/* Reviews moderation */}
      <EditorSection title="Reviews">
        {(product.reviews ?? []).length === 0 ? (
          <p className="text-sm text-ink-500">No reviews submitted yet.</p>
        ) : (
          <ul className="space-y-3">
            {(product.reviews ?? []).map((r: any) => (
              <li key={r.id} className="flex items-start justify-between gap-4 rounded-lg border border-ink-100 p-4">
                <div>
                  <div className="text-sm font-medium text-ink-900">{r.author_name} &middot; {r.rating}/5</div>
                  {r.title && <div className="text-sm text-ink-800">{r.title}</div>}
                  {r.body && <p className="mt-1 text-sm text-ink-500">{r.body}</p>}
                  <span className={`badge mt-2 ${r.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {r.is_published ? "Published" : "Pending review"}
                  </span>
                </div>
                <form action={moderateReview.bind(null, product.id, r.id, !r.is_published)}>
                  <button className="btn-secondary whitespace-nowrap py-1.5 text-xs">
                    {r.is_published ? "Unpublish" : "Publish"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </EditorSection>
    </div>
  );
}

function EditorSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h3 className="mb-4 text-base font-semibold text-ink-950">{title}</h3>
      {children}
    </section>
  );
}

function ItemList({
  items,
  render,
  onDelete,
}: {
  items: any[];
  render: (item: any) => React.ReactNode;
  onDelete: (id: string) => Promise<void>;
}) {
  if (items.length === 0) return <p className="text-sm text-ink-500">Nothing added yet.</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-4 py-2 text-sm">
          <span>{render(item)}</span>
          <form action={onDelete.bind(null, item.id)}>
            <button className="text-xs text-ink-400 hover:text-red-500">Remove</button>
          </form>
        </li>
      ))}
    </ul>
  );
}
