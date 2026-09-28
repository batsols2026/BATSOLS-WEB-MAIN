import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import type { BlogPost } from "@/lib/types";

export const revalidate = 60; // cached for 1 minute

export const metadata: Metadata = {
  title: "Blog & Guides",
  description: "Articles, case studies, and user guides from the BATsols team.",
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const supabase = createClient();
  
  let query = supabase
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (searchParams.type) {
    query = query.eq("post_type", searchParams.type);
  }

  const { data: posts } = await query;

  return (
    <div className="container-content py-16">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-semibold text-ink-950 sm:text-5xl">Blog & Guides</h1>
        <p className="mt-4 text-lg text-ink-500">
          Articles, case studies, and user guides from the BATsols team.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/blog"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !searchParams.type ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
          }`}
        >
          All
        </Link>
        <Link
          href="/blog?type=article"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            searchParams.type === "article" ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
          }`}
        >
          Articles
        </Link>
        <Link
          href="/blog?type=case_study"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            searchParams.type === "case_study" ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
          }`}
        >
          Case Studies
        </Link>
        <Link
          href="/blog?type=user_guide"
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            searchParams.type === "user_guide" ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-600 hover:bg-ink-100"
          }`}
        >
          User Guides
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
        {posts?.map((post: BlogPost) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink-50">
              {post.featured_image_url ? (
                <Image
                  src={post.featured_image_url}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-ink-300">
                  <span className="text-sm font-medium uppercase tracking-wider">{post.post_type.replace("_", " ")}</span>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-col flex-1">
              <div className="flex items-center justify-between text-xs text-ink-400">
                <span className="font-medium uppercase tracking-wide text-accent-600">
                  {post.post_type.replace("_", " ")}
                </span>
                <span>{formatDate(post.published_at || post.created_at)}</span>
              </div>
              <h3 className="mt-2 text-xl font-semibold text-ink-950 group-hover:text-accent-600">
                {post.title}
              </h3>
              {post.excerpt && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-500">
                  {post.excerpt}
                </p>
              )}
            </div>
          </Link>
        ))}

        {!posts?.length && (
          <div className="col-span-full py-20 text-center text-ink-500">
            No posts found matching that category.
          </div>
        )}
      </div>
    </div>
  );
}
