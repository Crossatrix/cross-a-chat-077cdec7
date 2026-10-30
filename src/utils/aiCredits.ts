export type CreditBalance = number | "unlimited";

export interface AiCredits {
  text: CreditBalance;
  image: CreditBalance;
}

function parseBalance(value: unknown): CreditBalance | undefined {
  if (typeof value === "string" && value.trim().toLowerCase() === "unlimited") return "unlimited";
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  if (typeof value === "string" && !value.trim()) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function parseAiCredits(data: unknown): AiCredits | undefined {
  if (!data || typeof data !== "object" || !("credits" in data)) return undefined;
  const credits = data.credits;
  if (!credits || typeof credits !== "object") return undefined;
  const text = parseBalance("text" in credits ? credits.text : undefined);
  const image = parseBalance("image" in credits ? credits.image : undefined);
  if (text === undefined || image === undefined) return undefined;
  return { text, image };
}

export function formatCreditBalance(balance: CreditBalance | undefined): string {
  return balance === undefined ? "—" : balance === "unlimited" ? "∞" : String(balance);
}