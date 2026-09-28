# BATsols — Digital Products Platform

A full-stack platform for BATsols to market, sell, and deliver its digital
products (installers and hosted web apps alike) from one storefront, with a
self-service admin area and manual (bank-transfer / WhatsApp) payment
confirmation as the primary payment path. Built with Next.js 14 (App
Router), TypeScript, Tailwind CSS, and Supabase (Postgres + Auth + Storage).

Nothing about the product catalog, bank accounts, or site contact details is
hardcoded. Everything lives in the database and is editable from `/admin` —
add or edit a row and it appears on the site with no code changes and no
redeploy.

## What's included

- **Storefront**: home, store with search/filter/sort, dynamic product
  pages (problem → solution → benefits → features → FAQs → reviews),
  about, contact.
- **Commerce**: cart (persisted in the browser), checkout, order creation,
  coupon support, license-key issuance, secure digital delivery (installer
  downloads and/or hosted web-app links per product).
- **Payments**: **Bank Transfer is the primary, always-available path** —
  a customer picks one of the admin's bank accounts, then either uploads a
  payment screenshot or taps "I already sent it on WhatsApp." Either way the
  order sits as `awaiting_verification` until an admin confirms or rejects
  it in `/admin/orders`. **Card (via Stripe)** is fully wired but stays
  dormant — invisible at checkout — until Stripe keys are added; see
  `STRIPE_SETUP_GUIDE.md`. No order is ever marked paid, and nothing is
  ever unlocked, without one of these confirmations.
- **Accounts**: sign up / sign in (Supabase Auth), account dashboard with
  order history, live order status, and downloads.
- **Admin** (`/admin`, role-gated via `profiles.role = 'admin'`):
  - Products: create/edit, including images, features, benefits, FAQs,
    inclusions, installer files, and web-app access links.
  - Orders: review and confirm/reject bank-transfer payments, see uploaded
    proof or WhatsApp self-reports.
  - **Settings** (`/admin/settings`): manage bank accounts (add as many as
    you like, each with its own label/instructions) and site-wide settings
    (WhatsApp number, support email, bank-transfer note, download-link
    expiry) — all from the browser, no env vars or SQL required.
  - Reviews and contact-message moderation.
- **Deliverables**: each product can have installer files (.exe, .dmg,
  .zip — uploaded straight from the admin's browser to private storage)
  and/or hosted web-app links (e.g. `https://batgos.batsols.com`). A
  customer only ever sees either after their order has an active
  entitlement.

## Getting started

```bash
npm install
npm run dev
```

The app is pointed at the live **"BATsols"** Supabase project
(`ikipcdezxywajggjjasc`) via `.env.local`. Open http://localhost:3000.

The database schema (tables, RLS policies, triggers, and the
`confirm_bank_transfer` / `reject_bank_transfer` / `grant_order_access` /
`generate_license_key` functions that do the actual state transitions) is
already live on that project — see `supabase/CURRENT_SCHEMA.md` for a full
reference of what's actually there. You do not need to run any of the
`supabase/*.sql` files in this repo against it; those are the original
migration history and are kept for context, but the live database has since
evolved past them (see the note at the top of `supabase/CURRENT_SCHEMA.md`).

### 1. Add the service role key (required for checkout & downloads)

Checkout, license issuance, and secure downloads run through a privileged
Supabase client that bypasses Row Level Security. Get the key from:

**Supabase Dashboard → "BATsols" project (`ikipcdezxywajggjjasc`) → Project
Settings → API → service_role secret**

Paste it into `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=your-key-here
```

Never commit this key or expose it to the browser.

### 2. Create your admin account

1. Run the app, go to `/signup`, and create an account with your own email.
2. Promote it to admin:
   ```bash
   npm run promote-admin -- you@example.com
   ```
3. Sign out and back in, then visit `/admin`.

### 3. Add your bank accounts and site settings (no code required)

Once you're signed in as admin, go to `/admin/settings`:

- **Bank Accounts** — add one or more (label, bank name, account title/
  number, IBAN, branch, any extra instructions). The first active one
  becomes the default at checkout; if you add more than one, the customer
  picks which to pay into.
- **Site Settings** — WhatsApp number (used to build the "chat with us"
  link customers see when paying by bank transfer), support email, the
  note shown under bank-transfer instructions, and how long a signed
  download link stays valid (seconds).

Bank Transfer only appears as a selectable payment method at checkout once
at least one bank account is active here — this is deliberate, so a fresh
install never shows a payment method with nowhere real to send money.

### 4. Add your real products

Everything is driven by the `products` table and its related tables
(`product_images`, `product_features`, `product_benefits`, `product_faqs`,
`product_inclusions`, `product_files`, `product_web_apps`). The easiest way
to add a product:

1. Go to `/admin/products/new`, fill in the core fields, save.
2. On the edit page, add images (paste public URLs — upload the image file
   to the `product-images` bucket in Supabase Storage first, then copy its
   public URL), features, benefits, FAQs, and what's-included bullets.
3. Under **Installer Files**, upload the installer (uploads straight to
   private storage from your browser — works for large .exe/.dmg/.zip
   files) — and/or under **Web App Access**, add a hosted-app link (e.g.
   `https://batgos.batsols.com`) with an optional access-instructions note.
   A product can have either, both, or neither (if neither, it can still be
   a "coming soon" listing).
4. Set **Status** to "Active" so it appears in the store.

### 5. How a bank-transfer order actually gets confirmed

1. Customer checks out choosing Bank Transfer and one of your accounts.
2. Their order/payment starts `pending`. Their order page
   (`/account/orders/[orderId]`) shows your transfer details and a
   WhatsApp link (built from the number you set in Settings), plus two
   ways to confirm they paid: upload a screenshot, or tap "I already sent
   it on WhatsApp" (a self-report with no file needed).
3. Either action flips the payment to `submitted` and the order to
   `awaiting_verification`. You see it in `/admin/orders` with a "Confirm
   Payment" button and a collapsible "Reject" form (with a reason).
4. Confirming runs the `confirm_bank_transfer` database function, which
   marks the payment `confirmed`, the order `paid`, generates a license
   key, and grants an active entitlement — all atomically, all only
   reachable by an admin. Rejecting runs `reject_bank_transfer` and puts
   the order back to `pending` with your reason visible to the customer.

### 6. Email alerts for bank-transfer proof uploads (optional, recommended)

By default, confirming a bank transfer depends on an admin remembering to
check `/admin/orders`. Add these three variables and you get an instant
email the moment a customer uploads a proof screenshot, so confirmation
happens in minutes instead of hours:

```
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=orders@yourdomain.com
ADMIN_ALERT_EMAIL=you@example.com
```

1. Create a free account at [resend.com](https://resend.com).
2. Get an API key from the dashboard → paste it as `RESEND_API_KEY`.
3. Add and verify a sending domain (Resend walks you through the DNS
   records), then set `RESEND_FROM_EMAIL` to an address on that domain —
   e.g. `orders@yourdomain.com`. Until a domain is verified, Resend only
   lets you send to your own account email, which is fine for testing.
4. Set `ADMIN_ALERT_EMAIL` to whichever inbox should get the alert.

Leave all three blank and the app works exactly as before — the email
call quietly no-ops (see `lib/email.ts`). A WhatsApp self-report doesn't
trigger an email (nothing was uploaded to the app); only in-app screenshot
uploads do.

### 7. Go live with card payments (optional, fully dormant until configured)

Add to `.env.local` (or your hosting provider's environment settings):

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Point a Stripe webhook at `/api/webhooks/stripe` listening for
`checkout.session.completed`. With these set, "Card" appears as a payment
option at checkout automatically — no code changes. Until then, only Bank
Transfer is offered. See `STRIPE_SETUP_GUIDE.md` for the full walkthrough.

## Project structure

```
app/                  Routes (App Router) — pages, layouts, API routes
components/           Reusable UI components
components/admin/     Admin-only form components
lib/supabase/         Browser / server / admin Supabase clients
lib/queries.ts         Product/category/review/bank-account/site-settings data-fetching
lib/types.ts           Central data model (matches the live DB — see supabase/CURRENT_SCHEMA.md)
scripts/               One-off ops scripts (e.g. promote-admin)
supabase/              Migration history + supabase/CURRENT_SCHEMA.md (live schema reference)
```

## Database

The live schema is documented in `supabase/CURRENT_SCHEMA.md`. In short:

- `categories`, `products` (+ `product_images`, `product_features`,
  `product_benefits`, `product_faqs`, `product_inclusions`,
  `product_files` [installers], `product_web_apps` [hosted-app links]),
  `reviews`, `coupons`, `profiles`, `contact_messages`.
- `orders` (no payment info on it — see below) + `order_items`.
- `payments` (one or more per order; tracks method, status, which
  `bank_account_id` it's headed to) + `payment_proofs` (uploaded
  screenshots or WhatsApp self-reports, evidence only) + `bank_accounts`
  (admin-managed, multiple allowed).
- `entitlements` (the real access-control record: active/suspended/expired
  per customer per product) + `licenses` (the display/tracking record,
  license key + activation limit).
- `site_settings` (generic admin-editable key/value store — WhatsApp
  number, support email, etc.) + `download_events` (audit log).

Row Level Security is enabled on every table — customers only ever see
their own data, product files and web-app links are never publicly
readable, and admin access is gated by `profiles.role` (with a trigger
blocking self-promotion). The actual status transitions (pending →
awaiting_verification → paid/rejected, license issuance, entitlement
grant/revoke) happen inside `SECURITY DEFINER` Postgres functions and a
`payments_sync_order` trigger, not in application code — the app only ever
calls those functions or flips `payments.status`, never `orders.status`
directly. Full details, including exactly which columns and functions
exist today, are in `supabase/CURRENT_SCHEMA.md`.

Security headers (CSP, HSTS, X-Frame-Options, and friends) are set for
every response in `next.config.js`. Every privileged Server Action that
uses the service-role client (which bypasses RLS) calls `requireAdmin()`
from `lib/auth.ts` first, so route-level protection in `middleware.ts` is
backed up by an explicit check inside the action itself.

## Deploying (Vercel, recommended)

1. Push this repo to GitHub.
2. In Vercel: **New Project** → import your repo.
3. Add environment variables (Project Settings → Environment Variables) —
   same names as `.env.example`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard, never commit this)
   - `NEXT_PUBLIC_SITE_URL` → your production domain
   - `NEXT_PUBLIC_SITE_NAME`, `CONTACT_INBOX_EMAIL`
   - Stripe keys, once you're ready to take card payments (optional)
   - Resend keys, for admin email alerts on proof uploads (optional)
4. Deploy. Vercel builds on every push to `main` from here on — this is
   the "continuously make changes live" loop: commit → push → Vercel
   redeploys automatically, usually within a couple of minutes.

Any other Next.js-compatible host (Netlify, Railway, your own server via
`npm run build && npm run start`) works the same way — same env vars,
same build command.
