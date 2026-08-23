-- ClearPacket initial schema.
-- Every user-owned table carries a `user_id uuid references auth.users(id)` column and an RLS
-- policy scoped to `auth.uid() = user_id`. Nothing in this file grants the anon or authenticated
-- roles access to another user's rows under any circumstance — see docs/privacy-and-limitations.md.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "profiles: user can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "profiles: user can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "profiles: user can insert own profile" on profiles
  for insert with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- audits
-- ---------------------------------------------------------------------------
create table audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled audit',
  status text not null default 'draft' check (status in ('draft', 'processing', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table audits enable row level security;

create policy "audits: owner full access" on audits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- audit_documents
-- ---------------------------------------------------------------------------
create table audit_documents (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  sha256_hash text not null,
  document_type text,
  classification_confidence numeric(4,3),
  classification_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table audit_documents enable row level security;

create policy "audit_documents: owner full access" on audit_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- workflow_runs
-- ---------------------------------------------------------------------------
create table workflow_runs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workflow_version text not null default 'v1',
  model text not null default 'gemini-2.5-flash',
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

alter table workflow_runs enable row level security;

create policy "workflow_runs: owner full access" on workflow_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- workflow_node_runs  (owned indirectly via workflow_runs -> audits.user_id;
-- denormalized user_id kept here too so the RLS policy stays a simple, fast column check)
-- ---------------------------------------------------------------------------
create table workflow_node_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references workflow_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  node_name text not null,
  prompt_version text,
  input_manifest jsonb,
  validated_output jsonb,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  latency_ms integer,
  created_at timestamptz not null default now()
);

alter table workflow_node_runs enable row level security;

create policy "workflow_node_runs: owner full access" on workflow_node_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- requirements
-- ---------------------------------------------------------------------------
create table requirements (
  id text not null,
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  description text not null,
  required boolean not null,
  applies_when text,
  document_type text,
  field text,
  operator text,
  expected_value text,
  source_document text not null,
  source_page integer,
  source_text text not null,
  confidence numeric(4,3) not null,
  primary key (audit_id, id)
);

alter table requirements enable row level security;

create policy "requirements: owner full access" on requirements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- extracted_facts
-- ---------------------------------------------------------------------------
create table extracted_facts (
  id text not null,
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  document_type text not null,
  field text not null,
  raw_value text,
  normalized_value text,
  source_page integer,
  evidence_text text,
  confidence numeric(4,3) not null,
  readable boolean not null,
  requires_human_confirmation boolean not null default false,
  primary key (audit_id, id)
);

alter table extracted_facts enable row level security;

create policy "extracted_facts: owner full access" on extracted_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- canonical_facts
-- ---------------------------------------------------------------------------
create table canonical_facts (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  field text not null,
  observations jsonb not null,
  resolution_status text not null check (resolution_status in ('agree', 'harmless_variation', 'conflict', 'insufficient_evidence')),
  confirmed_value text,
  confirmed_by_user boolean not null default false
);

alter table canonical_facts enable row level security;

create policy "canonical_facts: owner full access" on canonical_facts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- findings
-- ---------------------------------------------------------------------------
create table findings (
  id text not null,
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id text,
  severity text not null check (severity in ('critical', 'warning', 'review', 'passed')),
  category text not null,
  title text not null,
  explanation text not null,
  affected_documents text[] not null default '{}',
  evidence_fact_ids text[] not null default '{}',
  source_requirement_evidence text,
  confidence numeric(4,3) not null,
  status text not null check (status in ('candidate', 'verified', 'rejected', 'human_review')),
  origin text not null default 'deterministic' check (origin in ('deterministic', 'adversarial')),
  primary key (audit_id, id)
);

alter table findings enable row level security;

create policy "findings: owner full access" on findings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- clarification_questions
-- ---------------------------------------------------------------------------
create table clarification_questions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references audits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question text not null,
  related_fact_ids text[] not null default '{}',
  answer text,
  answered_at timestamptz
);

alter table clarification_questions enable row level security;

create policy "clarification_questions: owner full access" on clarification_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- benchmark_runs (not per-user data — evaluation harness output; readable by any
-- authenticated user so the /benchmark page can show results, but only writable by the
-- service role from the eval CLI, never from the browser)
-- ---------------------------------------------------------------------------
create table benchmark_runs (
  id uuid primary key default gen_random_uuid(),
  packet_id text not null,
  approach text not null check (approach in ('baseline', 'clearpacket')),
  model text not null,
  run_number integer not null,
  metrics jsonb not null,
  raw_output_path text not null,
  created_at timestamptz not null default now()
);

alter table benchmark_runs enable row level security;

create policy "benchmark_runs: any authenticated user can read" on benchmark_runs
  for select using (auth.role() = 'authenticated');
-- Intentionally NO insert/update/delete policy for authenticated/anon — only the service role
-- (used server-side by `npm run eval:all`, never exposed to the browser) can write these rows.

-- ---------------------------------------------------------------------------
-- Storage: private bucket for uploaded packet documents.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('audit-documents', 'audit-documents', false)
  on conflict (id) do nothing;

create policy "audit-documents: owner can read own files" on storage.objects
  for select using (bucket_id = 'audit-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audit-documents: owner can upload own files" on storage.objects
  for insert with check (bucket_id = 'audit-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audit-documents: owner can delete own files" on storage.objects
  for delete using (bucket_id = 'audit-documents' and (storage.foldername(name))[1] = auth.uid()::text);
