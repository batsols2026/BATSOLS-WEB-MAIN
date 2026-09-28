-- ============================================================================
-- BATsols — Blog & Articles update
-- ============================================================================

create type post_type as enum ('article', 'case_study', 'user_guide', 'other');
create type post_status as enum ('draft', 'published');

create table blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  post_type post_type not null default 'article',
  status post_status not null default 'draft',
  featured_image_url text,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blog_posts_status on blog_posts(status);
create index idx_blog_posts_type on blog_posts(post_type);

create trigger trg_blog_posts_updated_at
before update on blog_posts
for each row execute function set_updated_at();

alter table blog_posts enable row level security;

create policy "blog_posts_public_read" on blog_posts
for select using (status = 'published' or is_admin());

create policy "blog_posts_admin_write" on blog_posts
for all using (is_admin()) with check (is_admin());

-- Storage bucket for blog images
insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do nothing;

create policy "blog_images_bucket_public_read"
on storage.objects for select
using (bucket_id = 'blog-images');

create policy "blog_images_bucket_admin_write"
on storage.objects for insert
with check (bucket_id = 'blog-images' and is_admin());

create policy "blog_images_bucket_admin_update"
on storage.objects for update
using (bucket_id = 'blog-images' and is_admin());

create policy "blog_images_bucket_admin_delete"
on storage.objects for delete
using (bucket_id = 'blog-images' and is_admin());
