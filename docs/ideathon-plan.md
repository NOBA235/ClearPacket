# Ideathon plan

## Problem

Scholarship and grant applications are frequently rejected — or delayed for a resubmission cycle
— not because the applicant is ineligible, but because of administrative errors: a name that
doesn't match across two government-issued documents, an income certificate issued for the wrong
financial year, a missing signature, an expired certificate, a transcript uploaded with a page
missing. These are avoidable, mechanical mistakes, not judgment calls — but they're easy to miss
when an applicant is manually cross-referencing a dense official notice against half a dozen
scanned PDFs, often for the first time, often under deadline pressure.

## Affected users

First-generation and rural applicants are disproportionately affected: they're less likely to
have a school counselor, an older sibling, or a paid consultant who has been through the process
before and knows to double-check these specific things. The same defect that a well-resourced
applicant catches in five minutes with a second pair of eyes can silently disqualify an applicant
who has no one to ask.

## Root causes

1. Official notices are dense, legalistic documents that bury conditional requirements
   ("required *if* SC/ST/OBC") inside paragraphs of eligibility text.
2. Cross-document consistency (does this name match that name, is this certificate still valid
   for this program's specific financial-year requirement) is tedious, easy-to-skip manual work.
3. There is no feedback loop before submission — applicants usually only learn about a defect
   after rejection, if they're told the specific reason at all.

## Value proposition

An audit that reads the *specific* official notice for *this* scholarship — not generic
knowledge about scholarships in general — and checks the applicant's actual packet against it,
citing exact evidence for every finding, before submission. Explicitly not a black-box "your
application is 73% likely to be approved" score: a checklist the applicant can act on, each item
traceable to the exact sentence in the notice and the exact document it came from.

## Customer segments

- **Direct-to-student**, freemium: one free audit, paid for repeated/multiple-scholarship use.
- **Institutional**: schools, NGOs, and scholarship-granting trusts that want to reduce their own
  administrative rejection/resubmission overhead and could offer ClearPacket to applicants as a
  pre-submission step.

## Channels

School counselors and NGO partners (high-trust distribution to the highest-need segment),
scholarship-trust partnerships (embed a "pre-check with ClearPacket" link directly in the
official notice), and organic/search for students actively searching a specific scholarship name.

## Customer relationships

Primarily self-serve product usage. For institutional customers, a lightweight account manager
relationship during onboarding (helping a trust structure their notice so Node 1 extracts it
cleanly) and ongoing support.

## Revenue streams

- Freemium subscription for individual students (first audit free, then per-audit or monthly).
- Per-seat or per-program licensing for institutional partners (schools, NGOs, trusts).
- No advertising, no selling applicant data — see `docs/privacy-and-limitations.md`.

## Key resources

The 9-node workflow and its evaluation harness (this repository), a growing library of
scholarship notices already compiled into requirement manifests (each one gets cheaper to
support the second time a similar notice appears), and the trust relationships with schools/NGOs
that provide distribution.

## Key activities

Maintaining and improving the workflow's precision/recall (the benchmark lab in this repo is the
mechanism for that), onboarding new scholarship notices, and building the institutional
partnership channel.

## Key partners

Scholarship-granting trusts and government scholarship portals (structural requirement-manifest
partnerships), schools and NGOs (distribution), and Google/Gemini (the underlying model
infrastructure this project is built on).

## Cost structure

Primarily Gemini API usage (proportional to audits run — the benchmark's token-usage tracking in
`eval/runner.ts` is the mechanism for keeping this visible and optimizable) and Supabase
hosting/storage. No dedicated OCR infrastructure cost beyond the PDF-parsing library already in
the stack, unless a future version adds true image-based OCR for handwritten/scanned documents.

## Privacy risks

Applicant documents are sensitive (identity documents, financial information, sometimes category
certificates that reveal caste/tribal status). See `docs/privacy-and-limitations.md` for the
concrete technical mitigations (private storage, strict RLS, server-only API keys, no training
use). The main *residual* privacy risk is institutional: a school or NGO partner account could,
if misconfigured, gain more visibility into individual student data than intended — this needs
explicit, narrow institutional-role scoping in any future multi-tenant admin view, which does not
exist in this MVP.

## Market alternatives

Manual review (a counselor, teacher, or family member checking the packet by hand — the current
default, and the thing this product is trying to make unnecessary rather than replace for
students who already have someone to ask), generic AI chatbots (asked ad hoc, with no structured
citation, no verification stage, and no persistent memory of the specific notice's requirements),
and scholarship-consulting services (paid, and out of reach for the students this product is
trying hardest to serve).

## Validation plan

1. Run the benchmark lab against real Gemini calls (`npm run eval:all` with a real
   `GEMINI_API_KEY`) to get real precision/recall/hallucination numbers before any user-facing
   claim about accuracy.
2. Pilot with a single real (or realistic, permission-cleared) scholarship notice and a small
   group of real applicants via one school/NGO partner, comparing self-reported "did this catch
   something I would have missed" against actual resubmission/rejection rates for that program.
3. Track false-positive burden specifically (Packet A's role in the benchmark) — a tool that
   cries wolf on a clean packet erodes trust fast, so this metric matters as much as recall.

## Future roadmap

True OCR for handwritten/scanned documents (this MVP's low-confidence handling, exercised in
Packet C, is designed to extend directly into real OCR uncertainty once that's added), a
requirement-manifest library shared (with permission) across scholarship trusts to reduce
first-time-setup cost per program, and an institutional dashboard for trusts to see aggregate
(never individually identifying) common-defect patterns across applicants, to improve their own
notice's clarity.
