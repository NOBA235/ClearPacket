/**
 * Pure, deterministic normalization helpers. No LLM calls here — everything in this file
 * is unit-testable without a network connection (see tests/normalize.test.ts).
 */

/** Collapses internal whitespace and trims. Case is NOT changed here — see normalizeNameForCompare. */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Returns true if two strings differ only by whitespace and/or case — a "harmless variation"
 * per spec. Anything else (missing/extra tokens, different characters) is NOT harmless.
 */
export function isHarmlessWhitespaceOrCaseDiff(a: string, b: string): boolean {
  const normA = normalizeWhitespace(a).toLowerCase();
  const normB = normalizeWhitespace(b).toLowerCase();
  return normA === normB && a !== b;
}

/**
 * Name comparison per spec: missing or additional name components require review; case/spacing
 * differences alone are harmless. "Yimkong Jamir" vs "Yimkong L. Jamir" -> conflict (extra
 * component). "yimkong  jamir" vs "Yimkong Jamir" -> harmless.
 */
export type NameComparison = "identical" | "harmless" | "conflict";

export function compareNames(a: string, b: string): NameComparison {
  const tokensA = tokenizeName(a);
  const tokensB = tokenizeName(b);
  if (a === b) return "identical";
  if (tokensA.join(" ") === tokensB.join(" ")) return "harmless"; // whitespace/case only
  if (tokensA.length !== tokensB.length) return "conflict"; // missing/additional component
  // same length but different tokens (e.g. typo, different spelling) — treat as conflict;
  // this is a case for human review, not automatic resolution.
  return "conflict";
}

function tokenizeName(name: string): string[] {
  return normalizeWhitespace(name)
    .toLowerCase()
    .replace(/[.,]/g, "")
    .split(" ")
    .filter(Boolean);
}

/**
 * Parses a broad range of human-written date formats into an ISO date (YYYY-MM-DD) or null if
 * unparseable. Supports: DD/MM/YYYY, MM/DD/YYYY (disambiguated by day>12), YYYY-MM-DD,
 * "12 Jan 2024", "January 12, 2024", "12-01-2024".
 */
export function parseFlexibleDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // ISO: 2024-01-12
  let m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));

  // DD/MM/YYYY or MM/DD/YYYY or DD-MM-YYYY
  m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3]);
    // If the first number can't be a month, it must be a day (DD/MM/YYYY) — the common case
    // for this product's audience (Indian government documents).
    if (a > 12) return toIso(year, b, a);
    if (b > 12) return toIso(year, a, b);
    // Ambiguous (both <=12): assume DD/MM/YYYY, the regional default, and flag via caller if needed.
    return toIso(year, b, a);
  }

  // "12 Jan 2024" / "12 January 2024"
  const months = [
    "jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec",
  ];
  m = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})$/);
  if (m) {
    const monthIdx = months.indexOf(m[2]!.slice(0, 3).toLowerCase());
    if (monthIdx >= 0) return toIso(Number(m[3]), monthIdx + 1, Number(m[1]));
  }

  // "January 12, 2024" / "Jan 12 2024"
  m = trimmed.match(/^([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const monthIdx = months.indexOf(m[1]!.slice(0, 3).toLowerCase());
    if (monthIdx >= 0) return toIso(Number(m[3]), monthIdx + 1, Number(m[2]));
  }

  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** True if two date strings represent the same calendar date once parsed, regardless of format. */
export function isSameDateDifferentFormat(a: string, b: string): boolean {
  const isoA = parseFlexibleDate(a);
  const isoB = parseFlexibleDate(b);
  if (!isoA || !isoB) return false;
  return isoA === isoB && a !== b;
}

/** Indian financial year runs 1 Apr - 31 Mar, expressed as e.g. "2023-24" or "2023-2024". */
export function financialYearForDate(isoDate: string): string {
  const [yearStr, monthStr] = isoDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}

export function normalizeFinancialYear(value: string): string | null {
  const m = value.trim().match(/^(\d{4})\s*[-\/]\s*(\d{2,4})$/);
  if (!m) return null;
  const startYear = Number(m[1]);
  return `${startYear}-${String(startYear + 1).slice(2)}`;
}
