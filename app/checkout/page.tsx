"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import type { BankAccount } from "@/lib/types";

const CARD_ENABLED = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank_transfer">(
    CARD_ENABLED ? "card" : "bank_transfer"
  );
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setEmail(data.user.email);
      setCheckingAuth(false);
    });
  }, [supabase]);

  useEffect(() => {
    supabase
      .from("bank_accounts")
      .select("id, label, bank_name, account_title, account_number, iban, branch, instructions, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const accounts = data ?? [];
        setBankAccounts(accounts);
        if (accounts.length > 0) setBankAccountId(accounts[0].id);
      });
  }, [supabase]);

  if (checkingAuth) return null;

  if (items.length === 0) {
    return (
      <div className="container-content flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink-950">Your cart is empty</h1>
        <Link href="/store" className="btn-primary">Browse Products</Link>
      </div>
    );
  }

  const bankTransferAvailable = bankAccounts.length > 0;

  return (
    <div className="container-content py-12">
      <h1 className="text-3xl font-semibold text-ink-950">Checkout</h1>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        <form
          className="flex flex-col gap-5 lg:col-span-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);

            // Auth is no longer required here - guest checkout is supported.
            // If they are not logged in, the API will create an account using their email.

            setLoading(true);
            try {
              const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
                  billingEmail: email,
                  phone: phone || undefined,
                  couponCode: couponCode || undefined,
                  paymentMethod,
                  bankAccountId: paymentMethod === "bank_transfer" ? bankAccountId || undefined : undefined,
                }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || "Checkout failed.");

              clearCart();
              if (data.redirectUrl) {
                // For Stripe, we can't show our success page easily without breaking the flow,
                // but Stripe will send them to the account URL which will ask them to log in.
                // We'll just let Stripe handle the redirect, they'll check their email.
                window.location.href = data.redirectUrl;
              } else if (data.isNewUser) {
                router.push(`/checkout/success?email=${encodeURIComponent(email)}`);
              } else {
                router.push(`/account/orders/${data.orderId}`);
              }
            } catch (err: any) {
              setError(err.message || "Something went wrong.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-950">Contact</h2>
            <p className="mt-1 text-sm text-ink-500">Your license keys and downloads go here.</p>
            <div className="mt-4">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="phone">Phone number (optional)</label>
              <input
                id="phone"
                type="tel"
                className="field"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-950">Payment method</h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <label
                className={`flex-1 cursor-pointer rounded-lg border px-4 py-3 text-sm ${
                  paymentMethod === "card" ? "border-ink-950 bg-ink-50" : "border-ink-200"
                } ${!CARD_ENABLED ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  className="mr-2"
                  disabled={!CARD_ENABLED}
                  checked={paymentMethod === "card"}
                  onChange={() => setPaymentMethod("card")}
                />
                Card
                {!CARD_ENABLED && <span className="block text-xs text-ink-400">Not available yet</span>}
              </label>
              <label
                className={`flex-1 rounded-lg border px-4 py-3 text-sm ${
                  paymentMethod === "bank_transfer" ? "border-ink-950 bg-ink-50" : "border-ink-200"
                } ${bankTransferAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  className="mr-2"
                  disabled={!bankTransferAvailable}
                  checked={paymentMethod === "bank_transfer"}
                  onChange={() => setPaymentMethod("bank_transfer")}
                />
                Bank / Online Transfer
                {!bankTransferAvailable && <span className="block text-xs text-ink-400">Not available yet</span>}
              </label>
            </div>

            {paymentMethod === "bank_transfer" && bankAccounts.length > 1 && (
              <div className="mt-4">
                <label className="label" htmlFor="bankAccount">Pay into</label>
                <select
                  id="bankAccount"
                  className="field"
                  value={bankAccountId}
                  onChange={(e) => setBankAccountId(e.target.value)}
                >
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.label} &middot; {acc.bank_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {paymentMethod === "bank_transfer" && (
              <p className="mt-4 text-xs text-ink-400">
                Next step shows the account details and lets you upload a
                payment screenshot, or send it to us on WhatsApp. Your order
                unlocks as soon as we confirm the transfer.
              </p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold text-ink-950">Discount code</h2>
            <div className="mt-4 flex gap-3">
              <input
                className="field"
                placeholder="Enter a code (optional)"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? "Processing..."
              : paymentMethod === "card"
                ? `Pay ${formatPrice(subtotal)}`
                : "Continue to Bank Transfer Instructions"}
          </button>
          <p className="text-center text-xs text-ink-400">
            By completing this purchase you agree to receive your product via
            email and your BATsols account.
          </p>
        </form>

        <div className="h-fit rounded-2xl border border-ink-100 p-6">
          <h2 className="text-base font-semibold text-ink-950">Order Summary</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.productId} className="flex justify-between text-sm">
                <span className="text-ink-600">{item.name} &times; {item.quantity}</span>
                <span className="font-medium text-ink-900">{formatPrice(item.price * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-ink-100 pt-4 text-sm font-semibold text-ink-950">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
