import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-content flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="text-sm font-semibold text-accent-600">404</span>
      <h1 className="text-3xl font-semibold text-ink-950">Page not found</h1>
      <p className="max-w-sm text-sm text-ink-500">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="mt-4 flex gap-3">
        <Link href="/" className="btn-primary">Go Home</Link>
        <Link href="/store" className="btn-secondary">Browse Store</Link>
      </div>
    </div>
  );
}
