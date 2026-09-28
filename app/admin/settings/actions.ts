"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SiteSettingKey } from "@/lib/types";

function str(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

export async function createBankAccount(formData: FormData) {
  const supabase = createClient();
  const label = str(formData, "label") ?? "Bank Account";
  const bank_name = str(formData, "bank_name") ?? "";
  const account_title = str(formData, "account_title") ?? "";
  const account_number = str(formData, "account_number") ?? "";

  const { data: existing } = await supabase
    .from("bank_accounts")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("bank_accounts").insert({
    label,
    bank_name,
    account_title,
    account_number,
    iban: str(formData, "iban"),
    branch: str(formData, "branch"),
    instructions: str(formData, "instructions"),
    is_active: formData.get("is_active") === "on",
    sort_order: (existing?.sort_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
}

export async function updateBankAccount(id: string, formData: FormData) {
  const supabase = createClient();
  const { error } = await supabase
    .from("bank_accounts")
    .update({
      label: str(formData, "label") ?? "Bank Account",
      bank_name: str(formData, "bank_name") ?? "",
      account_title: str(formData, "account_title") ?? "",
      account_number: str(formData, "account_number") ?? "",
      iban: str(formData, "iban"),
      branch: str(formData, "branch"),
      instructions: str(formData, "instructions"),
      is_active: formData.get("is_active") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
}

export async function deleteBankAccount(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
}

export async function updateSiteSetting(key: SiteSettingKey, formData: FormData) {
  const supabase = createClient();
  const value = formData.get("value");
  const { error } = await supabase
    .from("site_settings")
    .update({ value: typeof value === "string" ? value : "" })
    .eq("key", key);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
