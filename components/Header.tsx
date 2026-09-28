"use client";

import Link from "next/link";
import LogoMark from "./Logo";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCart } from "@/lib/cart-context";

const NAV_LINKS = [
  { href: "/store", label: "Store" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { itemCount, openCart } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadUser(currentUser: { id: string; email?: string } | null) {
      setUser(currentUser);
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();
      setIsAdmin(profile?.role === "admin");
    }

    supabase.auth.getUser().then(({ data }) => loadUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="container-content flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-950">
          <LogoMark />
          BAT<span className="text-accent-600">sols</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-ink-950"
                  : "text-ink-500 hover:text-ink-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            aria-label="Open cart"
            className="relative rounded-lg p-2 text-ink-700 hover:bg-ink-50"
          >
            <CartIcon />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </button>

          {user ? (
            <Link
              href={isAdmin ? "/admin" : "/account"}
              className="hidden text-sm font-medium text-ink-700 hover:text-ink-950 sm:block"
            >
              {isAdmin ? "Admin Panel" : "My Account"}
            </Link>
          ) : (
            <Link href="/login" className="hidden text-sm font-medium text-ink-700 hover:text-ink-950 sm:block">
              Sign In
            </Link>
          )}

          <Link href="/store" className="btn-primary hidden sm:inline-flex">
            Browse Products
          </Link>

          <button
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-50 md:hidden"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white md:hidden">
          <div className="container-content flex flex-col gap-1 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={user ? (isAdmin ? "/admin" : "/account") : "/login"}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
            >
              {user ? (isAdmin ? "Admin Panel" : "My Account") : "Sign In"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3h2l.4 2M7 13h10l3-8H5.4M7 13L5.4 5M7 13l-2.3 4.6A1 1 0 0 0 5.6 19H17" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="17" cy="21" r="1.4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
    </svg>
  );
}
