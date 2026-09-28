// Bank-transfer / WhatsApp details shown on the payment-pending page. These
// are plain business details (not secrets), configured as env vars so they
// can be changed without a code deploy. Falls back to a visible placeholder
// so an unset value is obvious instead of silently showing "undefined".

function envOr(value: string | undefined, placeholder: string) {
  return value && value.trim() !== "" ? value : placeholder;
}

export const bankDetails = {
  bankName: envOr(process.env.NEXT_PUBLIC_BANK_NAME, "Add NEXT_PUBLIC_BANK_NAME"),
  accountName: envOr(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NAME, "Add NEXT_PUBLIC_BANK_ACCOUNT_NAME"),
  accountNumber: envOr(process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER, "Add NEXT_PUBLIC_BANK_ACCOUNT_NUMBER"),
  iban: process.env.NEXT_PUBLIC_BANK_IBAN || "",
  swift: process.env.NEXT_PUBLIC_BANK_SWIFT || "",
};

export const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
export const whatsappLink = whatsappNumber
  ? `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, "")}`
  : "";
