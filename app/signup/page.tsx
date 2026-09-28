"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const [resending, setResending] = useState(false);

  if (done) {
    return (
      <div className="container-content flex min-h-[70vh] items-center justify-center py-16 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-semibold text-ink-950">Check your email</h1>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            We sent a confirmation link to {email}. Confirm your address to finish creating your account.
          </p>
          <button
            className="btn-secondary mt-6"
            disabled={resending}
            onClick={async () => {
              setResending(true);
              await supabase.auth.resend({
                type: 'signup',
                email,
                options: { emailRedirectTo: `${window.location.origin}/api/auth/confirm` }
              });
              setResending(false);
              alert("Email resent.");
            }}
          >
            {resending ? "Resending..." : "Resend Email"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-content flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-ink-950">Create your account</h1>
        <p className="mt-2 text-sm text-ink-500">Get access to your purchases and downloads in one place.</p>

        <form
          className="mt-8 flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const { error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: { full_name: fullName },
                emailRedirectTo: `${window.location.origin}/api/auth/confirm`,
              },
            });
            setLoading(false);
            if (error) {
              setError(error.message);
              return;
            }
            setDone(true);
          }}
        >
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
            <input id="fullName" required className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={6} className="field" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent-600 hover:text-accent-500">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
