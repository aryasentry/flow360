-- Flow360 V2 demo seed data
-- Run after:
--   001_extensions.sql
--   002_schema.sql
--   003_vector_search.sql

insert into accounts (id, name, segment, domain, health, renewal_date, description, supports_candidates, primary_user, metadata)
values
  (
    'acct-aarogya-health',
    'Aarogya Health Network',
    'Healthcare staffing',
    'healthcare_staffing',
    'amber',
    '2026-08-31',
    'Hospital network with urgent ICU nurse and Epic analyst staffing requirements across Bengaluru, Pune, and Hyderabad.',
    true,
    'Staffing Account Manager',
    '{
      "renewal_exposure":"INR 15.2 Cr",
      "primary_sponsor":"Kavya Raman",
      "economic_buyer":"Rohan Kulkarni",
      "metrics":[
        {"label":"Critical reqs","value":"24","delta":"+8 this week"},
        {"label":"SLA breach risk","value":"High","delta":"4-day start window"},
        {"label":"Renewal exposure","value":"INR 15.2 Cr","delta":"Aug 31 renewal"},
        {"label":"Memory confidence","value":"93%","delta":"18 sources linked"}
      ],
      "risk_trend":[
        {"day":"Mon","risk":64,"confidence":73},
        {"day":"Tue","risk":71,"confidence":78},
        {"day":"Wed","risk":79,"confidence":84},
        {"day":"Thu","risk":86,"confidence":88},
        {"day":"Fri","risk":91,"confidence":93}
      ]
    }'::jsonb
  ),
  (
    'acct-navapay-fintech',
    'NavaPay Fintech',
    'SaaS customer success',
    'saas_customer_success',
    'red',
    '2026-09-20',
    'Enterprise payments SaaS customer with API latency complaints, low adoption, and renewal risk.',
    false,
    'Customer Success Manager',
    '{
      "arr":"INR 9.6 Cr",
      "primary_sponsor":"Suhani Bansal",
      "technical_owner":"Vikram Sethi",
      "metrics":[
        {"label":"Renewal risk","value":"Red","delta":"85 days to renewal"},
        {"label":"Open blockers","value":"7","delta":"3 product escalations"},
        {"label":"ARR at risk","value":"INR 9.6 Cr","delta":"Sep 20 renewal"},
        {"label":"Memory confidence","value":"90%","delta":"15 sources linked"}
      ],
      "risk_trend":[
        {"day":"Mon","risk":58,"confidence":69},
        {"day":"Tue","risk":66,"confidence":74},
        {"day":"Wed","risk":76,"confidence":80},
        {"day":"Thu","risk":82,"confidence":86},
        {"day":"Fri","risk":88,"confidence":90}
      ]
    }'::jsonb
  ),
  (
    'acct-prithvigrid-energy',
    'PrithviGrid Utilities',
    'Energy field service',
    'energy_field_service',
    'amber',
    '2026-10-15',
    'Power distribution client managing transformer maintenance, outage response, technician dispatch, and monsoon safety compliance.',
    false,
    'Field Operations Manager',
    '{
      "contract_value":"INR 22.4 Cr",
      "operations_head":"Harish Nambiar",
      "safety_owner":"Ishita Rao",
      "metrics":[
        {"label":"Open outages","value":"11","delta":"4 critical feeders"},
        {"label":"SLA breach risk","value":"Medium","delta":"Monsoon load surge"},
        {"label":"Contract exposure","value":"INR 22.4 Cr","delta":"Oct 15 renewal"},
        {"label":"Memory confidence","value":"88%","delta":"14 sources linked"}
      ],
      "risk_trend":[
        {"day":"Mon","risk":49,"confidence":64},
        {"day":"Tue","risk":57,"confidence":70},
        {"day":"Wed","risk":63,"confidence":76},
        {"day":"Thu","risk":72,"confidence":82},
        {"day":"Fri","risk":78,"confidence":88}
      ]
    }'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  segment = excluded.segment,
  domain = excluded.domain,
  health = excluded.health,
  renewal_date = excluded.renewal_date,
  description = excluded.description,
  supports_candidates = excluded.supports_candidates,
  primary_user = excluded.primary_user,
  metadata = excluded.metadata,
  updated_at = now();

insert into source_entries (id, account_id, collection, source_type, title, content, fields)
values
  (
    'src-aarogya-crm-account',
    'acct-aarogya-health',
    'crm',
    'crm_account',
    'CRM Account Profile - Aarogya Health Network',
    'Aarogya has 24 urgent healthcare staffing requirements this week. Kavya Raman values reliable starts and Rohan Kulkarni needs premium-rate justification before approval. Account health is amber because a May staffing miss delayed two ICU starts and forced 48 hours of overtime coverage.',
    '{"client_owner":"Kavya Raman","decision_maker":"Rohan Kulkarni","renewal_date":"2026-08-31","contract_value":"INR 15.2 Cr"}'::jsonb
  ),
  (
    'src-aarogya-meeting-june',
    'acct-aarogya-health',
    'interactions',
    'meeting_transcript',
    'Meeting Notes - Aarogya Urgent Staffing Call',
    'Aarogya needs the ICU shortlist by 4 PM. Ananya Sharma''s Karnataka nursing license verification is pending. Premium rates above 10 percent need a cost-risk note. The client asked for a 10-day replacement guarantee only for fully verified candidates.',
    '{"participants":"Kavya Raman, Rohan Kulkarni, Siddharth Menon","owner":"Ananya Suresh"}'::jsonb
  ),
  (
    'src-aarogya-policy-credentialing',
    'acct-aarogya-health',
    'knowledge',
    'credentialing_checklist',
    'Aarogya Healthcare Credentialing Checklist',
    'Clinical candidates require active license verification, background verification, identity proof validation, immunization attestation, facility compliance packet, shift preference confirmation, and start-date availability. For starts within five days, blockers must be escalated before shortlist presentation.',
    '{"policy_owner":"Meera Nair","applies_to":"clinical candidates"}'::jsonb
  ),
  (
    'src-aarogya-incident-may',
    'acct-aarogya-health',
    'risks',
    'sla_incident',
    'May SLA Breach RCA - Aarogya',
    'License verification was requested after candidate presentation. Two starts were delayed, overtime coverage increased, and renewal risk moved up. Corrective action: escalate credentialing blockers before shortlist delivery.',
    '{"severity":"high","root_cause":"late license verification"}'::jsonb
  ),
  (
    'src-navapay-crm-account',
    'acct-navapay-fintech',
    'crm',
    'crm_account',
    'CRM Account Profile - NavaPay Fintech',
    'NavaPay is red-health because API latency and low reconciliation adoption threaten a September renewal. Suhani Bansal is the sponsor and Vikram Sethi is the technical owner.',
    '{"sponsor":"Suhani Bansal","technical_owner":"Vikram Sethi","arr":"INR 9.6 Cr"}'::jsonb
  ),
  (
    'src-navapay-meeting-qbr',
    'acct-navapay-fintech',
    'interactions',
    'meeting_notes',
    'QBR Notes - NavaPay Renewal Risk',
    'Suhani wants a concrete API latency recovery plan. Vikram wants an RCA, prevention checklist, and a direct settlement-window escalation channel. Adoption is low for reconciliation workflows.',
    '{"owner":"Ira Joshi","participants":"Suhani Bansal, Vikram Sethi, Aditi Prakash"}'::jsonb
  ),
  (
    'src-navapay-knowledge-renewal',
    'acct-navapay-fintech',
    'knowledge',
    'customer_success_playbook',
    'Enterprise SaaS Renewal Save Playbook',
    'Red-health enterprise renewals within 90 days require a save plan with executive sponsor, technical owner, product owner, milestones, and success metrics.',
    '{"playbook_owner":"CS Ops"}'::jsonb
  ),
  (
    'src-navapay-risk-latency',
    'acct-navapay-fintech',
    'risks',
    'incident_review',
    'Latency Incident Review - NavaPay',
    'API latency spikes during settlement windows caused delayed payment confirmation and executive complaints. Suspected cause is queue saturation combined with webhook retry storms.',
    '{"severity":"critical","root_cause":"queue saturation"}'::jsonb
  ),
  (
    'src-prithvigrid-crm-account',
    'acct-prithvigrid-energy',
    'crm',
    'crm_account',
    'CRM Account Profile - PrithviGrid Utilities',
    'PrithviGrid has 11 open outage or maintenance tickets and is watching SLA adherence during monsoon load spikes. Harish Nambiar wants faster dispatch coordination.',
    '{"operations_head":"Harish Nambiar","safety_owner":"Ishita Rao","contract_value":"INR 22.4 Cr"}'::jsonb
  ),
  (
    'src-prithvigrid-meeting-dispatch',
    'acct-prithvigrid-energy',
    'interactions',
    'meeting_notes',
    'Dispatch Planning Notes - Monsoon Response',
    'Transformer T-42 near Nashik crossed heat threshold twice. Two assigned technicians have expired safety refresher certificates. The customer needs an ETA update before 3 PM.',
    '{"owner":"Raghav Bendre","region":"Maharashtra"}'::jsonb
  ),
  (
    'src-prithvigrid-knowledge-safety',
    'acct-prithvigrid-energy',
    'knowledge',
    'safety_policy',
    'Field Safety Lockout Policy',
    'Transformer maintenance requires lockout-tagout checklist, PPE verification, site permit, weather review, and current technician refresher status.',
    '{"policy_owner":"Ishita Rao"}'::jsonb
  ),
  (
    'src-prithvigrid-risk-sla',
    'acct-prithvigrid-energy',
    'risks',
    'sla_incident',
    'June Feeder SLA Breach - PrithviGrid',
    'Technician assignment was delayed because safety certification status was checked after dispatch instead of before. Restoration exceeded SLA by 3 hours.',
    '{"severity":"medium","root_cause":"dispatch delay"}'::jsonb
  )
on conflict (id) do update set
  content = excluded.content,
  fields = excluded.fields;

insert into candidates (id, account_id, name, role, availability_date, compliance_status, credentialing_status, bgv_status, fit_score, rate_variance_percent, missing_items, risk_flags, metadata)
values
  ('cand-ananya-sharma', 'acct-aarogya-health', 'Ananya Sharma', 'ICU Nurse', '2026-07-02', 'license verification pending', 'license verification pending', 'background complete', 92, 8, '["Karnataka nursing license verification"]'::jsonb, '["start date within 4 days","license pending"]'::jsonb, '{"city":"Bengaluru","experience":"7 years ICU"}'::jsonb),
  ('cand-riya-menon', 'acct-aarogya-health', 'Riya Menon', 'ICU Nurse', '2026-07-04', 'immunization attestation pending', 'immunization attestation pending', 'background complete', 84, 11, '["flu immunization attestation"]'::jsonb, '["premium rate needs justification"]'::jsonb, '{"city":"Pune","experience":"6 years ICU"}'::jsonb),
  ('cand-devika-iyer', 'acct-aarogya-health', 'Devika Iyer', 'Emergency Ward Nurse', '2026-07-01', 'fully verified', 'fully verified', 'verified', 88, 4, '[]'::jsonb, '["needs night-shift confirmation"]'::jsonb, '{"city":"Mysuru","experience":"5 years emergency care"}'::jsonb),
  ('cand-karan-malhotra', 'acct-aarogya-health', 'Karan Malhotra', 'Epic Analyst', '2026-07-06', 'reference check pending', 'reference check pending', 'identity verified', 81, 6, '["client reference check"]'::jsonb, '["module fit needs hiring manager review"]'::jsonb, '{"city":"Hyderabad","module":"Epic Orders"}'::jsonb)
on conflict (id) do update set
  account_id = excluded.account_id,
  credentialing_status = excluded.credentialing_status,
  bgv_status = excluded.bgv_status,
  fit_score = excluded.fit_score,
  missing_items = excluded.missing_items,
  risk_flags = excluded.risk_flags,
  metadata = excluded.metadata;

insert into documents (id, account_id, title, source_type, content, metadata)
select
  replace(id, 'src-', 'doc-') as id,
  account_id,
  title,
  source_type,
  content,
  jsonb_build_object('collection', collection, 'fields', fields)
from source_entries
on conflict (id) do update set
  content = excluded.content,
  metadata = excluded.metadata;

insert into memory_cards (id, entity_type, entity_id, title, memory_type, summary, confidence, metadata)
values
  ('mem-aarogya-profile', 'account', 'acct-aarogya-health', 'Aarogya Account Profile', 'profile', 'Aarogya is renewal-sensitive, urgent ICU coverage is open, and credentialing misses directly affect executive trust.', 93, '{}'),
  ('mem-aarogya-rule-credentialing', 'account', 'acct-aarogya-health', 'Credentialing Before Shortlist Rule', 'rule', 'For clinical starts within five days, license and BGV blockers must be escalated before shortlist presentation.', 96, '{}'),
  ('mem-aarogya-episode-may', 'account', 'acct-aarogya-health', 'May SLA Breach Pattern', 'episodic', 'Late license verification caused two delayed starts and increased renewal risk with Kavya Raman.', 90, '{}'),
  ('mem-navapay-profile', 'account', 'acct-navapay-fintech', 'NavaPay Renewal Profile', 'profile', 'NavaPay is red-health because API latency and reconciliation adoption threaten a September renewal.', 90, '{}'),
  ('mem-navapay-rule-save-plan', 'account', 'acct-navapay-fintech', 'Enterprise Renewal Save Plan Rule', 'rule', 'Red-health enterprise SaaS renewals within 90 days require an executive save plan, RCA, milestones, and named owners.', 94, '{}'),
  ('mem-prithvigrid-profile', 'account', 'acct-prithvigrid-energy', 'PrithviGrid Operations Profile', 'profile', 'PrithviGrid prioritizes outage response, safety compliance, and customer ETA communication during monsoon risk.', 88, '{}'),
  ('mem-prithvigrid-rule-safety', 'account', 'acct-prithvigrid-energy', 'Safety Before Dispatch Rule', 'rule', 'Technician safety refresher status must be verified before dispatch for transformer maintenance work.', 94, '{}')
on conflict (id) do update set
  summary = excluded.summary,
  confidence = excluded.confidence,
  metadata = excluded.metadata,
  updated_at = now();

insert into business_rules (id, name, domain, rule_type, condition, action, severity)
values
  ('rule-healthcare-credentialing', 'Critical healthcare credentialing escalation', 'healthcare_staffing', 'sla_risk', 'Role starts within five days and compliance item is unresolved', 'Escalate to compliance lead before presenting candidate', 'critical'),
  ('rule-saas-renewal-save', 'Red-health SaaS renewal save plan', 'saas_customer_success', 'renewal_risk', 'Renewal within 90 days and account health is red', 'Create executive save plan with RCA and named owners', 'critical'),
  ('rule-energy-safety-dispatch', 'Safety certification before dispatch', 'energy_field_service', 'safety_risk', 'Technician safety refresher expired before transformer work', 'Assign certified technician or get written safety approval', 'high')
on conflict (id) do update set
  action = excluded.action,
  severity = excluded.severity;

