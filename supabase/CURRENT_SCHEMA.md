# Live schema reference — "BATsols" Supabase project (`ikipcdezxywajggjjasc`)

This documents what is **actually live** in the database today, verified
directly against the project on 2026-09-15. The `supabase/*.sql` files in
this folder are the original migration history and are **out of date** —
the live schema has since evolved past them (most importantly: payments,
proofs, bank accounts, entitlements and web-app deliverables were split out
into their own tables, none of which appear in those `.sql` files). Treat
this file, not the `.sql` files, as the source of truth. `lib/types.ts`
mirrors every shape described here.

The same Supabase project also hosts an unrelated product's tables
(`clinic_*` — a separate clinic-management app). They share this database
but have nothing to do with BATsols; ignore them.

## Tables

**Catalog** — `categories`, `products`, `product_images`, `product_videos`,
`product_features`, `product_benefits`, `product_faqs`,
`product_inclusions`, `reviews`, `coupons`, `coupon_products`.

**Blog** — `blog_posts` (id, slug, title, excerpt, content, `post_type`, `status`, featured_image_url, author_id, published_at, timestamps).

**Identity** — `profiles` (`id` = `auth.users.id`, `full_name`, `role`
`user_role` enum `customer|admin` default `customer`, `created_at`).
Created automatically by an `AFTER INSERT` trigger on `auth.users`
(`handle_new_user()`) — app code never inserts a profile row itself.

**Orders** — `orders` (id, order_number, customer_id, billing_email,
status `order_status`, subtotal, discount_amount, total, currency,
coupon_id, `payment_provider`/`payment_reference` — a denormalized,
informational mirror of the payment for quick admin queries, never the
source of truth, created_at, updated_at) + `order_items` (order_id,
product_id, product_name, unit_price, quantity).

**Payments** (the real state machine — `orders` itself carries no payment
logic):
- `payments` — one or more per order. `method` (`card|bank_transfer`),
  `status` (`pending|submitted|confirmed|rejected|failed|refunded`),
  `amount`, `currency`, `provider`, `provider_payment_id`,
  `provider_payload` (jsonb), `bank_account_id`, `sender_name`,
  `sender_bank`, `transfer_reference`, `transferred_at`, `reviewed_by`,
  `reviewed_at`, `admin_note`, `rejection_reason`, `submitted_at`,
  `confirmed_at`, timestamps.
- `payment_proofs` — evidence for a payment. `payment_id`, `storage_path`
  (**NOT NULL** — a WhatsApp self-report with no real file uses the
  sentinel `whatsapp/{payment_id}`, not a real storage object; only rows
  with `source = 'upload'` point at something in the `payment-proofs`
  bucket), `source` (`upload|whatsapp|admin`), `mime_type`, `size_bytes`,
  `note`, `uploaded_by`, `uploaded_at`.
- `bank_accounts` — admin-managed, multiple allowed. `label`, `bank_name`,
  `account_title`, `account_number`, `iban`, `branch`, `instructions`,
  `is_active`, `sort_order`.

**Delivery / access**:
- `product_files` — installer files only (`id, product_id, file_name,
  storage_path, version, size_bytes, is_active, created_at`) — no
  `delivery_type`/`external_url` columns; that split moved to the table
  below.
- `product_web_apps` — hosted web-app links, separate from installers.
  `product_id, label, url, subdomain, access_instructions, is_active,
  sort_order`.
- `entitlements` — the real access-control record. `customer_id,
  product_id, order_item_id, source (purchase|manual|trial), status
  (active|suspended|expired), starts_at, expires_at, note`. Checked by
  `has_product_access()` and by the RLS read policies on `product_files`
  and `product_web_apps`.
- `licenses` — display/tracking record, generated 1:1 alongside
  entitlements. `order_item_id, product_id, customer_id, license_key,
  status (active|revoked), activation_limit, activations_used, issued_at`.
- `download_events` — audit log of every file/web-app access.

**Site config** — `site_settings` (`key` text primary key, `value`,
`description`, `updated_at`) — generic admin-editable key/value store.
Keys used by the app: `bank_transfer_note`, `download_link_ttl_sec`,
`support_email`, `whatsapp_number`. `contact_messages` for the /contact
form.

## Storage buckets

- `product-images` — **public**.
- `blog-images` — **public**. Blog post featured images and content images.
- `product-files` — private. Installers only; served through signed URLs
  from `app/api/download/file/[fileId]/route.ts`.
- `payment-proofs` — private. Upload path convention:
  `{auth.uid()}/{payment_id}-{timestamp}.{ext}` — RLS requires the first
  path segment to equal the uploader's own `auth.uid()`.

## Key functions (all `SECURITY DEFINER`, `search_path` pinned to `public`)

- `is_admin()` — `profiles.role = 'admin'` for `auth.uid()`. Safe to call
  directly (read-only, no side effects) — exposed to `anon`/`authenticated`.
- `has_product_access(p_product_id)` — admin, or an active/unexpired
  entitlement for `auth.uid()`. Same as above, safe to expose.
- `confirm_bank_transfer(p_payment_id, p_note)` / `reject_bank_transfer
  (p_payment_id, p_reason)` — check `is_admin()` internally before doing
  anything, so they're safe to leave callable by `authenticated` (that's
  how `app/admin/orders/actions.ts` invokes them, through the signed-in
  admin's own session client — **not** the service-role client, since
  `is_admin()`/`auth.uid()` need a real user session to resolve).
- `grant_order_access(p_order_id)` / `revoke_order_access(p_order_id,
  p_new_status)` — **internal only, not meant to be called directly.**
  Neither function checks who's calling or that the order belongs to
  them — they trust the caller entirely. They're invoked exclusively from
  inside the `payments_sync_order` trigger. **`EXECUTE` on both (and on
  the trigger function itself) has been revoked from `PUBLIC`, `anon` and
  `authenticated`, leaving only `postgres`/`service_role`** — as originally
  shipped, every signed-in customer (and `anon`, if they could obtain an
  order id) could call `POST /rest/v1/rpc/grant_order_access` directly on
  their own pending order and get it marked paid, licensed and entitled
  without ever paying, and `revoke_order_access` had no ownership check
  either, so anyone could revoke any other customer's access by guessing
  their order id. This was found and fixed in the 2026-09-15 audit — see
  migrations `lock_down_internal_order_access_functions` and
  `revoke_execute_from_public_on_internal_functions`. The trigger still
  calls both fine after the lockdown: both are owned by `postgres`
  (superuser), and a `SECURITY DEFINER` function's nested calls run under
  its owner's privileges, which bypass ACL checks entirely — this doesn't
  depend on who fired the original `UPDATE`.
- `generate_license_key()` / `generate_order_number()` — plain generators,
  no access logic.
- `prevent_role_escalation()` — `BEFORE UPDATE` trigger on `profiles`.
  Added in the same audit: the `profiles_self_update` RLS policy lets a
  user update their own row, but its `with_check` only verifies row
  ownership, not which columns changed - nothing previously stopped a
  plain customer from calling `supabase.from('profiles').update({role:
  'admin'}).eq('id', myId)` from the browser and granting themselves
  admin. The trigger now blocks any `role` change unless the acting user
  is already an admin, while still allowing the service-role bootstrap
  path (`scripts/promote-admin.ts`) and direct operator SQL, both of which
  run with no Supabase Auth session at all (`auth.uid()` is null there,
  same as the `has_product_access()`/`confirm_bank_transfer()` gotcha
  documented above) and are gated by possession of the service-role key or
  database credentials instead.

## Trigger: `payments_sync_order`

`AFTER INSERT OR UPDATE` on `payments`. The only thing that ever moves an
order forward or back:

- `status = 'confirmed'` → `grant_order_access(order_id)` (marks the order
  `paid`, issues one license + entitlement per item).
- `status = 'submitted'` → order `pending` → `awaiting_verification`.
- `status in ('rejected','failed')` → order back to `pending`.
- `status = 'refunded'` → `revoke_order_access(order_id, 'refunded')`.

App code (checkout, the Stripe webhook, `upload-proof`) only ever writes
`payments.status` — never `orders.status` directly.

## RLS summary

Every table has RLS enabled. The consistent pattern: `*_admin_write`/
`*_admin_only` policies gate all mutation on `is_admin()`; public/customer
read policies check `status = 'active'` (products and their child content),
`is_published` (reviews), ownership (`customer_id = auth.uid()`, for
orders/payments/licenses/entitlements/download_events), or
`has_product_access()` (product_files, product_web_apps).
`bank_accounts_read` and `site_settings_public_read` are the two genuinely
public-read tables besides the catalog (`is_active OR is_admin()`, and
`true`, respectively) — needed so an unauthenticated visitor can see bank
transfer options and the WhatsApp number/support email before signing in.

## Known follow-ups (not yet done)

- **Leaked password protection is disabled** in Supabase Auth (flagged by
  the security advisor). Turn it on in Dashboard → Authentication →
  Policies once convenient — it's a one-click setting, not a code change.
- `clinic_*` functions show the same "callable by anon/authenticated"
  advisor warnings as BATsols' own functions did before this audit — out
  of scope here since they belong to the unrelated clinic project, but
  worth the same review if/when that project gets attention.
