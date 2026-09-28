import Link from "next/link";
import LogoMark from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-ink-50/50">
      <div className="container-content grid gap-10 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-950">
            <LogoMark className="h-7 w-7" />
            BAT<span className="text-accent-600">sols</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-6 text-ink-500">
            We build practical digital products that solve real problems -
            for individuals, creators, and businesses.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-900">Store</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/store" className="hover:text-ink-900">All Products</Link></li>
            <li><Link href="/store?sort=featured" className="hover:text-ink-900">Featured</Link></li>
            <li><Link href="/store?sort=newest" className="hover:text-ink-900">New Releases</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-900">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link href="/about" className="hover:text-ink-900">About BATsols</Link></li>
            <li><Link href="/blog" className="hover:text-ink-900">Blog & Guides</Link></li>
            <li><Link href="/contact" className="hover:text-ink-900">Contact</Link></li>
            <li><Link href="/account" className="hover:text-ink-900">My Account</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-ink-900">Get in touch</h4>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>hello@batsols.com</li>
            <li>Badar &middot; Abdullah &middot; Talha</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-100 py-6">
        <div className="container-content flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} BATsols. All rights reserved.</span>
          <span>Solutions, built as products.</span>
        </div>
      </div>
    </footer>
  );
}
