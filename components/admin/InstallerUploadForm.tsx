"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { recordProductFile } from "@/app/admin/products/actions";

// Uploads the installer file directly from the admin's browser to the
// private 'product-files' Supabase Storage bucket, then records the
// metadata via a small server action. Uploading straight from the browser
// (rather than through a server action/API route) avoids Next.js/Vercel
// request body size limits, so this works for large .exe installers.
export default function InstallerUploadForm({ productId }: { productId: string }) {
  const supabase = createClient();
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        setStatus("uploading");
        setErrorMsg("");
        try {
          const path = `${productId}/${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from("product-files")
            .upload(path, file, { contentType: file.type || undefined });

          if (uploadError) throw new Error(uploadError.message);

          await recordProductFile(productId, {
            fileName: file.name,
            storagePath: path,
            sizeBytes: file.size,
            version: version || undefined,
          });

          setFile(null);
          setVersion("");
          setStatus("idle");
        } catch (err: any) {
          setErrorMsg(err.message || "Upload failed.");
          setStatus("error");
        }
      }}
    >
      <div className="flex-1">
        <label className="label">Installer file (.exe, .dmg, .zip, etc.)</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="field"
          required
        />
      </div>
      <div>
        <label className="label">Version (optional)</label>
        <input
          className="field"
          placeholder="1.0.0"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
        />
      </div>
      <button type="submit" disabled={!file || status === "uploading"} className="btn-secondary">
        {status === "uploading" ? "Uploading..." : "Upload Installer"}
      </button>
      {errorMsg && <p className="w-full text-sm text-red-600">{errorMsg}</p>}
    </form>
  );
}
