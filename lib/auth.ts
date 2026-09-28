import "server-only";
import { createClient } from "@/lib/supabase/server";

// Server-side guard for privileged actions. Any Server Action or Route
// Handler that uses the service-role admin client (which bypasses Row Level
// Security entirely) must call this first - RLS itself provides no
// protection in that case, so this check is the only thing standing between
// a non-admin caller and a privileged write. Throws if the caller isn't a
// signed-in admin; callers should let that error propagate.
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not signed in.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") throw new Error("Admin access required.");

  return user;
}
