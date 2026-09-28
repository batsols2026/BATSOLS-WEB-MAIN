import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";
import { deletePost } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const supabase = createClient();
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-ink-950">Blog Posts</h2>
        <Link href="/admin/posts/new" className="btn-primary">
          Write Post
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-ink-100 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {posts?.map((post: BlogPost) => (
              <tr key={post.id} className="group hover:bg-ink-50/50">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900">{post.title}</div>
                  <div className="text-xs text-ink-400">/{post.slug}</div>
                </td>
                <td className="px-4 py-3 capitalize text-ink-600">
                  {post.post_type.replace("_", " ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      post.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {formatDate(post.created_at)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-accent-600 hover:text-accent-700"
                    >
                      Edit
                    </Link>
                    <form action={deletePost.bind(null, post.id)}>
                      <button
                        type="submit"
                        className="text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          if (!confirm("Delete this post? This cannot be undone.")) {
                            e.preventDefault();
                          }
                        }}
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {!posts?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No posts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
