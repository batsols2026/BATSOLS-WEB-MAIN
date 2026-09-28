-- ============================================================================
-- BATsols — payments & delivery update
-- ============================================================================
-- Run this ONCE against your existing BATsols Supabase project (SQL Editor
-- → paste → Run). Adds: bank-transfer payment proof handling, and support
-- for web-app deliverables (e.g. batgos.batsols.com) alongside installer
-- files. Safe to run after supabase/schema.sql has already been applied.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Product files can now be an uploaded installer OR an external web link
-- ---------------------------------------------------------------------------

create type file_delivery_type as enum ('file', 'url');

alter table product_files
  add column delivery_type file_delivery_type not null default 'file',
  add column external_url text,
  alter column storage_path drop not null;

alter table product_files
  add constraint product_files_delivery_check check (
    (delivery_type = 'file' and storage_path is not null)
    or (delivery_type = 'url' and external_url is not null)
  );

-- ---------------------------------------------------------------------------
-- 2. Orders: track how the customer paid and any bank-transfer proof
-- ---------------------------------------------------------------------------

create type payment_method as enum ('card', 'bank_transfer');

alter table orders
  add column payment_method payment_method not null default 'card',
  add column payment_proof_path text,
  add column customer_note text,
  add column confirmed_by uuid references auth.users(id) on delete set null,
  add column confirmed_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Private storage bucket for bank-transfer payment screenshots
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Customers can upload proof only into their own order's folder
-- (object path convention: {order_id}/{filename}); admins can read/manage all.
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

-- ============================================================================
-- Done. Verify: product_files has delivery_type/external_url columns, orders
-- has payment_method/payment_proof_path, and Storage shows a private
-- "payment-proofs" bucket.
-- ============================================================================
