import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostForm from "@/components/admin/PostForm";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: post } = await supabase.from("blog_posts").select("*").eq("id", params.id).maybeSingle();

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-xl font-semibold text-ink-950">Edit Post</h2>
      <div className="card p-6">
        <PostForm post={post} />
      </div>
    </div>
  );
}
