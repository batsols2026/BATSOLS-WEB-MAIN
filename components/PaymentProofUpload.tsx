"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PaymentProofUpload({
  orderId,
  alreadySubmitted,
}: {
  orderId: string;
  alreadySubmitted: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    alreadySubmitted ? "done" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  if (status === "done") {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        Proof received. We will confirm your payment shortly.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          setStatus("uploading");
          setErrorMsg("");
          try {
            const body = new FormData();
            body.append("file", file);
            const res = await fetch(`/api/orders/${orderId}/upload-proof`, {
              method: "POST",
              body,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed.");
            setStatus("done");
            router.refresh();
          } catch (err: any) {
            setErrorMsg(err.message || "Upload failed.");
            setStatus("error");
          }
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field"
        />
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        <button type="submit" disabled={!file || status === "uploading"} className="btn-primary self-start">
          {status === "uploading" ? "Uploading..." : "Upload Proof"}
        </button>
      </form>

      <button
        type="button"
        className="self-start text-xs font-medium text-ink-500 underline decoration-dotted hover:text-ink-800"
        onClick={async () => {
          setStatus("uploading");
          setErrorMsg("");
          try {
            const res = await fetch(`/api/orders/${orderId}/upload-proof`, { method: "PATCH" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Could not save this.");
            setStatus("done");
            router.refresh();
          } catch (err: any) {
            setErrorMsg(err.message || "Something went wrong.");
            setStatus("error");
          }
        }}
      >
        I already sent it on WhatsApp instead
      </button>
    </div>
  );
}
