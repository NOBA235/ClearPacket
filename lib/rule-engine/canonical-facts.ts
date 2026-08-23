import type { ExtractedFact, CanonicalFact, CanonicalFactStatus } from "../schemas";
import { compareNames, isSameDateDifferentFormat, isHarmlessWhitespaceOrCaseDiff } from "./normalize";

/**
 * Node 4 (Canonical Fact Builder) is implemented deterministically in TypeScript rather than as
 * an LLM call. Rationale (see docs/workflow.md "Design decisions"): once Node 3 has extracted
 * per-document facts under a controlled field vocabulary, grouping "the same applicant
 * attribute" is a matching problem over that fixed vocabulary, not a language-understanding
 * problem — and getting harmless-vs-meaningful normalization exactly right (case, whitespace,
 * date format, name components) is precisely the kind of judgment that should be reproducible
 * and testable, not resampled from a model on every run. Spec only mandates node 5 be
 * non-LLM; this extends the same reasoning one node earlier for the parts of node 4 that are
 * mechanical. It never resolves a *meaningful* conflict automatically — that stays with the
 * student via Node 8, exactly as required.
 */

// Fields where cross-document identity comparison uses name-aware token comparison.
const NAME_FIELDS = new Set(["full_name", "account_holder_name"]);
// Fields that are dates and should tolerate format differences when compared cross-document.
const DATE_FIELDS = new Set(["date_of_birth"]);
// Fields with known abbreviation mappings that are safe to treat as identical.
const INSTITUTION_ABBREVIATIONS: Record<string, string> = {
  "nit nagaland": "national institute of technology nagaland",
  "nit": "national institute of technology",
};

/**
 * Only these fields represent a claim about the SAME applicant attribute that should hold
 * across every document it appears on — a name or a date of birth genuinely should match
 * everywhere. Document-specific metadata (an income certificate's own issue/expiry date, a
 * transcript's own GPA or page count, a bank statement's own statement date) has no reason to
 * match a DIFFERENT document's version of a same-named field, and grouping those together
 * produced false "conflicts" between two independently-valid documents. Those fields are
 * checked individually, per document, by their own dedicated rule-engine checks instead (see
 * engine.ts: checkCertificateExpiration, checkFinancialYear, checkFieldRuleRequirements,
 * checkPageCount).
 */
const CROSS_DOCUMENT_COMPARABLE_FIELDS = new Set(["full_name", "date_of_birth", "address", "account_holder_name", "institution"]);

export function buildCanonicalFacts(facts: ExtractedFact[]): CanonicalFact[] {
  const byField = new Map<string, ExtractedFact[]>();
  for (const fact of facts) {
    if (fact.normalizedValue === null) continue; // nothing to compare
    if (!CROSS_DOCUMENT_COMPARABLE_FIELDS.has(fact.field)) continue;
    const key = fact.field;
    if (!byField.has(key)) byField.set(key, []);
    byField.get(key)!.push(fact);
  }

  const result: CanonicalFact[] = [];
  for (const [field, group] of byField.entries()) {
    result.push(buildCanonicalFactForField(field, group));
  }
  return result;
}

function buildCanonicalFactForField(field: string, group: ExtractedFact[]): CanonicalFact {
  const observations = group.map((f) => ({
    value: f.normalizedValue,
    document: f.documentId,
    factId: f.id,
  }));

  const distinctValues = Array.from(new Set(group.map((f) => String(f.normalizedValue))));

  if (distinctValues.length <= 1) {
    return { field, observations, status: "agree", requiresHumanConfirmation: false, confirmedValue: null, confirmedByUser: false, normalizationNote: null };
  }

  let status: CanonicalFactStatus = "conflict";
  let note: string | null = null;

  if (distinctValues.length === 2) {
    const [a, b] = distinctValues as [string, string];
    if (NAME_FIELDS.has(field)) {
      const cmp = compareNames(a, b);
      if (cmp === "harmless") { status = "harmless_variation"; note = "Case/whitespace difference only."; }
      else { status = "conflict"; note = "Name component count or spelling differs — requires review."; }
    } else if (DATE_FIELDS.has(field)) {
      if (isSameDateDifferentFormat(a, b)) { status = "harmless_variation"; note = "Same calendar date, different format."; }
      else { status = "conflict"; }
    } else if (isHarmlessWhitespaceOrCaseDiff(a, b)) {
      status = "harmless_variation";
      note = "Whitespace/case difference only.";
    } else if (field === "institution") {
      const na = INSTITUTION_ABBREVIATIONS[a.trim().toLowerCase()] ?? a.trim().toLowerCase();
      const nb = INSTITUTION_ABBREVIATIONS[b.trim().toLowerCase()] ?? b.trim().toLowerCase();
      if (na === nb) { status = "harmless_variation"; note = "Known institution abbreviation."; }
      else { status = "conflict"; note = "Institution name differs with no known abbreviation mapping — requires review."; }
    } else {
      status = "conflict";
    }
  }

  return {
    field,
    observations,
    status,
    requiresHumanConfirmation: status === "conflict",
    confirmedValue: null,
    confirmedByUser: false,
    normalizationNote: note,
  };
}
