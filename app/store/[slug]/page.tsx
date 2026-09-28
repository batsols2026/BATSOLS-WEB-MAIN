import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { discountPercent, effectivePrice, formatDate, formatPrice } from "@/lib/format";
import StarRating from "@/components/StarRating";
import ProductActions from "@/components/ProductActions";
import ProductCard from "@/components/ProductCard";
import ReviewForm from "@/components/ReviewForm";

// See app/page.tsx for why this is a timed revalidate instead of
// force-dynamic: product pages are public and change only when an admin
// edits them (which busts this via revalidatePath), so there is no reason
// to skip caching on every visitor request.
export const revalidate = 60;

interface ProductPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return {};
  return {
    title: product.seo_title || product.name,
    description: product.seo_description || product.short_description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 3);
  const price = effectivePrice(product.price, product.sale_price);
  const discount = discountPercent(product.price, product.sale_price);
  const primaryImage = product.images?.find((i) => i.is_primary) ?? product.images?.[0] ?? null;
  const galleryImages = product.images?.length ? product.images : [];

  return (
    <div className="container-content py-12">
      {/* Breadcrumb */}
      <div className="mb-8 flex flex-wrap items-center gap-1.5 text-sm text-ink-400">
        <Link href="/store" className="hover:text-ink-700">Store</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/store?category=${product.category.slug}`} className="hover:text-ink-700">
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink-700">{product.name}</span>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div>
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-ink-50">
            {primaryImage ? (
              <Image src={primaryImage.url} alt={primaryImage.alt_text ?? product.name} fill className="object-contain" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-ink-300">No preview available</div>
            )}
          </div>
          {galleryImages.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {galleryImages.slice(0, 4).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-ink-50">
                  <Image src={img.url} alt={img.alt_text ?? product.name} fill className="object-contain" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-wide text-accent-600">
            {product.category?.name ?? PRODUCT_TYPE_LABELS[product.product_type]}
          </span>
          <h1 className="mt-2 text-3xl font-semibold text-ink-950">{product.name}</h1>
          <p className="mt-3 text-base leading-7 text-ink-500">{product.tagline}</p>

          <div className="mt-4">
            <StarRating rating={product.rating_avg} count={product.rating_count} size={16} />
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-ink-950">{formatPrice(price, product.currency)}</span>
            {discount > 0 && (
              <span className="text-lg text-ink-400 line-through">{formatPrice(product.price, product.currency)}</span>
            )}
            {product.billing_type === "subscription" && <span className="text-sm text-ink-400">/ month</span>}
            {discount > 0 && <span className="badge bg-ink-950 text-white">Save {discount}%</span>}
          </div>

          <div className="mt-6">
            <ProductActions
              productId={product.id}
              slug={product.slug}
              name={product.name}
              price={price}
              image={primaryImage?.url ?? null}
              billingType={product.billing_type}
              trialDays={product.trial_days}
            />
          </div>

          {product.inclusions && product.inclusions.length > 0 && (
            <div className="mt-8 rounded-xl border border-ink-100 p-5">
              <h3 className="text-sm font-semibold text-ink-900">What's included</h3>
              <ul className="mt-3 space-y-2">
                {product.inclusions.map((inc) => (
                  <li key={inc.id} className="flex items-start gap-2 text-sm text-ink-600">
                    <CheckIcon /> {inc.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.requirements && (
            <p className="mt-4 text-xs leading-5 text-ink-400">
              <span className="font-medium text-ink-500">Requirements: </span>
              {product.requirements}
            </p>
          )}
        </div>
      </div>

      {/* Problem it solves */}
      {product.problem_statement && (
        <Section eyebrow="The Problem" title="Why this product exists">
          <p className="max-w-3xl text-base leading-7 text-ink-600">{product.problem_statement}</p>
        </Section>
      )}

      {/* Description */}
      <Section eyebrow="Overview" title="What it does">
        <p className="max-w-3xl whitespace-pre-line text-base leading-7 text-ink-600">{product.description}</p>
      </Section>

      {/* Benefits */}
      {product.benefits && product.benefits.length > 0 && (
        <Section eyebrow="Benefits" title="What you get out of it">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {product.benefits.map((b) => (
              <div key={b.id} className="card p-6">
                <h3 className="text-base font-semibold text-ink-950">{b.title}</h3>
                {b.description && <p className="mt-2 text-sm leading-6 text-ink-500">{b.description}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <Section eyebrow="Features" title="What's inside">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {product.features.map((f) => (
              <div key={f.id} className="flex gap-4">
                <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent-600" />
                <div>
                  <h3 className="text-base font-semibold text-ink-950">{f.title}</h3>
                  {f.description && <p className="mt-1.5 text-sm leading-6 text-ink-500">{f.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* How it works */}
      {product.how_it_works && (
        <Section eyebrow="How It Works" title="Getting started is simple">
          <p className="max-w-3xl whitespace-pre-line text-base leading-7 text-ink-600">{product.how_it_works}</p>
        </Section>
      )}

      {/* Who it's for */}
      {product.who_its_for && (
        <Section eyebrow="Who It's For" title="Built for people like you">
          <p className="max-w-3xl whitespace-pre-line text-base leading-7 text-ink-600">{product.who_its_for}</p>
        </Section>
      )}

      {/* FAQs */}
      {product.faqs && product.faqs.length > 0 && (
        <Section eyebrow="FAQ" title="Common questions">
          <div className="max-w-3xl divide-y divide-ink-100">
            {product.faqs.map((faq) => (
              <details key={faq.id} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-ink-900">
                  {faq.question}
                  <span className="ml-4 text-ink-400 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-6 text-ink-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* Reviews */}
      <Section eyebrow="Reviews" title="From people who've used it">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-6">
                {product.reviews.map((r) => (
                  <div key={r.id} className="border-b border-ink-100 pb-6">
                    <StarRating rating={r.rating} />
                    {r.title && <h4 className="mt-2 text-sm font-semibold text-ink-950">{r.title}</h4>}
                    {r.body && <p className="mt-1.5 text-sm leading-6 text-ink-600">{r.body}</p>}
                    <span className="mt-2 block text-xs text-ink-400">
                      {r.author_name}
                      {r.is_verified_purchase && " · Verified purchase"} · {formatDate(r.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">No reviews yet. Be the first to share your experience.</p>
            )}
          </div>
          <div className="rounded-xl border border-ink-100 p-6">
            <h3 className="mb-4 text-sm font-semibold text-ink-900">Leave a review</h3>
            <ReviewForm productId={product.id} />
          </div>
        </div>
      </Section>

      {/* Related products */}
      {related.length > 0 && (
        <Section eyebrow="You might also like" title="More from BATsols">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-100 py-14">
      <span className="section-eyebrow">{eyebrow}</span>
      <h2 className="mb-6 mt-2 text-2xl font-semibold text-ink-950">{title}</h2>
      {children}
    </section>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="mt-0.5 flex-shrink-0 text-accent-600">
      <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
