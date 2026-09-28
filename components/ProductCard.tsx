"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { PRODUCT_TYPE_LABELS } from "@/lib/types";
import { discountPercent, effectivePrice, formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import StarRating from "./StarRating";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const primaryImage =
    product.images?.find((i) => i.is_primary) ?? product.images?.[0] ?? null;
  const price = effectivePrice(product.price, product.sale_price);
  const discount = discountPercent(product.price, product.sale_price);

  return (
    <div className="card group flex flex-col overflow-hidden hover:shadow-cardHover">
      <Link href={`/store/${product.slug}`} className="relative block aspect-[4/3] w-full overflow-hidden bg-ink-50">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text ?? product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-300">
            <PlaceholderIcon />
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.is_new && <span className="badge bg-accent-600/10 text-accent-600">New</span>}
          {product.is_best_seller && <span className="badge bg-amber-100 text-amber-700">Best Seller</span>}
          {discount > 0 && <span className="badge bg-ink-950 text-white">-{discount}%</span>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {product.category?.name ?? PRODUCT_TYPE_LABELS[product.product_type]}
        </span>

        <Link href={`/store/${product.slug}`}>
          <h3 className="text-base font-semibold text-ink-950 hover:text-accent-600">{product.name}</h3>
        </Link>

        <p className="line-clamp-2 text-sm leading-5 text-ink-500">{product.tagline}</p>

        <StarRating rating={product.rating_avg} count={product.rating_count} />

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-ink-950">{formatPrice(price, product.currency)}</span>
            {discount > 0 && (
              <span className="text-sm text-ink-400 line-through">
                {formatPrice(product.price, product.currency)}
              </span>
            )}
            {product.billing_type === "subscription" && (
              <span className="text-xs text-ink-400">/mo</span>
            )}
          </div>

          <button
            onClick={() =>
              addItem({
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price,
                image: primaryImage?.url ?? null,
              })
            }
            className="rounded-lg border border-ink-200 px-3 py-2 text-xs font-medium text-ink-800 transition-colors hover:border-ink-900 hover:bg-ink-900 hover:text-white"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 16l5-5 4 4 4-5 5 6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="1.5" />
    </svg>
  );
}
