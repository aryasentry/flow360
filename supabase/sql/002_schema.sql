create table if not exists accounts (
  id text primary key,
  name text not null,
  segment text not null,
  domain text not null default 'healthcare_staffing',
  health text default 'unknown',
  renewal_date date,
  description text default '',
  supports_candidates boolean default false,
  primary_user text default 'Account Manager',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table accounts add column if not exists domain text not null default 'healthcare_staffing';
alter table accounts add column if not exists description text default '';
alter table accounts add column if not exists supports_candidates boolean default false;
alter table accounts add column if not exists primary_user text default 'Account Manager';

create table if not exists contacts (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  name text not null,
  role text,
  influence text,
  sentiment text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists job_reqs (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  title text not null,
  openings int default 1,
  start_date date,
  urgency text,
  status text default 'open',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists candidates (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  name text not null,
  role text,
  availability_date date,
  compliance_status text,
  credentialing_status text default 'unknown',
  bgv_status text default 'not_started',
  fit_score int default 70 check (fit_score between 0 and 100),
  rate_variance_percent numeric,
  missing_items jsonb default '[]'::jsonb,
  risk_flags jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table candidates add column if not exists account_id text references accounts(id) on delete cascade;
alter table candidates add column if not exists credentialing_status text default 'unknown';
alter table candidates add column if not exists bgv_status text default 'not_started';
alter table candidates add column if not exists fit_score int default 70 check (fit_score between 0 and 100);
alter table candidates add column if not exists missing_items jsonb default '[]'::jsonb;
alter table candidates add column if not exists risk_flags jsonb default '[]'::jsonb;

create table if not exists source_entries (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  collection text not null check (collection in ('crm', 'interactions', 'knowledge', 'risks', 'candidates')),
  source_type text not null,
  title text not null,
  content text not null,
  fields jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists interactions (
  id text primary key,
  account_id text references accounts(id) on delete cascade,
  title text not null,
  source_type text not null,
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists documents (
  id text primary key,
  account_id text not null,
  title text not null,
  source_type text not null,
  content text not null,
  storage_path text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists document_chunks (
  id text primary key,
  document_id text references documents(id) on delete cascade,
  account_id text not null,
  chunk_index int not null,
  content text not null,
  embedding vector(768),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists agent_runs (
  id text primary key,
  account_id text not null,
  objective text,
  status text default 'completed',
  analysis jsonb default '{}'::jsonb,
  agent_trace jsonb default '[]'::jsonb,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists recommendations (
  id text primary key,
  account_id text not null,
  run_id text references agent_runs(id) on delete set null,
  title text not null,
  action text not null,
  category text not null,
  priority text not null check (priority in ('critical', 'high', 'medium', 'low')),
  owner_role text not null,
  due_date text not null,
  confidence int not null check (confidence between 0 and 100),
  rationale text not null,
  evidence jsonb default '[]'::jsonb,
  business_metric text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

create table if not exists recommendation_feedback (
  id text primary key,
  recommendation_id text references recommendations(id) on delete cascade,
  decision text not null check (decision in ('approved', 'rejected')),
  reviewer text not null,
  notes text,
  created_at timestamptz default now()
);

create table if not exists action_executions (
  id text primary key,
  recommendation_id text references recommendations(id) on delete cascade,
  account_id text references accounts(id) on delete cascade,
  title text not null,
  owner_role text,
  status text not null default 'queued',
  draft text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists memory_cards (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  title text not null,
  memory_type text not null check (memory_type in ('raw', 'semantic', 'episodic', 'profile', 'rule')),
  summary text not null,
  confidence int default 80 check (confidence between 0 and 100),
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists business_rules (
  id text primary key,
  name text not null,
  domain text not null,
  rule_type text not null,
  condition text not null,
  action text not null,
  severity text not null default 'medium',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_documents_account_id on documents(account_id);
create index if not exists idx_chunks_account_id on document_chunks(account_id);
create index if not exists idx_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists idx_recommendations_account_status on recommendations(account_id, status);
create index if not exists idx_memory_entity on memory_cards(entity_type, entity_id);
create index if not exists idx_source_entries_account_collection on source_entries(account_id, collection);
create index if not exists idx_candidates_account_id on candidates(account_id);
create index if not exists idx_action_executions_account_id on action_executions(account_id);
