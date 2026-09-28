"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Refreshes this page every few seconds while a card payment is still
// pending confirmation, so the customer sees it flip to paid the moment
// the Stripe webhook lands, without needing to reload manually. Stops
// re-rendering once the server component no longer renders it (status is
// no longer pending), so there is no risk of polling forever.
export default function OrderStatusPoller() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
