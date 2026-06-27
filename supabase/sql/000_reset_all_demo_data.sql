-- Flow360 demo data reset script
-- WARNING:
-- Run this only in your hackathon/demo Supabase project.
-- This deletes all application data from Flow360 tables but keeps the table structure,
-- indexes, extensions, and SQL functions intact.
--
-- After running this, you can run:
--   004_seed_data.sql
-- and/or call:
--   POST /ingest/demo
-- to reload demo data.

begin;

truncate table
  action_executions,
  recommendation_feedback,
  recommendations,
  agent_runs,
  memory_cards,
  source_entries,
  document_chunks,
  documents,
  interactions,
  candidates,
  job_reqs,
  contacts,
  business_rules,
  accounts
restart identity cascade;

commit;
