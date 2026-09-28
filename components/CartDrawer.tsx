"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

export default function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, removeItem, setQuantity } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close cart"
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]"
        onClick={closeCart}
      />

      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-fadeUp">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-5">
          <h2 className="text-base font-semibold text-ink-950">Your Cart</h2>
          <button onClick={closeCart} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-50" aria-label="Close">
            &times;
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-ink-500">Your cart is empty.</p>
            <Link href="/store" onClick={closeCart} className="btn-secondary">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <ul className="divide-y divide-ink-100">
                {items.map((item) => (
                  <li key={item.productId} className="flex gap-4 py-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-ink-50">
                      {item.image && (
                        <Image src={item.image} alt={item.name} fill className="object-contain" />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/store/${item.slug}`}
                          onClick={closeCart}
                          className="text-sm font-medium text-ink-900 hover:text-accent-600"
                        >
                          {item.name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="text-xs text-ink-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-ink-200">
                          <button
                            className="px-2.5 py-1 text-sm text-ink-600 hover:text-ink-950"
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            -
                          </button>
                          <span className="min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
                          <button
                            className="px-2.5 py-1 text-sm text-ink-600 hover:text-ink-950"
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-ink-950">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ink-100 px-6 py-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-ink-500">Subtotal</span>
                <span className="text-base font-semibold text-ink-950">{formatPrice(subtotal)}</span>
              </div>
              <Link href="/checkout" onClick={closeCart} className="btn-primary w-full">
                Checkout
              </Link>
              <p className="mt-2 text-center text-xs text-ink-400">
                Instant digital delivery after purchase.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
