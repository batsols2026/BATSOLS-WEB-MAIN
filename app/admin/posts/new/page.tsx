import PostForm from "@/components/admin/PostForm";

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h2 className="mb-6 text-xl font-semibold text-ink-950">Write New Post</h2>
      <div className="card p-6">
        <PostForm />
      </div>
    </div>
  );
}
