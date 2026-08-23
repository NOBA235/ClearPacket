# ClearPacket

**Catch the mistake before the application does.**

ClearPacket is a verified AI workflow that audits scholarship application packets before
submission — extracting the official requirements, building a structured fact table from the
student's documents, and producing an evidence-backed correction checklist. It does not decide
eligibility, does not write documents, and does not submit anything.

Built for the Reverie Hacks 2026 ML & Prompt Engineering track.

## Read this first: what's real vs. mock in this build

This repository was assembled in a sandboxed environment with **no network access to Google's
Gemini API or to Supabase** (`generativelanguage.googleapis.com` and `*.supabase.co` are both
unreachable there). Everything that doesn't require those services is real, tested, and
verified working in that environment:

- **The deterministic rule engine (Node 4-5) never touches an LLM** — it's real code, and it's
  what 57 passing tests (`npm test`) mostly exercise.
- **The evaluation harness, metric formulas, and ground-truth scoring are real** — `npm run
  eval:all` genuinely runs the full pipeline and computes genuine precision/recall/F1/evidence
  coverage/hallucination-rate/repeatability/prompt-injection numbers.
- **The Next.js app is real and builds/runs** (`npm run build`, verified in this environment) —
  including a live API route (`/api/demo-audit`) that runs the actual 9-node workflow end to end
  and a `/benchmark` page that renders the actual harness output.
- **What's mocked:** without `GEMINI_API_KEY` set, all 9 LLM calls fall back to
  `MockGeminiClient`, which returns hand-authored fixture data clearly labeled `isMock: true`
  everywhere it appears (API responses, UI badges, docs). This proves the architecture and
  plumbing are correct. It is **not** a claim about real Gemini 2.5 Flash performance. See
  `docs/evaluation.md` for the full, honest breakdown, including three real bugs this process
  caught and fixed.

Add a real `GEMINI_API_KEY` and Supabase project (see Setup below) and every part of this
switches to real, live behavior with no code changes.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY and Supabase values — see Setup below
npm run typecheck
npm test
npm run eval:all              # mock mode without a key; real mode with one
npm run dev                   # http://localhost:3000
```

Try the workflow immediately, no account or Supabase needed: `/audit/new` → "Try it now" runs
the real 9-node pipeline against a seeded benchmark packet via `/api/demo-audit`.

## Setup

### Gemini

1. Get an API key at <https://aistudio.google.com/apikey>.
2. Set `GEMINI_API_KEY` in `.env.local`. Never prefix it `NEXT_PUBLIC_` — it must stay
   server-only (see `docs/privacy-and-limitations.md`).

### Supabase

1. Create a project at <https://supabase.com>.
2. Run the migration: `supabase link --project-ref <your-ref>` then
   `supabase db push` (or paste `supabase/migrations/0001_init.sql` into the SQL editor).
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (Project
   Settings → API). Set `SUPABASE_SERVICE_ROLE_KEY` only if you're running the eval CLI's
   `benchmark_runs` write path — never expose it to the browser.
4. Confirm the `audit-documents` Storage bucket exists (created by the migration) and is
   **not** public.

### Deployment

Any Next.js 16 host works (Vercel, etc.). Set the same three-to-four environment variables
above in your host's dashboard. No other infrastructure is required — there's no separate
backend process; the eval CLI (`npm run eval:*`) is a standalone script you run from your own
machine or CI, not something the deployed app needs at runtime.

## Repository layout

```
app/                    Next.js App Router pages (landing, auth, audit flow, /benchmark)
lib/schemas/            Zod schemas for every node's I/O (Requirement, ExtractedFact, Finding, ...)
lib/prompts/             Every node's exact prompt text (also mirrored in docs/prompts.md)
lib/gemini/              LlmClient interface + real GeminiClient + MockGeminiClient
lib/rule-engine/         Node 4 (canonical facts) + Node 5 (deterministic checks) + safety net — no LLM
lib/workflow/            Node 1-3, 6-9 implementations + the 9-node orchestrator
data/benchmark/          3 synthetic packets, ground truth JSON, oracle fixtures, baseline mock responses
eval/                    metrics.ts (real scoring math) + runner.ts (CLI) + baseline-runner.ts
supabase/migrations/     Full schema + RLS policies
diagrams/                Mermaid source + rendered SVG/PNG
docs/                    workflow.md, prompts.md, evaluation.md, privacy-and-limitations.md, ideathon-plan.md
tests/                   57 passing tests covering schemas, normalization, the rule engine, metrics, and
                         a full mock-mode end-to-end pipeline run
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build (verified passing in this environment) |
| `npm run typecheck` | `tsc --noEmit`, strict mode |
| `npm test` | Run all 57 tests (`npm run test:watch` for watch mode) |
| `npm run lint` | ESLint (0 errors, 0 warnings as of this build) |
| `npm run eval:all` | Run baseline + ClearPacket against all 3 packets, 3x each, write `eval/results/` |
| `npm run eval:baseline` / `eval:clearpacket` | Run just one approach |
| `npm run diagram:render` | Re-render `diagrams/workflow.mmd` to SVG/PNG (needs a local Chrome — see note below) |

## Environment notes for whoever picks this up next

- **Diagram rendering:** `diagrams/workflow.svg` and `.png` in this repo were hand-built (not
  run through `mmdc`/Puppeteer), because the sandbox had no path to download a headless
  Chromium. `npm run diagram:render` will work on a normal machine with Chrome installed, or
  paste `diagrams/workflow.mmd` into <https://mermaid.live> for a quick regenerate.
- **The RLS cross-user-access test** (`tests/rls-cross-user-access.test.ts`) needs a live
  Supabase project and two real user JWTs to actually run — it's skipped by default and
  documents exactly how to run it for real. A static check in the same file (which does run by
  default) confirms every user-owned table's migration SQL has RLS enabled and a
  `user_id = auth.uid()` policy.

## Acceptance criteria checklist

- [x] Upload fictional scholarship requirements — `data/benchmark/official-notice.ts`
- [x] Upload a fictional student packet — 3 packets in `data/benchmark/packet-*`
- [x] Documents classified — Node 2, real prompt + schema (`lib/workflow/node2.ts`)
- [x] Confirm uncertain classifications — `requiresHumanConfirmation` on `DocumentClassification`
- [x] Run the multi-node workflow — `lib/workflow/run-workflow.ts`, exercised via `/api/demo-audit`
- [x] Requirements with exact citations — every `Requirement.sourceText` is a real substring (tested)
- [x] Extracted facts with source evidence — `ExtractedFact.evidenceText`
- [x] Resolve a conflict through human confirmation — Node 8 + `/audit/new` clarification UI
- [x] Verified correction checklist — Node 9 + the deterministic evidence safety net
- [x] Open evidence for every warning — `FindingCard` renders `sourceRequirementEvidence` inline
- [x] Run the baseline prompt on the same packet — `eval/baseline-runner.ts`
- [x] Compare both approaches against ground truth — `/benchmark`, `eval/metrics.ts`
- [x] View actual benchmark metrics — `/benchmark` reads real `eval/results/summary.json`
- [x] Confirm prompt-injection test fails to manipulate the workflow — Packet C, tested directly
- [x] Run tests successfully — 57 passing, `npm test`
- [x] Run the production build successfully — `npm run build`, verified in this environment

## Remaining limitations, stated plainly

- No real Gemini or Supabase calls were exercised during this build (see above) — real accuracy
  numbers require your own API key.
- Rate limiting is not implemented (`docs/privacy-and-limitations.md` → "Known gaps").
- File upload → Supabase Storage wiring in the full `/audit/new` step flow is scaffolded
  (schema, RLS, bucket policy all exist) but the demo path that actually runs today uses seeded
  packets rather than freshly uploaded files, since that's the part testable without a live
  Supabase project.
- OCR/PDF extraction quality on real scanned documents is untested — the benchmark packets use
  plain extracted text, not real scans.
