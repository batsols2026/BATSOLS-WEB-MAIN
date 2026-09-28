"use client";

import { useState } from "react";
import Image from "next/image";
import type { BlogPost } from "@/lib/types";
import { savePost } from "@/app/admin/posts/actions";

export default function PostForm({ post }: { post?: BlogPost }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(post?.featured_image_url || null);

  return (
    <form
      action={async (formData) => {
        setIsSubmitting(true);
        setErrorMsg("");
        try {
          await savePost(post?.id ?? null, formData);
        } catch (e: any) {
          setErrorMsg(e.message);
          setIsSubmitting(false);
        }
      }}
      className="flex flex-col gap-6"
    >
      {errorMsg && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{errorMsg}</div>}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            required
            defaultValue={post?.title}
            className="field"
            placeholder="Post Title"
          />
        </div>

        <div>
          <label className="label" htmlFor="slug">Slug</label>
          <input
            id="slug"
            name="slug"
            required
            defaultValue={post?.slug}
            pattern="^[a-z0-9-]+$"
            className="field font-mono"
            placeholder="my-awesome-post"
          />
        </div>

        <div>
          <label className="label" htmlFor="post_type">Type</label>
          <select id="post_type" name="post_type" defaultValue={post?.post_type ?? "article"} className="field">
            <option value="article">Article</option>
            <option value="case_study">Case Study</option>
            <option value="user_guide">User Guide</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={post?.status ?? "draft"} className="field">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="excerpt">Excerpt</label>
        <textarea
          id="excerpt"
          name="excerpt"
          defaultValue={post?.excerpt ?? ""}
          className="field min-h-[80px]"
          placeholder="Brief summary for list views..."
        />
      </div>

      <div>
        <label className="label" htmlFor="content">Content (Markdown supported)</label>
        <textarea
          id="content"
          name="content"
          required
          defaultValue={post?.content ?? ""}
          className="field min-h-[300px] font-mono text-sm"
          placeholder="# Heading&#10;&#10;Write your content here..."
        />
      </div>

      <div>
        <label className="label">Featured Image</label>
        <div className="mt-2 flex items-start gap-4">
          {imagePreview && (
            <div className="relative h-32 w-48 overflow-hidden rounded-lg bg-ink-100">
              <Image src={imagePreview} alt="Preview" fill className="object-cover" />
            </div>
          )}
          <div className="flex-1">
            <input
              type="file"
              name="image"
              accept="image/*"
              className="text-sm text-ink-500 file:mr-4 file:rounded-full file:border-0 file:bg-accent-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-accent-700 hover:file:bg-accent-100"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const url = URL.createObjectURL(file);
                  setImagePreview(url);
                }
              }}
            />
            {post?.featured_image_url && (
              <input type="hidden" name="current_image" value={post.featured_image_url} />
            )}
            <p className="mt-2 text-xs text-ink-400">Recommended size: 1200x630px. Max 2MB.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-ink-100">
        <a href="/admin/posts" className="btn-secondary">Cancel</a>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? "Saving..." : "Save Post"}
        </button>
      </div>
    </form>
  );
}
