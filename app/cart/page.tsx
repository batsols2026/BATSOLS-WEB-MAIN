"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, removeItem, setQuantity } = useCart();

  return (
    <div className="container-content py-12">
      <h1 className="text-3xl font-semibold text-ink-950">Your Cart</h1>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-ink-200 py-24 text-center">
          <p className="text-sm text-ink-500">Your cart is empty.</p>
          <Link href="/store" className="btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ul className="divide-y divide-ink-100 rounded-2xl border border-ink-100">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-4 p-5">
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-ink-50">
                    {item.image && <Image src={item.image} alt={item.name} fill className="object-contain" />}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/store/${item.slug}`} className="font-medium text-ink-900 hover:text-accent-600">
                        {item.name}
                      </Link>
                      <button onClick={() => removeItem(item.productId)} className="text-xs text-ink-400 hover:text-red-500">
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-lg border border-ink-200">
                        <button className="px-3 py-1.5 text-sm text-ink-600 hover:text-ink-950" onClick={() => setQuantity(item.productId, item.quantity - 1)}>-</button>
                        <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                        <button className="px-3 py-1.5 text-sm text-ink-600 hover:text-ink-950" onClick={() => setQuantity(item.productId, item.quantity + 1)}>+</button>
                      </div>
                      <span className="font-semibold text-ink-950">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="h-fit rounded-2xl border border-ink-100 p-6">
            <h2 className="text-base font-semibold text-ink-950">Order Summary</h2>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-ink-500">Subtotal</span>
              <span className="font-medium text-ink-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-1 text-xs text-ink-400">Taxes and coupons are applied at checkout.</p>
            <Link href="/checkout" className="btn-primary mt-6 w-full">Proceed to Checkout</Link>
            <Link href="/store" className="mt-3 block text-center text-sm text-ink-500 hover:text-ink-900">
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
