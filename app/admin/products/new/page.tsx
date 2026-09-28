import { createClient } from "@/lib/supabase/server";
import ProductForm from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const supabase = createClient();
  const { data: categories } = await supabase.from("categories").select("id, name, slug, description, sort_order").order("sort_order");

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-ink-950">New Product</h2>
      <ProductForm categories={categories ?? []} action={createProduct} />
    </div>
  );
}
