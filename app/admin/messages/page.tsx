import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { markMessageRead } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const supabase = createClient();
  const { data: messages } = await supabase
    .from("contact_messages")
    .select("id, name, email, subject, message, is_read, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold text-ink-950">Contact Messages</h2>

      {!messages || messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 py-16 text-center text-sm text-ink-500">
          No messages yet.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`card p-5 ${m.is_read ? "opacity-70" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-ink-900">{m.name}</span>
                  <span className="ml-3 text-xs text-ink-400">{m.email}</span>
                  <span className="ml-3 text-xs text-ink-400">{formatDate(m.created_at)}</span>
                </div>
                <form action={markMessageRead.bind(null, m.id, !m.is_read)}>
                  <button className="btn-secondary py-1.5 text-xs">
                    {m.is_read ? "Mark unread" : "Mark read"}
                  </button>
                </form>
              </div>
              {m.subject && <div className="mt-2 text-sm font-medium text-ink-800">{m.subject}</div>}
              <p className="mt-1 text-sm text-ink-600">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
