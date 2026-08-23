# Workflow architecture

See `diagrams/workflow.svg` / `diagrams/workflow.png` for the visual version, and
`diagrams/workflow.mmd` for the Mermaid source.

## The pipeline, in one paragraph

An audit runs 9 nodes in sequence. Nodes 1-3 turn documents into structured data (requirements,
document classifications, extracted facts) using Gemini 2.5 Flash with `responseSchema`-enforced
JSON output. Nodes 4-5 are plain, network-free TypeScript that groups facts and runs 11+
deterministic checks against them — no model call, no chance of hallucination, fully unit
tested. Node 6 is a second, adversarial Gemini pass whose only job is to try to find what Node 5
missed; it cannot publish anything itself. Node 7 is an independent Gemini pass that
cross-examines every candidate from *both* Node 5 and Node 6 against 7 explicit questions before
it's allowed to become a real finding — and a final deterministic safety net rejects anything
that still has no evidence citation, no matter what Node 7 concluded. Node 8 asks the student the
minimum necessary clarifying questions. Node 9 turns everything that survived into a prioritized,
plain-language checklist.

## Why Node 4 and 5 are plain TypeScript

The spec requires Node 5 to be deterministic. This project extends that same reasoning one node
earlier, to the mechanical parts of Node 4: once Node 3 has extracted per-document facts under a
*fixed, controlled field vocabulary* (`full_name`, `date_of_birth`, `gpa_or_marks`, etc.),
deciding whether "Yimkong Jamir" and "Yimkong L. Jamir" are the same person, or whether "15 June
2025" and "15/06/2025" are the same date, is a normalization problem with a right answer — not a
judgment call that benefits from being resampled from a model on every run. Getting this exactly
right (case/whitespace differences are harmless; a missing or extra name component is not; a
known institution abbreviation is harmless; an unrecognized abbreviation is not) is precisely the
kind of thing that should be reproducible, unit-testable, and *not* a source of run-to-run
variance. See `tests/normalize.test.ts` and `tests/rule-engine.test.ts`.

One consequence worth calling out explicitly, because it was a real bug caught during
development (see `docs/evaluation.md` → "Bugs the benchmark process caught"): Node 4 only
compares fields that represent a genuine claim about the *same applicant attribute* across
documents — name, date of birth, address, account-holder name, institution. It deliberately does
**not** compare, say, an income certificate's expiry date against a residence certificate's
expiry date, because those are two independently-valid documents with no reason to share a date.
Document-specific metadata like expiry dates, financial years, GPA, and page counts are each
checked individually, per document, by their own dedicated Node 5 check instead.

## Why Node 7 has a deterministic backstop

Independent verification is the spec's central safety property ("No candidate becomes a final
finding without this stage"). Trusting a single LLM call to be the *only* thing standing between
an unsupported claim and the student's checklist felt like exactly the kind of single point of
failure this project is trying to eliminate elsewhere. `rejectUnsupportedFindings` (plain
TypeScript, `lib/rule-engine/reject-unsupported.ts`) runs after Node 7 (real or mock) and
force-rejects any finding — regardless of Node 7's verdict — that carries neither an
`evidenceFactIds` citation nor an exact `sourceRequirementEvidence` quote. See
`tests/rule-engine.test.ts` → "Test 11".

## Why conditional requirements have two different severities

A requirement like "Category Certificate required if SC/ST/OBC" can't always be resolved the
same way. If nothing in the packet says which category the applicant belongs to, the honest
answer is "we don't know," and the finding is a `review`-severity escalation to the student —
not a hard failure (Packets A and B). But if the applicant's own submitted category
*affirmatively* matches the condition (Packet C), and the required document still isn't there,
that's a real, critical finding — not something that needs a human to confirm. The engine
resolves conditions only *toward* requiring a document on affirmative evidence; it never infers a
condition is false from the absence of evidence. See `isConditionAffirmativelyConfirmed` in
`lib/rule-engine/engine.ts`.

## Mock mode vs. real mode

Nodes 1-3 and 6-9 all go through a single `LlmClient` interface (`lib/gemini/types.ts`), so the
exact same node code runs against `GeminiClient` (real API) or `MockGeminiClient` (fixtures). The
orchestrator (`lib/workflow/run-workflow.ts`) additionally branches for nodes 6-9 specifically:
in mock mode it uses a small, clearly-documented deterministic policy instead of pretending to
mock genuine LLM judgment (finding more defects, weighing OCR plausibility, phrasing a question).
See the docstring on `runNodes6Through9Mock` in that file, and `docs/evaluation.md` for why this
matters for how you should read the current benchmark numbers.

## Data model

See `supabase/migrations/0001_init.sql` for the full schema. Every user-owned table carries
`user_id uuid references auth.users(id)` and an RLS policy scoped to `auth.uid() = user_id` — see
`docs/privacy-and-limitations.md`.
