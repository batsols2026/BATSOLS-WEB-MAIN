-- ============================================================================
-- BATsols — full database schema
-- ============================================================================
-- Run this ONCE against a fresh Supabase project (SQL Editor → paste → Run).
-- It creates every table, function, trigger, storage bucket, and Row Level
-- Security policy the app needs. Safe to read top-to-bottom; each section
-- mirrors the migrations used to build the original BATsols project.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extensions, enums, core catalog tables
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create type product_type as enum (
  'software', 'web_app', 'mobile_app', 'template', 'system',
  'ai_tool', 'automation', 'educational', 'other'
);

create type billing_type as enum ('one_time', 'subscription');
create type product_status as enum ('draft', 'active', 'archived');

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null,
  short_description text not null,
  description text not null,
  problem_statement text,
  who_its_for text,
  how_it_works text,
  category_id uuid references categories(id) on delete set null,
  product_type product_type not null default 'software',
  billing_type billing_type not null default 'one_time',
  price numeric(10,2) not null default 0,
  sale_price numeric(10,2),
  currency text not null default 'USD',
  requirements text,
  version text,
  status product_status not null default 'draft',
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_best_seller boolean not null default false,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_status on products(status);
create index idx_products_category on products(category_id);
create index idx_products_featured on products(is_featured) where is_featured = true;

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt_text text,
  is_primary boolean not null default false,
  sort_order int not null default 0
);
create index idx_product_images_product on product_images(product_id);

create table product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text,
  url text not null,
  sort_order int not null default 0
);

create table product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text not null,
  description text,
  icon text,
  sort_order int not null default 0
);

create table product_benefits (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0
);

create table product_faqs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  question text not null,
  answer text not null,
  sort_order int not null default 0
);

create table product_inclusions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sort_order int not null default 0
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Reviews and discounts
-- ---------------------------------------------------------------------------

create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_published boolean not null default false,
  is_verified_purchase boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_reviews_product on reviews(product_id) where is_published = true;

create type discount_type as enum ('percent', 'fixed');

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type discount_type not null,
  discount_value numeric(10,2) not null,
  max_uses int,
  used_count int not null default 0,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table coupon_products (
  coupon_id uuid not null references coupons(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

create or replace function refresh_product_rating()
returns trigger as $$
declare
  pid uuid;
begin
  pid := coalesce(new.product_id, old.product_id);
  update products p
  set rating_avg = coalesce((
        select round(avg(r.rating)::numeric, 2)
        from reviews r where r.product_id = pid and r.is_published = true
      ), 0),
      rating_count = (
        select count(*) from reviews r where r.product_id = pid and r.is_published = true
      )
  where p.id = pid;
  return null;
end;
$$ language plpgsql set search_path = public;

create trigger trg_reviews_refresh_rating
after insert or update or delete on reviews
for each row execute function refresh_product_rating();

-- ---------------------------------------------------------------------------
-- 3. Customers, orders, licenses, digital delivery
-- ---------------------------------------------------------------------------

create type user_role as enum ('customer', 'admin');
create type order_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');
create type license_status as enum ('active', 'revoked');
create type file_delivery_type as enum ('file', 'url');
create type payment_method as enum ('card', 'bank_transfer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

create sequence if not exists order_number_seq start 1000;

create or replace function generate_order_number()
returns text as $$
  select 'BATS-' || lpad(nextval('order_number_seq')::text, 6, '0');
$$ language sql set search_path = public;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default generate_order_number(),
  customer_id uuid references auth.users(id) on delete set null,
  billing_email text not null,
  status order_status not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  currency text not null default 'USD',
  coupon_id uuid references coupons(id) on delete set null,
  payment_provider text,
  payment_reference text,
  payment_method payment_method not null default 'card',
  payment_proof_path text,
  customer_note text,
  confirmed_by uuid references auth.users(id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_orders_customer on orders(customer_id);
create trigger trg_orders_updated_at
before update on orders
for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null default 1
);
create index idx_order_items_order on order_items(order_id);

create table product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  file_name text not null,
  delivery_type file_delivery_type not null default 'file',
  storage_path text,
  external_url text,
  version text,
  size_bytes bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint product_files_delivery_check check (
    (delivery_type = 'file' and storage_path is not null)
    or (delivery_type = 'url' and external_url is not null)
  )
);
create index idx_product_files_product on product_files(product_id) where is_active = true;

create table licenses (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references order_items(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete set null,
  license_key text not null unique,
  status license_status not null default 'active',
  activation_limit int not null default 1,
  activations_used int not null default 0,
  issued_at timestamptz not null default now()
);
create index idx_licenses_customer on licenses(customer_id);

create table download_events (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id) on delete set null,
  product_file_id uuid references product_files(id) on delete set null,
  order_item_id uuid references order_items(id) on delete set null,
  downloaded_at timestamptz not null default now(),
  ip_address text
);

-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table product_videos enable row level security;
alter table product_features enable row level security;
alter table product_benefits enable row level security;
alter table product_faqs enable row level security;
alter table product_inclusions enable row level security;
alter table reviews enable row level security;
alter table coupons enable row level security;
alter table coupon_products enable row level security;
alter table profiles enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table product_files enable row level security;
alter table licenses enable row level security;
alter table download_events enable row level security;

create policy "categories_public_read" on categories for select using (true);
create policy "categories_admin_write" on categories for all using (is_admin()) with check (is_admin());

create policy "products_public_read" on products for select using (status = 'active' or is_admin());
create policy "products_admin_write" on products for insert with check (is_admin());
create policy "products_admin_update" on products for update using (is_admin()) with check (is_admin());
create policy "products_admin_delete" on products for delete using (is_admin());

create policy "product_images_read" on product_images for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_images_admin_write" on product_images for all using (is_admin()) with check (is_admin());

create policy "product_videos_read" on product_videos for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_videos_admin_write" on product_videos for all using (is_admin()) with check (is_admin());

create policy "product_features_read" on product_features for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_features_admin_write" on product_features for all using (is_admin()) with check (is_admin());

create policy "product_benefits_read" on product_benefits for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_benefits_admin_write" on product_benefits for all using (is_admin()) with check (is_admin());

create policy "product_faqs_read" on product_faqs for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_faqs_admin_write" on product_faqs for all using (is_admin()) with check (is_admin());

create policy "product_inclusions_read" on product_inclusions for select using (
  is_admin() or exists (select 1 from products p where p.id = product_id and p.status = 'active')
);
create policy "product_inclusions_admin_write" on product_inclusions for all using (is_admin()) with check (is_admin());

create policy "reviews_public_read" on reviews for select using (is_published = true or is_admin());
-- A customer may post their own review, but it always starts unpublished
-- and unverified - only admin moderation (moderateReview) can publish it,
-- and "verified purchase" is only ever something the system should claim.
create policy "reviews_owner_insert" on reviews for insert with check (
  (auth.uid() = customer_id and is_published = false and is_verified_purchase = false)
  or is_admin()
);
create policy "reviews_admin_write" on reviews for update using (is_admin()) with check (is_admin());
create policy "reviews_admin_delete" on reviews for delete using (is_admin());

create policy "coupons_admin_only" on coupons for all using (is_admin()) with check (is_admin());
create policy "coupon_products_admin_only" on coupon_products for all using (is_admin()) with check (is_admin());

create policy "profiles_self_read" on profiles for select using (auth.uid() = id or is_admin());
create policy "profiles_self_update" on profiles for update using (auth.uid() = id or is_admin()) with check (auth.uid() = id or is_admin());
-- A customer may only ever insert their own row (normally done by the
-- handle_new_user trigger already) and never with a role other than
-- 'customer' - only an admin can grant admin. See prevent_role_escalation()
-- below for what stops a customer from later UPDATE-ing their way to admin.
create policy "profiles_admin_write" on profiles for insert with check (
  is_admin() or (auth.uid() = id and role = 'customer')
);

create policy "orders_owner_read" on orders for select using (auth.uid() = customer_id or is_admin());
-- A customer may insert their own order directly, but only ever as
-- 'pending' - only the checkout API (service-role) or an admin can ever
-- mark one 'paid', so a direct insert here can never grant a license.
create policy "orders_owner_insert" on orders for insert with check (
  (auth.uid() = customer_id and status = 'pending') or is_admin()
);
create policy "orders_admin_update" on orders for update using (is_admin()) with check (is_admin());

create policy "order_items_owner_read" on order_items for select using (
  is_admin() or exists (select 1 from orders o where o.id = order_id and o.customer_id = auth.uid())
);
create policy "order_items_admin_write" on order_items for all using (is_admin()) with check (is_admin());

create policy "product_files_admin_only" on product_files for all using (is_admin()) with check (is_admin());

create policy "licenses_owner_read" on licenses for select using (auth.uid() = customer_id or is_admin());
create policy "licenses_admin_write" on licenses for all using (is_admin()) with check (is_admin());

create policy "download_events_owner_read" on download_events for select using (auth.uid() = customer_id or is_admin());
create policy "download_events_owner_insert" on download_events for insert with check (auth.uid() = customer_id or is_admin());

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

-- Belt-and-braces privilege escalation guard: even if a future policy
-- change accidentally loosens profiles_self_update, this trigger still
-- blocks any UPDATE that changes role unless the caller is already an
-- admin. This is what actually stops "update profiles set role='admin'
-- where id = auth.uid()" from a customer's own signed-in session.
create or replace function prevent_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only admins can change role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_profiles_prevent_role_escalation
before update on profiles
for each row execute function prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- 5. Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

create policy "product_images_bucket_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

create policy "product_images_bucket_admin_write"
on storage.objects for insert
with check (bucket_id = 'product-images' and is_admin());

create policy "product_images_bucket_admin_update"
on storage.objects for update
using (bucket_id = 'product-images' and is_admin());

create policy "product_images_bucket_admin_delete"
on storage.objects for delete
using (bucket_id = 'product-images' and is_admin());

create policy "product_files_bucket_admin_only"
on storage.objects for all
using (bucket_id = 'product-files' and is_admin())
with check (bucket_id = 'product-files' and is_admin());

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

create policy "payment_proofs_owner_insert"
on storage.objects for insert
with check (
  bucket_id = 'payment-proofs'
  and exists (
    select 1 from orders o
    where o.id::text = (storage.foldername(name))[1]
    and o.customer_id = auth.uid()
  )
);

create policy "payment_proofs_admin_read"
on storage.objects for select
using (bucket_id = 'payment-proofs' and is_admin());

create policy "payment_proofs_admin_manage"
on storage.objects for all
using (bucket_id = 'payment-proofs' and is_admin())
with check (bucket_id = 'payment-proofs' and is_admin());

-- ---------------------------------------------------------------------------
-- 6. Contact messages + starter categories
-- ---------------------------------------------------------------------------

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table contact_messages enable row level security;

create policy "contact_messages_public_insert" on contact_messages
for insert with check (true);

create policy "contact_messages_admin_read" on contact_messages
for select using (is_admin());

create policy "contact_messages_admin_update" on contact_messages
for update using (is_admin()) with check (is_admin());

insert into categories (name, slug, description, sort_order) values
  ('Productivity Tools', 'productivity-tools', 'Apps and systems that help you get more done with less friction.', 1),
  ('Business Systems', 'business-systems', 'Operational tools built for running and scaling a business.', 2),
  ('Templates', 'templates', 'Ready-to-use templates and frameworks you can customize.', 3),
  ('AI-Powered Tools', 'ai-tools', 'Products that use AI to automate or accelerate real work.', 4),
  ('Automation', 'automation', 'Tools that remove repetitive manual work.', 5),
  ('Educational Resources', 'educational-resources', 'Guides, courses, and structured learning resources.', 6)
on conflict (slug) do nothing;

-- ============================================================================
-- Done. Verify: Table Editor should now show 17 tables, and
-- Storage should show "product-images" (public) and "product-files" (private).
-- ============================================================================
