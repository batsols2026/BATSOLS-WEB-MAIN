import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the BATsols team.",
};

export default function ContactPage() {
  return (
    <div className="container-content py-16">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        <div>
          <span className="section-eyebrow">Contact</span>
          <h1 className="mt-2 text-3xl font-semibold text-ink-950 sm:text-4xl">Let's talk.</h1>
          <p className="mt-4 max-w-md text-base leading-7 text-ink-500">
            Questions about a product, a bug to report, or an idea for
            something we should build next: send it over.
          </p>

          <div className="mt-10 space-y-4 text-sm">
            <div>
              <span className="block font-medium text-ink-900">Email</span>
              <span className="text-ink-500">hello@batsols.com</span>
            </div>
            <div>
              <span className="block font-medium text-ink-900">Response time</span>
              <span className="text-ink-500">Usually within 1-2 business days</span>
            </div>
          </div>
        </div>

        <div className="card p-8">
          <Suspense fallback={<div className="h-40 animate-pulse bg-ink-50 rounded-xl" />}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
