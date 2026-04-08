const currencyLocales: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "en-AE",
}

export function formatCurrency(amount: number, currency = "INR") {
  const normalizedCurrency = currency.toUpperCase()
  const locale = currencyLocales[normalizedCurrency] ?? "en-US"

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: normalizedCurrency,
    maximumFractionDigits: 0,
  }).format(amount)
}
