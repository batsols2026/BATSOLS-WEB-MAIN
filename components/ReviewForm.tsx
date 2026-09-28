"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ReviewForm({ productId }: { productId: string }) {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthorName(
        (data.user?.user_metadata?.full_name as string) || data.user?.email?.split("@")[0] || ""
      );
    });
  }, [supabase]);

  if (!userId) {
    return (
      <p className="text-sm text-ink-500">
        <a href="/login" className="font-medium text-accent-600 hover:text-accent-500">
          Sign in
        </a>{" "}
        to leave a review for this product.
      </p>
    );
  }

  if (status === "done") {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Thanks! Your review is submitted and will appear once it's approved.
      </p>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("submitting");
        const { error } = await supabase.from("reviews").insert({
          product_id: productId,
          customer_id: userId,
          author_name: authorName || "Anonymous",
          rating,
          title: title || null,
          body: body || null,
        });
        setStatus(error ? "error" : "done");
      }}
    >
      <div>
        <label className="label">Your rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setRating(n)}
              className={`h-9 w-9 rounded-lg border text-sm font-medium ${
                n <= rating ? "border-ink-950 bg-ink-950 text-white" : "border-ink-200 text-ink-500"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Title (optional)</label>
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      </div>
      <div>
        <label className="label">Your review</label>
        <textarea
          className="field min-h-[100px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          required
        />
      </div>
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Please try again.</p>
      )}
      <button type="submit" disabled={status === "submitting"} className="btn-primary self-start">
        {status === "submitting" ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
