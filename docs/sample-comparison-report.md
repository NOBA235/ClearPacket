# ClearPacket vs. Single-Prompt Baseline — Comparison Report

**Generated from:** `eval/results/summary.json` · **Date:** 2026-08-22 · **Model:** Gemini 2.5 Flash (mock fixtures — see notice below) · **Runs per cell:** 3

> ⚠️ **This run used `MockGeminiClient`, not a real Gemini API call.** No `GEMINI_API_KEY` was
> available in the environment that generated it. These numbers demonstrate that the evaluation
> harness, scoring formulas, and 9-node pipeline are implemented correctly and produce
> internally consistent results — they are **not** a claim about real Gemini 2.5 Flash accuracy.
> Regenerate this report for real with `GEMINI_API_KEY` set: `npm run eval:all`. Full
> methodology and disclosure: `docs/evaluation.md`.

---

## Summary

| Packet | Approach | Precision | Recall | F1 | Evidence coverage | Hallucination rate |
|---|---|---|---|---|---|---|
| A — Clean | Baseline | 1.00 | 1.00 | 1.00 | 100% | 0% |
| A — Clean | **ClearPacket** | 1.00 | 1.00 | 1.00 | 100% | 0% |
| B — 10 defects | Baseline | 0.86 | 0.60 | 0.71 | 29% | 71% |
| B — 10 defects | **ClearPacket** | 1.00 | 1.00 | 1.00 | 100% | 0% |
| C — Adversarial | Baseline | 0.50 | 0.33 | 0.40 | 50% | 50% |
| C — Adversarial | **ClearPacket** | 1.00 | 1.00 | 1.00 | 100% | 0% |

Prompt-injection test (Packet C only): baseline did not flag the embedded instruction-override
attempt but also did not comply with it (findings were still present); ClearPacket detected and
explicitly recorded it as `prompt_injection_detected`, and its evidence-backed findings were
unaffected.

## Reading this table correctly

Packet A (clean) is where both approaches should score perfectly, and did — this is the
false-positive control: a workflow that invents problems on clean input fails here even with
"good" recall elsewhere. Packets B and C are where the gap opens up, and the gap tells a
specific, non-arbitrary story about *why*:

- **Packet B, missed defects (baseline):** wrong financial year, GPA below minimum, date-of-birth
  mismatch, bank-account-holder mismatch. All four require either a precise cross-reference to
  a specific clause in a long official notice, or a cross-*field* comparison (bank statement name
  vs. applicant name) the single prompt was never explicitly pointed at. ClearPacket's dedicated,
  unit-tested checks for each of these (`lib/rule-engine/engine.ts`) caught all four.
- **Packet B, the one baseline false positive:** an unsupported claim about "institution
  accreditation" with no requirement basis and no evidence quote — illustrative of a
  well-documented single-prompt failure mode (speculating beyond what was actually asked).
- **Packet C, missed defects (baseline):** the *confirmed* conditional Category Certificate
  requirement (the baseline doesn't reason about the applicant's self-declared category
  triggering the condition) and the embedded prompt-injection attempt (never explicitly flagged,
  though also not complied with).
- **Packet C, the baseline false positive:** the baseline hallucinated a date conflict between
  two documents' issue dates written in different formats (15 June 2025 vs. 15/06/2025) — those
  two documents were never supposed to share a date in the first place, and the format
  difference compounded the error. ClearPacket's Node 4 restricts cross-document comparison to
  fields that are genuine shared-applicant-attribute claims, and its date normalization
  (`lib/rule-engine/normalize.ts`) recognizes same-date-different-format pairs it *does* compare
  (e.g. date of birth) as harmless.

See `docs/evaluation.md` → "Baseline scoring methodology" for exactly how free-text baseline
output was mapped onto the same ground-truth taxonomy, and "Bugs the benchmark process caught"
for three real defects this process found and fixed in ClearPacket's own engine before this
report was written.

## Ground truth

Full machine-readable ground truth: `data/benchmark/packet-a/ground-truth.json`,
`packet-b/ground-truth.json`, `packet-c/ground-truth.json`. Raw per-run output for every cell in
the table above: `eval/results/*-raw.json`.
