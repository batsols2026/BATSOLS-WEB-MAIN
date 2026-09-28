import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Anon-key Supabase client for public, non-session-dependent reads (store
// catalog, product pages, testimonials). Deliberately does NOT touch
// next/headers' cookies() the way lib/supabase/server.ts does - calling
// cookies() inside a Server Component opts the whole route into dynamic
// rendering in the App Router, which was silently overriding every
// `export const revalidate` on the public pages and forcing a full
// server round-trip on every single visit. Only ever read active/
// published rows through RLS (same policies an anonymous visitor would
// get), so no session is needed here. Do not use this for anything that
// depends on who's signed in - use lib/supabase/server.ts for that.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
