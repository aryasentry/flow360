insert into accounts (id, name, segment, health, renewal_date, metadata)
values
  (
    'acct-northstar-health',
    'Northstar Health Network',
    'Healthcare staffing',
    'amber',
    '2026-08-31',
    '{"renewal_exposure":"1.8M","critical_reqs":18,"primary_sponsor":"Maya Rao"}'
  )
on conflict (id) do update set
  name = excluded.name,
  segment = excluded.segment,
  health = excluded.health,
  renewal_date = excluded.renewal_date,
  metadata = excluded.metadata,
  updated_at = now();

insert into contacts (id, account_id, name, role, influence, sentiment, metadata)
values
  ('contact-maya-rao', 'acct-northstar-health', 'Maya Rao', 'VP Workforce Operations', 'executive sponsor', 'amber', '{}'),
  ('contact-daniel-iyer', 'acct-northstar-health', 'Daniel Iyer', 'CFO', 'economic buyer', 'cost-sensitive', '{}')
on conflict (id) do update set sentiment = excluded.sentiment;

insert into job_reqs (id, account_id, title, openings, start_date, urgency, status, metadata)
values
  ('req-icu-rn-july', 'acct-northstar-health', 'ICU Nurse', 12, '2026-07-05', 'critical', 'open', '{"shift_mix":"days and nights"}'),
  ('req-epic-analyst-july', 'acct-northstar-health', 'Epic Analyst', 4, '2026-07-08', 'high', 'open', '{"module":"clinical workflows"}')
on conflict (id) do update set openings = excluded.openings, urgency = excluded.urgency, status = excluded.status;

insert into candidates (id, name, role, availability_date, compliance_status, rate_variance_percent, metadata)
values
  ('cand-priya-n', 'Priya N.', 'ICU RN', '2026-07-02', 'license verification pending', 8, '{"strength":"strongest ICU candidate"}'),
  ('cand-marcus-lee', 'Marcus Lee', 'ICU RN', '2026-07-08', 'fully credentialed', 0, '{"shift":"nights"}'),
  ('cand-elena-cruz', 'Elena Cruz', 'ICU RN', '2026-07-04', 'missing flu attestation', 14, '{}'),
  ('cand-asha-k', 'Asha K.', 'ICU RN', '2026-07-01', 'fully compliant', 4, '{"blocker":"relocation confirmation"}')
on conflict (id) do update set compliance_status = excluded.compliance_status;

insert into documents (id, account_id, title, source_type, content, metadata)
values
  (
    'doc-crm-northstar-history',
    'acct-northstar-health',
    'CRM Account History - Northstar Health',
    'crm_history',
    'Northstar Health is a strategic healthcare staffing account with 38 active facilities. Renewal date: August 31. Last quarter there were two SLA misses caused by late license verification and incomplete background checks. Account sentiment moved from green to amber after the May escalation.',
    '{}'
  ),
  (
    'doc-staffing-playbook',
    'global',
    'Strategic Staffing Escalation Playbook',
    'playbook',
    'If a strategic account has renewal within 90 days and an SLA breach risk, create an executive check-in within 48 hours. For critical healthcare roles starting within 5 days, credentialing blockers must be escalated to compliance lead before candidate presentation.',
    '{}'
  ),
  (
    'doc-credentialing-checklist',
    'global',
    'Healthcare Credentialing Checklist',
    'policy',
    'Required before candidate submission: active license verification, background check, immunization attestation, facility-specific compliance packet, shift preference confirmation, and start-date availability.',
    '{}'
  )
on conflict (id) do update set content = excluded.content;

insert into memory_cards (id, entity_type, entity_id, title, memory_type, summary, confidence)
values
  ('mem-profile-northstar', 'account', 'acct-northstar-health', 'Account Profile', 'profile', 'Strategic healthcare staffing account with renewal on August 31, amber sentiment, and high sensitivity to credentialing misses.', 91),
  ('mem-rule-healthcare-critical', 'account', 'acct-northstar-health', 'Critical Healthcare SLA Rule', 'rule', 'For starts within 5 days, credentialing blockers must be escalated before candidate presentation.', 95),
  ('mem-episodic-may-escalation', 'account', 'acct-northstar-health', 'May Escalation Pattern', 'episodic', 'A prior late license verification caused stakeholder frustration and reduced account sentiment.', 88)
on conflict (id) do update set summary = excluded.summary, confidence = excluded.confidence, updated_at = now();

insert into business_rules (id, name, domain, rule_type, condition, action, severity)
values
  (
    'rule-critical-credentialing',
    'Critical healthcare credentialing escalation',
    'healthcare_staffing',
    'sla_risk',
    'Role starts within 5 days and compliance item is unresolved',
    'Escalate to compliance lead before presenting candidate',
    'critical'
  ),
  (
    'rule-renewal-risk-checkin',
    'Strategic account renewal protection',
    'staffing_account_management',
    'renewal_risk',
    'Renewal is within 90 days and account health is amber or red',
    'Schedule executive check-in within 48 hours',
    'high'
  )
on conflict (id) do update set action = excluded.action, severity = excluded.severity;

