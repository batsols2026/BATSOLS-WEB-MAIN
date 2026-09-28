import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Who BATsols is, why we build digital products, and how we approach product development.",
};

export default function AboutPage() {
  return (
    <div className="container-content py-16">
      <div className="max-w-2xl">
        <span className="section-eyebrow">About BATsols</span>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink-950">
          We build the tools we wish already existed.
        </h1>
        <p className="mt-5 text-lg leading-7 text-ink-500">
          BATsols is a digital products company. The name comes from the
          people behind it, Badar, Abdullah, and Talha, plus Sols, short for
          Solutions. That's the whole idea: we build and sell practical
          digital products that solve real problems.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-10 border-t border-ink-100 pt-16 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Why we build digital products</h2>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            Most of the software, tools, and systems we use daily are either
            bloated, overpriced, or built for someone else's problem. We
            started BATsols to build the alternative: focused products that
            do one job well, priced fairly, and explained clearly before you
            ever have to ask.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Our philosophy</h2>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            A product earns its price by solving a specific problem better
            than the alternative, not by looking impressive in a demo. We'd
            rather ship something narrow and useful than broad and vague.
            Every product we release has to answer one question honestly:
            does this make something in someone's work or life measurably
            easier?
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Our approach to product development</h2>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            We start from the problem, not the technology. Every product goes
            through the same bar before it reaches the store: is the problem
            real, is the solution clear, and can we explain what someone gets
            for their money in plain language. If we can't explain it simply,
            it's not ready.
          </p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Our vision</h2>
          <p className="mt-3 text-sm leading-6 text-ink-500">
            BATsols is meant to grow into a line of digital products that
            people actually rely on, not a single app, but an expanding
            catalog of software, tools, templates, and systems that share the
            same standard for quality and clarity.
          </p>
        </div>
      </div>

      <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl bg-ink-50 px-8 py-16 text-center">
        <h2 className="text-2xl font-semibold text-ink-950">See what we've built so far</h2>
        <Link href="/store" className="btn-primary mt-2">Browse the Store</Link>
      </div>
    </div>
  );
}
