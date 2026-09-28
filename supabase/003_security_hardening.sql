-- ============================================================================
-- BATsols — security hardening
-- ============================================================================
-- Run this ONCE against your existing BATsols Supabase project (SQL Editor
-- → paste → Run). Closes three privilege-escalation gaps found in the
-- original Row Level Security policies. Safe to run after schema.sql and
-- 002_payments_and_delivery.sql have already been applied.
--
-- What was wrong:
-- 1. profiles_self_update only checked that a customer was updating their
--    OWN row, not which columns they were allowed to change. Any signed-in
--    customer could call `update profiles set role = 'admin' where id =
--    auth.uid()` from the browser and grant themselves admin access.
-- 2. orders_owner_insert let a signed-in customer insert an order row
--    directly with any status, including 'paid', bypassing the checkout
--    API entirely (this alone doesn't unlock a product since licenses are
--    admin-only, but it lets a customer fake their own order history).
-- 3. reviews_owner_insert let a signed-in customer insert a review row
--    directly with is_published = true and is_verified_purchase = true,
--    posting a fake "Verified Purchase" review without buying anything or
--    going through moderation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Block non-admins from changing anyone's role, including their own.
--    This is enforced with a trigger rather than relying only on RLS/column
--    grants, so it holds even if a future policy is loosened by mistake.
-- ---------------------------------------------------------------------------

create or replace function prevent_role_escalation()
returns trigger as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'Only admins can change role.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_profiles_prevent_role_escalation on profiles;
create trigger trg_profiles_prevent_role_escalation
before update on profiles
for each row execute function prevent_role_escalation();

-- ---------------------------------------------------------------------------
-- 2. A customer can still insert their own profile row (the auth trigger
--    normally does this already), but never with role other than 'customer'.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_admin_write" on profiles;
create policy "profiles_admin_write" on profiles for insert with check (
  is_admin() or (auth.uid() = id and role = 'customer')
);

-- ---------------------------------------------------------------------------
-- 3. A customer can still create their own order directly if some future
--    client-side flow needs it, but only ever in 'pending' status. Only the
--    checkout API (service-role) or an admin can ever mark one 'paid'.
-- ---------------------------------------------------------------------------

drop policy if exists "orders_owner_insert" on orders;
create policy "orders_owner_insert" on orders for insert with check (
  (auth.uid() = customer_id and status = 'pending') or is_admin()
);

-- ---------------------------------------------------------------------------
-- 4. A customer can still post their own review, but it always starts
--    unpublished and unverified - only the admin moderation action
--    (app/admin/products/actions.ts -> moderateReview) can publish it, and
--    "verified purchase" is something only the system should ever claim.
-- ---------------------------------------------------------------------------

drop policy if exists "reviews_owner_insert" on reviews;
create policy "reviews_owner_insert" on reviews for insert with check (
  (auth.uid() = customer_id and is_published = false and is_verified_purchase = false)
  or is_admin()
);

-- ============================================================================
-- Done. Verify: as a non-admin test user, running
--   update profiles set role = 'admin' where id = auth.uid();
-- from the SQL editor "as authenticated user" (or via the app) should now
-- raise "Only admins can change role."
-- ============================================================================
