/**
 * Promotes an existing BATsols account to admin so it can access /admin.
 *
 * Usage:
 *   1. Sign up normally at /signup with the account you want as admin.
 *   2. Run: npm run promote-admin -- you@example.com
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npm run promote-admin -- you@example.com");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
    process.exit(1);
  }

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (usersError) {
    console.error(usersError.message);
    process.exit(1);
  }

  const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) {
    console.error(`No account found for ${email}. Sign up first at /signup.`);
    process.exit(1);
  }

  const { error } = await admin.from("profiles").update({ role: "admin" }).eq("id", user.id);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  console.log(`${email} is now an admin. Sign out and back in, then visit /admin.`);
}

main();
