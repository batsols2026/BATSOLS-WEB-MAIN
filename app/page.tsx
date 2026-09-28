import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import StarRating from "@/components/StarRating";
import { getCategories, getFeaturedProducts, getTopTestimonials } from "@/lib/queries";

// Public marketing page backed by data that only ever changes when an
// admin edits it - a full re-render on every single visitor request (the
// previous `force-dynamic`) was serving zero cached responses and was the
// single biggest cause of "loading feels slow." Revalidating on a timer
// instead lets Next.js and any CDN in front of it cache the response, while
// admin edits (which call revalidatePath) still bust the cache immediately.
export const revalidate = 60;

const VALUE_PROPS = [
  {
    title: "Built to solve a real problem",
    description:
      "Every BATsols product starts with a specific, practical problem, not a feature list looking for a use case.",
  },
  {
    title: "Clear about what you get",
    description:
      "Pricing, requirements, and what's included are stated plainly before you buy. No surprises after checkout.",
  },
  {
    title: "Instant, secure delivery",
    description:
      "Purchases unlock immediately in your account, with downloads, license keys, and updates in one place.",
  },
  {
    title: "A growing product ecosystem",
    description:
      "BATsols isn't one app. It's an expanding line of tools designed to work well on their own and better together.",
  },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Find the right product", description: "Browse by category or search for the problem you're trying to solve." },
  { step: "02", title: "See exactly what it does", description: "Every product page lays out the problem, the solution, and what's included." },
  { step: "03", title: "Buy with a clear price", description: "One-time or subscription pricing, shown up front. No hidden fees." },
  { step: "04", title: "Get instant access", description: "Downloads, license keys, and updates land straight in your account." },
];

export default async function HomePage() {
  // Defensive fallbacks: this page is prerendered (revalidate = 60), so a
  // transient Supabase blip during a build would otherwise fail the whole
  // deploy rather than just showing an empty section for a minute until the
  // next revalidation - the same reasoning already applied to testimonials.
  const [featured, categories, testimonials] = await Promise.all([
    getFeaturedProducts(4).catch(() => []),
    getCategories().catch(() => []),
    getTopTestimonials(6).catch(() => []),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-ink-100 bg-gradient-to-b from-ink-50/60 to-white">
        <div className="container-content flex flex-col items-start gap-6 py-20 sm:py-28">
          <span className="section-eyebrow">Digital products, done properly</span>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-ink-950 sm:text-5xl">
            We build digital products that make real work easier.
          </h1>
          <p className="max-w-xl text-lg leading-7 text-ink-500">
            BATsols is a digital products company building software, tools,
            templates, and systems to solve specific problems for
            individuals, creators, and businesses. Not files. Solutions.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/store" className="btn-primary">
              Browse the Store
            </Link>
            <Link href="/about" className="btn-secondary">
              Why BATsols
            </Link>
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="py-20">
          <div className="container-content">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="section-eyebrow">Featured</span>
                <h2 className="mt-2 text-2xl font-semibold text-ink-950 sm:text-3xl">
                  Products worth your attention
                </h2>
              </div>
              <Link href="/store" className="text-sm font-medium text-accent-600 hover:text-accent-500">
                View all products &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="border-y border-ink-100 bg-ink-50/40 py-20">
          <div className="container-content">
            <div className="mb-10">
              <span className="section-eyebrow">Categories</span>
              <h2 className="mt-2 text-2xl font-semibold text-ink-950 sm:text-3xl">
                Find the right kind of solution
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/store?category=${cat.slug}`}
                  className="card flex flex-col gap-1 p-5 hover:shadow-cardHover"
                >
                  <span className="text-sm font-semibold text-ink-950">{cat.name}</span>
                  {cat.description && (
                    <span className="line-clamp-2 text-xs leading-5 text-ink-500">{cat.description}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Value proposition */}
      <section className="py-20">
        <div className="container-content">
          <div className="mb-10 max-w-2xl">
            <span className="section-eyebrow">Why BATsols</span>
            <h2 className="mt-2 text-2xl font-semibold text-ink-950 sm:text-3xl">
              We treat digital products like products, not downloads.
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2">
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent-600" />
                <div>
                  <h3 className="text-base font-semibold text-ink-950">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-ink-500">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-ink-100 bg-ink-950 py-20 text-white">
        <div className="container-content">
          <div className="mb-12 max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-accent-400">How it works</span>
            <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">From discovery to access, in four steps</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step}>
                <span className="text-sm font-semibold text-accent-400">{item.step}</span>
                <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials: only render once real reviews exist */}
      {testimonials.length > 0 && (
        <section className="py-20">
          <div className="container-content">
            <div className="mb-10">
              <span className="section-eyebrow">Customers</span>
              <h2 className="mt-2 text-2xl font-semibold text-ink-950 sm:text-3xl">What people are saying</h2>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <div key={t.id} className="card flex flex-col gap-3 p-6">
                  <StarRating rating={t.rating} />
                  {t.title && <h3 className="text-sm font-semibold text-ink-950">{t.title}</h3>}
                  {t.body && <p className="text-sm leading-6 text-ink-600">&ldquo;{t.body}&rdquo;</p>}
                  <span className="mt-auto text-xs text-ink-400">
                    {t.author_name} &middot; {t.product_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20">
        <div className="container-content">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-ink-50 px-8 py-16 text-center">
            <h2 className="max-w-lg text-2xl font-semibold text-ink-950 sm:text-3xl">
              Find the product that solves your problem.
            </h2>
            <p className="max-w-md text-sm leading-6 text-ink-500">
              Every product in the BATsols store is built to do one job well.
            </p>
            <Link href="/store" className="btn-primary mt-2">
              Browse the Store
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
