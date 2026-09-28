import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const revalidate = 60; // cached for 1 minute

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  
  // Note: RLS public_read ensures we only fetch 'published' posts.
  const { data: post } = await supabase
    .from("blog_posts")
    .select("*, author:profiles(full_name)")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!post) notFound();

  const authorName = post.author?.full_name || "BATsols Team";

  return (
    <div className="container-content py-16">
      <div className="mx-auto max-w-3xl">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-900">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Blog
        </Link>

        {/* Header */}
        <div className="mt-8">
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span className="font-semibold uppercase tracking-wider text-accent-600">
              {post.post_type.replace("_", " ")}
            </span>
            <span>&middot;</span>
            <time dateTime={post.published_at || post.created_at}>
              {formatDate(post.published_at || post.created_at)}
            </time>
          </div>
          
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-ink-950 sm:text-5xl">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="mt-6 text-xl leading-8 text-ink-600">
              {post.excerpt}
            </p>
          )}

          <div className="mt-8 flex items-center gap-3 border-t border-ink-100 pt-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-100 text-sm font-semibold text-ink-700">
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-medium text-ink-900">{authorName}</div>
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="relative mt-12 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-ink-50">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content */}
        <article className="prose prose-ink prose-lg mt-16 max-w-none">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
