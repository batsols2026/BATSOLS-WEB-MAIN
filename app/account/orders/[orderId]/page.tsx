import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/format";
import { getSiteSettings, whatsappLinkFor } from "@/lib/queries";
import PaymentProofUpload from "@/components/PaymentProofUpload";
import OrderStatusPoller from "@/components/OrderStatusPoller";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: { params: { orderId: string } }) {
  const supabase = createClient();

  // Row Level Security (the "orders_owner_read" policy) guarantees this
  // query only ever returns a row when the signed-in customer actually
  // owns it, or the caller is an admin. There is no separate ownership
  // check to get wrong here: a made-up ID, someone else's order ID, or a
  // signed-out visitor all just render as not found.
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, total, currency, created_at, order_items(id, product_name, unit_price, quantity)"
    )
    .eq("id", params.orderId)
    .maybeSingle();

  if (!order) notFound();

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, method, status, submitted_at, bank_account_id, bank_accounts(label, bank_name, account_title, account_number, iban, branch, instructions)"
    )
    .eq("order_id", order.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settings = await getSiteSettings();
  const whatsappLink = whatsappLinkFor(settings.whatsapp_number);
  const bankAccount = (payment as any)?.bank_accounts ?? null;

  const awaitingBankProof =
    payment?.method === "bank_transfer" && (payment.status === "pending" || payment.status === "submitted");

  return (
    <div className="container-content py-16">
      <div className="mx-auto max-w-2xl">
        <StatusBanner
          orderStatus={order.status}
          paymentMethod={payment?.method ?? null}
          paymentStatus={payment?.status ?? null}
        />

        <div className="mt-8 rounded-2xl border border-ink-100 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink-900">Order {order.order_number}</span>
            <span className="text-xs text-ink-400">{formatDate(order.created_at)}</span>
          </div>
          <ul className="mt-4 divide-y divide-ink-100">
            {order.order_items.map((item: any) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">{item.product_name} &times; {item.quantity}</span>
                <span className="text-ink-500">{formatPrice(item.unit_price * item.quantity, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex justify-end border-t border-ink-100 pt-3 text-sm font-semibold text-ink-950">
            Total: {formatPrice(order.total, order.currency)}
          </div>
        </div>

        {awaitingBankProof && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="rounded-2xl border border-ink-100 p-6">
              <h2 className="text-sm font-semibold text-ink-900">Transfer to</h2>
              {bankAccount ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Bank</dt>
                    <dd className="font-medium text-ink-900">{bankAccount.bank_name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Account title</dt>
                    <dd className="font-medium text-ink-900">{bankAccount.account_title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Account number</dt>
                    <dd className="font-medium text-ink-900">{bankAccount.account_number}</dd>
                  </div>
                  {bankAccount.iban && (
                    <div className="flex justify-between">
                      <dt className="text-ink-500">IBAN</dt>
                      <dd className="font-medium text-ink-900">{bankAccount.iban}</dd>
                    </div>
                  )}
                  {bankAccount.branch && (
                    <div className="flex justify-between">
                      <dt className="text-ink-500">Branch</dt>
                      <dd className="font-medium text-ink-900">{bankAccount.branch}</dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="mt-3 text-sm text-ink-500">
                  We'll confirm the account to transfer to with you directly.
                </p>
              )}
              <p className="mt-3 text-xs text-ink-400">
                Please include your order number ({order.order_number}) as the transfer reference.
                {settings.bank_transfer_note && ` ${settings.bank_transfer_note}`}
              </p>
            </div>

            <div className="rounded-2xl border border-ink-100 p-6">
              <h2 className="text-sm font-semibold text-ink-900">Send proof of payment</h2>
              <p className="mt-1 text-sm text-ink-500">Upload a screenshot or PDF receipt, or send it on WhatsApp.</p>
              <div className="mt-4">
                <PaymentProofUpload orderId={order.id} alreadySubmitted={payment.status === "submitted"} />
              </div>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary mt-4 inline-flex"
                >
                  Send Proof on WhatsApp Instead
                </a>
              )}
            </div>
          </div>
        )}

        {order.status === "pending" && payment?.method === "card" && <OrderStatusPoller />}

        <div className="mt-8 flex flex-wrap gap-3">
          {order.status === "paid" ? (
            <Link href="/account/downloads" className="btn-primary">Go to Downloads</Link>
          ) : (
            <Link href="/account/orders" className="btn-secondary">View My Orders</Link>
          )}
          <Link href={`/contact?subject=Regarding+Order+${order.order_number}`} className="btn-secondary">Contact Support</Link>
          <Link href="/store" className="btn-secondary">Keep Browsing</Link>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({
  orderStatus,
  paymentMethod,
  paymentStatus,
}: {
  orderStatus: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
}) {
  if (orderStatus === "paid") {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
            <path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">Order confirmed</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            Your product is ready. Downloads and license keys are available in your account now.
          </p>
        </div>
      </div>
    );
  }

  if (orderStatus === "awaiting_verification" || (paymentMethod === "bank_transfer" && paymentStatus === "submitted")) {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">Verifying your payment</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            We've received your proof and will confirm it shortly - usually within a day.
          </p>
        </div>
      </div>
    );
  }

  if (paymentMethod === "bank_transfer") {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">Order placed, awaiting payment</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            Complete your transfer using the details below, then send proof so we can confirm it. Your license unlocks as soon as the payment is confirmed.
          </p>
        </div>
      </div>
    );
  }

  if (orderStatus === "pending") {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <svg width="26" height="26" viewBox="0 0 20 20" fill="none">
            <path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-ink-950">Confirming your payment</h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
            This page will update automatically once your card payment is confirmed, usually within a few seconds.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-ink-950">Order {orderStatus}</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">
        If you think this is a mistake, contact us and we will help sort it out.
      </p>
    </div>
  );
}
