import Link from "next/link";
import type { Metadata } from "next";
import ProductCard from "@/components/ProductCard";
import { getCategories, getStoreProducts, type StoreFilters } from "@/lib/queries";

// No explicit `dynamic`/`revalidate` here: this page reads searchParams
// (q, category, sort, type), which Next.js already renders dynamically per
// request - forcing it again was redundant, not extra-safe.

export const metadata: Metadata = {
  title: "Store",
  description: "Browse BATsols digital products, including software, tools, templates, and systems.",
};

const SORT_OPTIONS: { value: NonNullable<StoreFilters["sort"]>; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "featured", label: "Featured" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
];

interface StorePageProps {
  searchParams: { q?: string; category?: string; sort?: string; type?: string };
}

export default async function StorePage({ searchParams }: StorePageProps) {
  const filters: StoreFilters = {
    q: searchParams.q,
    category: searchParams.category,
    sort: (searchParams.sort as StoreFilters["sort"]) ?? "newest",
    type: searchParams.type,
  };

  const [products, categories] = await Promise.all([
    getStoreProducts(filters),
    getCategories(),
  ]);

  return (
    <div className="container-content py-12">
      <div className="mb-8">
        <span className="section-eyebrow">Store</span>
        <h1 className="mt-2 text-3xl font-semibold text-ink-950">All Products</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
          Every product BATsols has built, in one place. Filter by category or
          search for the problem you're trying to solve.
        </p>
      </div>

      <form className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" method="get">
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Search products..."
          className="field sm:max-w-xs"
        />
        <div className="flex items-center gap-3">
          {filters.category && <input type="hidden" name="category" value={filters.category} />}
          <select name="sort" defaultValue={filters.sort} className="field sm:max-w-[200px]">
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary whitespace-nowrap">
            Apply
          </button>
        </div>
      </form>

      <div className="mb-10 flex flex-wrap gap-2">
        <Link
          href="/store"
          className={`badge ${!filters.category ? "bg-ink-950 text-white" : "hover:bg-ink-100"}`}
        >
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/store?category=${cat.slug}`}
            className={`badge ${filters.category === cat.slug ? "bg-ink-950 text-white" : "hover:bg-ink-100"}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-24 text-center">
          <h2 className="text-lg font-semibold text-ink-900">No products match yet</h2>
          <p className="max-w-sm text-sm text-ink-500">
            {filters.q || filters.category
              ? "Try clearing your search or browsing a different category."
              : "New BATsols products are added regularly. Check back soon."}
          </p>
          <Link href="/store" className="btn-secondary mt-2">
            Clear filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
