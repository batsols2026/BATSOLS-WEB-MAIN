"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const postSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  excerpt: z.string().optional(),
  content: z.string().min(1),
  post_type: z.enum(["article", "case_study", "user_guide", "other"]),
  status: z.enum(["draft", "published"]),
});

export async function savePost(id: string | null, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const parsed = postSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    content: formData.get("content"),
    post_type: formData.get("post_type"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Invalid form data");
  }

  const { slug, title, excerpt, content, post_type, status } = parsed.data;

  // Handle image upload
  let featured_image_url = formData.get("current_image") as string | null;
  const imageFile = formData.get("image") as File | null;
  
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      throw new Error("Failed to upload image: " + uploadError.message);
    }
    const { data: publicUrlData } = supabase.storage.from("blog-images").getPublicUrl(uploadData.path);
    featured_image_url = publicUrlData.publicUrl;
  }

  const payload: any = {
    slug,
    title,
    excerpt,
    content,
    post_type,
    status,
    featured_image_url,
  };

  if (status === "published") {
    payload.published_at = new Date().toISOString();
  } else {
    payload.published_at = null;
  }

  if (id) {
    const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    payload.author_id = user.id;
    const { error } = await supabase.from("blog_posts").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  redirect("/admin/posts");
}

export async function deletePost(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
}
