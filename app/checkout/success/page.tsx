"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  return (
    <div className="container-content flex min-h-[70vh] items-center justify-center py-16 text-center">
      <div className="max-w-md">
        <h1 className="text-3xl font-semibold text-ink-950">Check your email</h1>
        <p className="mt-4 text-base leading-7 text-ink-500">
          We received your order and created a new account for you. We just sent a magic link to <strong>{email}</strong>. 
          Please check your email and click the link to log in securely, view your order details, and complete your bank transfer if required.
        </p>
        <div className="mt-8">
          <Link href="/login" className="btn-primary">
            I've verified my email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="container-content py-16 text-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
