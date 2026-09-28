import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Privileged Supabase client using the SERVICE ROLE key. This bypasses
// Row Level Security entirely, so it must NEVER be imported into a client
// component and must only be called from Route Handlers / Server Actions
// that have already verified the request themselves (auth, ownership, etc).
//
// Used for: order creation at checkout, license issuance, and generating
// short-lived signed URLs for protected digital downloads.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your .env.local from " +
        "Supabase Dashboard -> Project Settings -> API before using checkout, " +
        "downloads, or admin write actions."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
