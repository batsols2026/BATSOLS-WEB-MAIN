export function formatPrice(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function effectivePrice(price: number, salePrice: number | null) {
  return salePrice !== null && salePrice < price ? salePrice : price;
}

export function discountPercent(price: number, salePrice: number | null) {
  if (salePrice === null || salePrice >= price || price === 0) return 0;
  return Math.round(((price - salePrice) / price) * 100);
}
