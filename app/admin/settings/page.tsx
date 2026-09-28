import { getAllBankAccounts, getSiteSettings } from "@/lib/queries";
import {
  createBankAccount,
  deleteBankAccount,
  updateBankAccount,
  updateSiteSetting,
} from "./actions";

export const dynamic = "force-dynamic";

const SETTING_LABELS: Record<string, { label: string; help: string; placeholder: string }> = {
  whatsapp_number: {
    label: "WhatsApp number",
    help: "Digits only, with country code (e.g. 923001234567). Customers use this to send payment screenshots.",
    placeholder: "923001234567",
  },
  support_email: {
    label: "Support email",
    help: "Shown publicly on the Contact page.",
    placeholder: "hello@batsols.com",
  },
  bank_transfer_note: {
    label: "Bank transfer note",
    help: "Extra line shown under the transfer instructions on a customer's order page.",
    placeholder: "Please allow up to 24 hours for confirmation.",
  },
  download_link_ttl_sec: {
    label: "Download link lifetime (seconds)",
    help: "How long a generated installer download link stays valid before it expires.",
    placeholder: "300",
  },
};

export default async function AdminSettingsPage() {
  const [bankAccounts, settings] = await Promise.all([getAllBankAccounts(), getSiteSettings()]);

  return (
    <div className="flex flex-col gap-10">
      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold text-ink-950">Bank Accounts</h2>
        <p className="mb-6 text-sm text-ink-500">
          Shown to customers at checkout and on their order page when they pay by bank transfer.
          Only active accounts are offered.
        </p>

        <div className="flex flex-col gap-6">
          {bankAccounts.map((acc) => (
            <details key={acc.id} className="rounded-xl border border-ink-100 p-4" open={!acc.is_active}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="text-sm font-medium text-ink-900">
                  {acc.label} <span className="text-ink-400">&middot; {acc.bank_name}</span>
                </span>
                <span className={`badge ${acc.is_active ? "bg-green-100 text-green-700" : "bg-ink-100 text-ink-600"}`}>
                  {acc.is_active ? "Active" : "Inactive"}
                </span>
              </summary>
              <form action={updateBankAccount.bind(null, acc.id)} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field name="label" label="Label" defaultValue={acc.label} />
                <Field name="bank_name" label="Bank name" defaultValue={acc.bank_name} />
                <Field name="account_title" label="Account title" defaultValue={acc.account_title} />
                <Field name="account_number" label="Account number" defaultValue={acc.account_number} />
                <Field name="iban" label="IBAN (optional)" defaultValue={acc.iban ?? ""} />
                <Field name="branch" label="Branch (optional)" defaultValue={acc.branch ?? ""} />
                <div className="sm:col-span-2">
                  <label className="label">Instructions (optional)</label>
                  <textarea name="instructions" defaultValue={acc.instructions ?? ""} className="field min-h-[70px]" />
                </div>
                <div className="flex items-center gap-2">
                  <input id={`active-${acc.id}`} name="is_active" type="checkbox" defaultChecked={acc.is_active} className="h-4 w-4 rounded border-ink-300" />
                  <label htmlFor={`active-${acc.id}`} className="text-sm text-ink-700">Active (offered at checkout)</label>
                </div>
                <div className="flex items-end justify-end gap-3 sm:col-span-2">
                  <button className="btn-secondary py-1.5 text-xs">Save</button>
                </div>
              </form>
              <form action={deleteBankAccount.bind(null, acc.id)} className="mt-2">
                <button className="text-xs text-red-600 hover:text-red-700">Remove this account</button>
              </form>
            </details>
          ))}

          {bankAccounts.length === 0 && (
            <p className="text-sm text-ink-500">
              No bank accounts yet — add one below. Bank Transfer won't be offered at checkout until at least one is active.
            </p>
          )}
        </div>

        <details className="mt-6 rounded-xl border border-dashed border-ink-200 p-4">
          <summary className="cursor-pointer text-sm font-medium text-ink-800">Add a bank account</summary>
          <form action={createBankAccount} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field name="label" label="Label" placeholder="e.g. Main account" />
            <Field name="bank_name" label="Bank name" placeholder="e.g. Meezan Bank" />
            <Field name="account_title" label="Account title" placeholder="e.g. Badar Ud Duja" />
            <Field name="account_number" label="Account number" placeholder="e.g. 0123456789" />
            <Field name="iban" label="IBAN (optional)" />
            <Field name="branch" label="Branch (optional)" />
            <div className="sm:col-span-2">
              <label className="label">Instructions (optional)</label>
              <textarea name="instructions" className="field min-h-[70px]" />
            </div>
            <div className="flex items-center gap-2">
              <input id="new-active" name="is_active" type="checkbox" defaultChecked className="h-4 w-4 rounded border-ink-300" />
              <label htmlFor="new-active" className="text-sm text-ink-700">Active (offered at checkout)</label>
            </div>
            <div className="flex items-end justify-end sm:col-span-2">
              <button className="btn-primary py-1.5 text-xs">Add Account</button>
            </div>
          </form>
        </details>
      </section>

      <section className="card p-6">
        <h2 className="mb-1 text-lg font-semibold text-ink-950">Site Settings</h2>
        <p className="mb-6 text-sm text-ink-500">Change these anytime — no code deploy needed.</p>
        <div className="flex flex-col gap-6">
          {(Object.keys(SETTING_LABELS) as (keyof typeof SETTING_LABELS)[]).map((key) => {
            const meta = SETTING_LABELS[key];
            return (
              <form key={key} action={updateSiteSetting.bind(null, key as any)} className="flex flex-col gap-1.5 border-t border-ink-100 pt-5 first:border-t-0 first:pt-0">
                <label className="label">{meta.label}</label>
                <div className="flex flex-wrap gap-3">
                  <input name="value" defaultValue={(settings as any)[key]} placeholder={meta.placeholder} className="field flex-1" />
                  <button className="btn-secondary py-1.5 text-xs">Save</button>
                </div>
                <p className="text-xs text-ink-400">{meta.help}</p>
              </form>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="field" />
    </div>
  );
}
