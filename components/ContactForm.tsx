"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const searchParams = useSearchParams();
  const [subject, setSubject] = useState("");

  useEffect(() => {
    const s = searchParams.get("subject");
    if (s) setSubject(s);
  }, [searchParams]);

  if (status === "done") {
    return (
      <div className="rounded-xl bg-green-50 px-5 py-4 text-sm text-green-700">
        Thanks for reaching out. We'll get back to you soon.
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("submitting");
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error();
          setStatus("done");
        } catch {
          setErrorMsg("Something went wrong. Please try again or email us directly.");
          setStatus("error");
        }
      }}
    >
      <div>
        <label className="label" htmlFor="name">Name</label>
        <input id="name" name="name" required className="field" placeholder="Your name" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required className="field" placeholder="you@example.com" />
      </div>
      <div>
        <label className="label" htmlFor="subject">Subject</label>
        <input 
          id="subject" 
          name="subject" 
          className="field" 
          placeholder="What's this about?" 
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div>
        <label className="label" htmlFor="message">Message</label>
        <textarea id="message" name="message" required className="field min-h-[140px]" placeholder="How can we help?" />
      </div>
      {status === "error" && <p className="text-sm text-red-600">{errorMsg}</p>}
      <button type="submit" disabled={status === "submitting"} className="btn-primary self-start">
        {status === "submitting" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
