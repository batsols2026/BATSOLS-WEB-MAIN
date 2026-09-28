"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";

export default function ProductActions({
  productId,
  slug,
  name,
  price,
  image,
  billingType,
  trialDays,
}: {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  billingType: "one_time" | "subscription";
  trialDays?: number;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [startingTrial, setStartingTrial] = useState(false);

  const item = { productId, slug, name, price, image };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          onClick={() => {
            addItem(item);
            router.push("/checkout");
          }}
          className="btn-primary flex-1"
        >
          {billingType === "subscription" ? "Subscribe Now" : "Buy Now"}
        </button>
        <button onClick={() => addItem(item)} className="btn-secondary flex-1">
          Add to Cart
        </button>
      </div>
      {(trialDays ?? 0) > 0 && (
        <button
          disabled={startingTrial}
          onClick={async () => {
            setStartingTrial(true);
            try {
              const res = await fetch("/api/trials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
              });
              const data = await res.json();
              if (!res.ok) {
                if (res.status === 401) {
                  router.push(`/login?next=/store/${slug}`);
                } else {
                  alert(data.error || "Could not start trial.");
                }
              } else {
                router.push("/account/downloads");
              }
            } catch {
              alert("Something went wrong.");
            } finally {
              setStartingTrial(false);
            }
          }}
          className="btn-secondary w-full"
        >
          {startingTrial ? "Starting trial..." : `Start ${trialDays}-Day Free Trial`}
        </button>
      )}
    </div>
  );
}
