import { describe, it, expect } from "vitest";
import {
  parseFlexibleDate,
  isSameDateDifferentFormat,
  compareNames,
  isHarmlessWhitespaceOrCaseDiff,
  normalizeFinancialYear,
  financialYearForDate,
} from "../lib/rule-engine/normalize";

describe("Date normalization", () => {
  it("parses ISO dates", () => {
    expect(parseFlexibleDate("2026-03-15")).toBe("2026-03-15");
  });

  it("parses unambiguous DD/MM/YYYY (day > 12)", () => {
    expect(parseFlexibleDate("15/06/2025")).toBe("2025-06-15");
  });

  it("parses 'DD Month YYYY'", () => {
    expect(parseFlexibleDate("15 June 2025")).toBe("2025-06-15");
  });

  it("parses 'Month DD, YYYY'", () => {
    expect(parseFlexibleDate("June 15, 2025")).toBe("2025-06-15");
  });

  it("returns null for unparseable input", () => {
    expect(parseFlexibleDate("not a date")).toBeNull();
  });

  it("recognizes the same calendar date in two different formats as a harmless variation", () => {
    expect(isSameDateDifferentFormat("15 June 2025", "15/06/2025")).toBe(true);
  });

  it("does NOT treat two genuinely different dates as a format variation", () => {
    expect(isSameDateDifferentFormat("14/07/2003", "17/07/2003")).toBe(false);
  });

  it("computes the Indian financial year for a date", () => {
    expect(financialYearForDate("2026-03-15")).toBe("2025-26"); // March -> still prior FY
    expect(financialYearForDate("2026-04-01")).toBe("2026-27"); // April -> new FY starts
  });

  it("normalizes financial-year strings to a canonical form", () => {
    expect(normalizeFinancialYear("2025-26")).toBe("2025-26");
    expect(normalizeFinancialYear("2025-2026")).toBe("2025-26");
  });
});

describe("Name comparison (exact-name mismatch + harmless whitespace)", () => {
  it("flags a missing/extra name component as a conflict, not harmless", () => {
    expect(compareNames("Yimkong Jamir", "Yimkong L. Jamir")).toBe("conflict");
  });

  it("treats case/whitespace-only differences as harmless", () => {
    expect(compareNames("yimkong  jamir", "Yimkong Jamir")).toBe("harmless");
  });

  it("treats identical strings as identical", () => {
    expect(compareNames("Yimkong Jamir", "Yimkong Jamir")).toBe("identical");
  });

  it("flags a same-length but differently-spelled name as a conflict", () => {
    expect(compareNames("Wonthong Yeptho", "W. Yeptho")).toBe("conflict");
  });
});

describe("Harmless whitespace/case diff detection", () => {
  it("detects whitespace-only difference", () => {
    expect(isHarmlessWhitespaceOrCaseDiff("NIT  Nagaland", "NIT Nagaland")).toBe(true);
  });
  it("does not flag genuinely different strings as harmless", () => {
    expect(isHarmlessWhitespaceOrCaseDiff("Kohima", "Chümoukedima")).toBe(false);
  });
});
