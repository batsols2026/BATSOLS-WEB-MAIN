import { redirect } from "next/navigation";

// Kept only for any old bookmarked/emailed links from before bank-transfer
// instructions moved to the authenticated, RLS-protected
// /account/orders/[orderId] page. That page is the real source of truth
// for order status now; this one just forwards people to their order list.
export default function CheckoutPendingPage() {
  redirect("/account/orders");
}
