from __future__ import annotations

DEMO_ACCOUNT_ID = "acct-aarogya-health"
DEMO_ACCOUNT_NAME = "Aarogya Health Network"


DEMO_ACCOUNTS = [
    {
        "id": "acct-aarogya-health",
        "name": "Aarogya Health Network",
        "segment": "Healthcare staffing",
        "domain": "healthcare_staffing",
        "health": "amber",
        "renewal_date": "2026-08-31",
        "description": "Hospital network with urgent ICU nurse and Epic analyst staffing requirements across Bengaluru, Pune, and Hyderabad.",
        "supports_candidates": True,
        "primary_user": "Staffing Account Manager",
        "metadata": {
            "renewal_exposure": "INR 15.2 Cr",
            "primary_sponsor": "Kavya Raman",
            "economic_buyer": "Rohan Kulkarni",
            "city_cluster": "South and West India",
        },
        "metrics": [
            {"label": "Critical reqs", "value": "24", "delta": "+8 this week"},
            {"label": "SLA breach risk", "value": "High", "delta": "4-day start window"},
            {"label": "Renewal exposure", "value": "INR 15.2 Cr", "delta": "Aug 31 renewal"},
            {"label": "Memory confidence", "value": "93%", "delta": "18 sources linked"},
        ],
        "risk_trend": [
            {"day": "Mon", "risk": 64, "confidence": 73},
            {"day": "Tue", "risk": 71, "confidence": 78},
            {"day": "Wed", "risk": 79, "confidence": 84},
            {"day": "Thu", "risk": 86, "confidence": 88},
            {"day": "Fri", "risk": 91, "confidence": 93},
        ],
    },
    {
        "id": "acct-navapay-fintech",
        "name": "NavaPay Fintech",
        "segment": "SaaS customer success",
        "domain": "saas_customer_success",
        "health": "red",
        "renewal_date": "2026-09-20",
        "description": "Enterprise payments SaaS customer with API latency complaints, low adoption in two modules, and a renewal negotiation in progress.",
        "supports_candidates": False,
        "primary_user": "Customer Success Manager",
        "metadata": {
            "arr": "INR 9.6 Cr",
            "primary_sponsor": "Suhani Bansal",
            "technical_owner": "Vikram Sethi",
            "product_area": "Payments API and reconciliation",
        },
        "metrics": [
            {"label": "Renewal risk", "value": "Red", "delta": "85 days to renewal"},
            {"label": "Open blockers", "value": "7", "delta": "3 product escalations"},
            {"label": "ARR at risk", "value": "INR 9.6 Cr", "delta": "Sep 20 renewal"},
            {"label": "Memory confidence", "value": "90%", "delta": "15 sources linked"},
        ],
        "risk_trend": [
            {"day": "Mon", "risk": 58, "confidence": 69},
            {"day": "Tue", "risk": 66, "confidence": 74},
            {"day": "Wed", "risk": 76, "confidence": 80},
            {"day": "Thu", "risk": 82, "confidence": 86},
            {"day": "Fri", "risk": 88, "confidence": 90},
        ],
    },
    {
        "id": "acct-prithvigrid-energy",
        "name": "PrithviGrid Utilities",
        "segment": "Energy field service",
        "domain": "energy_field_service",
        "health": "amber",
        "renewal_date": "2026-10-15",
        "description": "Power distribution client managing transformer maintenance, outage response, technician dispatch, and monsoon safety compliance.",
        "supports_candidates": False,
        "primary_user": "Field Operations Manager",
        "metadata": {
            "contract_value": "INR 22.4 Cr",
            "operations_head": "Harish Nambiar",
            "safety_owner": "Ishita Rao",
            "region": "Maharashtra and Karnataka",
        },
        "metrics": [
            {"label": "Open outages", "value": "11", "delta": "4 critical feeders"},
            {"label": "SLA breach risk", "value": "Medium", "delta": "Monsoon load surge"},
            {"label": "Contract exposure", "value": "INR 22.4 Cr", "delta": "Oct 15 renewal"},
            {"label": "Memory confidence", "value": "88%", "delta": "14 sources linked"},
        ],
        "risk_trend": [
            {"day": "Mon", "risk": 49, "confidence": 64},
            {"day": "Tue", "risk": 57, "confidence": 70},
            {"day": "Wed", "risk": 63, "confidence": 76},
            {"day": "Thu", "risk": 72, "confidence": 82},
            {"day": "Fri", "risk": 78, "confidence": 88},
        ],
    },
]


DEMO_SOURCE_ENTRIES = [
    {
        "id": "src-aarogya-crm-account",
        "account_id": "acct-aarogya-health",
        "collection": "crm",
        "source_type": "crm_account",
        "title": "CRM Account Profile - Aarogya Health Network",
        "fields": {
            "client_owner": "Kavya Raman",
            "economic_buyer": "Rohan Kulkarni",
            "renewal_date": "2026-08-31",
            "contract_value": "INR 15.2 Cr",
            "health": "amber",
        },
        "content": """Aarogya Health Network operates 42 hospitals across Bengaluru, Pune, Hyderabad, Mysuru, and Nashik.
The account has 24 urgent healthcare staffing requirements this week: 16 ICU nurses, 5 emergency ward nurses, and 3 Epic analysts.
Kavya Raman, VP Workforce Operations, values reliability and transparent escalation over lowest cost.
Rohan Kulkarni, CFO, approves premium rates only when the team presents vacancy cost, overtime exposure, and replacement guarantee details.
Account sentiment is amber because a May staffing miss delayed two ICU starts and forced 48 hours of overtime coverage.""",
    },
    {
        "id": "src-aarogya-crm-stakeholders",
        "account_id": "acct-aarogya-health",
        "collection": "crm",
        "source_type": "crm_relationships",
        "title": "Stakeholder Map - Aarogya",
        "fields": {
            "executive_sponsor": "Kavya Raman",
            "cfo": "Rohan Kulkarni",
            "compliance_lead": "Meera Nair",
            "hiring_manager": "Siddharth Menon",
        },
        "content": """Kavya Raman is the executive sponsor and is frustrated by surprises close to start dates.
Rohan Kulkarni is cost-sensitive and asks for rate justification before premium approval.
Meera Nair is the client compliance lead and usually responds before noon if blockers are clearly listed.
Siddharth Menon owns ICU hiring and wants only candidates with verified license or clearly marked conditional status.
Past successful saves happened when Flow360 named a single escalation owner and sent concise daily updates.""",
    },
    {
        "id": "src-aarogya-meeting-june",
        "account_id": "acct-aarogya-health",
        "collection": "interactions",
        "source_type": "meeting_transcript",
        "title": "Meeting Notes - Aarogya Urgent Staffing Call",
        "fields": {"meeting_owner": "Ananya Suresh", "attendees": "Kavya Raman, Rohan Kulkarni, Siddharth Menon"},
        "content": """Kavya said Aarogya needs the ICU shortlist by 4 PM today because four facilities are already using overtime coverage.
Siddharth asked whether Ananya Sharma and Riya Menon can start before July 5.
Meera warned that Ananya Sharma's Karnataka nursing license verification is still pending, even though her background check is complete.
Rohan said premium rates above 10 percent need a short cost-risk note before he approves.
The client asked for a 10-day replacement guarantee, but only for candidates whose documents are fully verified before start date.""",
    },
    {
        "id": "src-aarogya-mail-cfo",
        "account_id": "acct-aarogya-health",
        "collection": "interactions",
        "source_type": "email_thread",
        "title": "Email Thread - CFO Premium Rate Approval",
        "fields": {"from": "Rohan Kulkarni", "deadline": "Friday 11 AM"},
        "content": """Rohan Kulkarni requested a premium-rate approval brief by Friday 11 AM.
He wants each premium candidate compared against vacancy cost, expected overtime cost, patient-care continuity risk, and backup candidate availability.
He will not approve candidates above 12 percent rate variance without documented business justification.
He prefers a one-page summary and does not want raw candidate resumes in the approval note.""",
    },
    {
        "id": "src-aarogya-policy-credentialing",
        "account_id": "acct-aarogya-health",
        "collection": "knowledge",
        "source_type": "credentialing_checklist",
        "title": "Aarogya Healthcare Credentialing Checklist",
        "fields": {"policy_owner": "Meera Nair", "applies_to": "clinical candidates"},
        "content": """Clinical candidates must have active state license verification, background verification, identity proof validation, immunization attestation, facility compliance packet, shift preference confirmation, and start-date availability.
License verification is the highest-risk blocker because state board response can take 24 to 72 hours.
Candidates may be shown as conditional only if the hiring manager explicitly accepts the risk.
For starts within five days, credentialing blockers must be escalated before shortlist presentation.""",
    },
    {
        "id": "src-aarogya-policy-rate-card",
        "account_id": "acct-aarogya-health",
        "collection": "knowledge",
        "source_type": "rate_card_policy",
        "title": "Healthcare Staffing Rate Card Policy",
        "fields": {"threshold": "10 percent standard, 12 percent CFO approval"},
        "content": """Standard ICU nurse rate variance should stay within 10 percent of card.
Variance above 12 percent requires CFO approval and a documented cost-risk comparison.
Strategic accounts may receive temporary premium approval when renewal risk is tied to urgent coverage.
Replacement guarantees can be offered only when credentialing is fully verified before start date.""",
    },
    {
        "id": "src-aarogya-incident-may",
        "account_id": "acct-aarogya-health",
        "collection": "risks",
        "source_type": "sla_incident",
        "title": "May SLA Breach RCA - Aarogya",
        "fields": {"severity": "high", "root_cause": "late license verification"},
        "content": """Root cause: license verification was requested after candidate presentation instead of before shortlist delivery.
Impact: two delayed starts, 48 hours of overtime coverage, and executive escalation from Kavya Raman.
Corrective action: credentialing blockers for Aarogya must be escalated to Meera Nair before shortlist delivery.
Renewal risk increased from medium to medium-high after this incident.""",
    },
    {
        "id": "src-aarogya-crm-open-reqs",
        "account_id": "acct-aarogya-health",
        "collection": "crm",
        "source_type": "crm_job_requirements",
        "title": "CRM Open Requirements - Aarogya ICU And Epic",
        "fields": {"open_roles": 24, "priority_city": "Bengaluru", "owner": "Siddharth Menon"},
        "content": """Open requirements: 16 ICU nurses, 5 emergency ward nurses, and 3 Epic analysts.
Eight ICU nurse starts are needed before July 5 across Bengaluru and Pune.
Siddharth Menon prefers shortlists with verified credentialing status and backup candidate notes.
The Epic analyst requirement is less urgent but high-value because it supports the August go-live readiness review.""",
    },
    {
        "id": "src-aarogya-risk-renewal",
        "account_id": "acct-aarogya-health",
        "collection": "risks",
        "source_type": "renewal_risk_note",
        "title": "Renewal Risk Note - Aarogya Executive Trust",
        "fields": {"severity": "high", "owner": "Kavya Raman", "impact": "renewal confidence"},
        "content": """Kavya Raman told the team that one more unexplained start-date miss will trigger a vendor review before renewal.
The account is not purely price-sensitive; the biggest renewal risk is confidence in execution discipline.
Daily status updates should mention credentialing status, expected start date, backup option, and single owner for each blocker.""",
    },
    {
        "id": "src-navapay-crm-account",
        "account_id": "acct-navapay-fintech",
        "collection": "crm",
        "source_type": "crm_account",
        "title": "CRM Account Profile - NavaPay Fintech",
        "fields": {
            "sponsor": "Suhani Bansal",
            "technical_owner": "Vikram Sethi",
            "arr": "INR 9.6 Cr",
            "health": "red",
        },
        "content": """NavaPay Fintech uses the payments API, reconciliation module, and fraud-review dashboard.
The renewal is due on September 20 and INR 9.6 Cr ARR is at risk.
Suhani Bansal, VP Operations, is the executive sponsor and wants measurable incident reduction before renewal.
Vikram Sethi, CTO, is frustrated by API latency spikes during bank settlement windows.
Adoption is strong for payments API but weak for reconciliation workflows in the Chennai and Gurugram operations teams.""",
    },
    {
        "id": "src-navapay-meeting-qbr",
        "account_id": "acct-navapay-fintech",
        "collection": "interactions",
        "source_type": "meeting_notes",
        "title": "QBR Notes - NavaPay Renewal Risk",
        "fields": {"meeting_owner": "Ira Joshi", "attendees": "Suhani Bansal, Vikram Sethi, Aditi Prakash"},
        "content": """Suhani said NavaPay will not renew at the current tier unless the team sees a concrete recovery plan for API latency.
Vikram wants a technical RCA, incident prevention checklist, and direct escalation channel for settlement windows.
Aditi Prakash from operations said reconciliation adoption is low because the team does not trust exception matching.
The customer asked for weekly executive updates until the next steering committee.""",
    },
    {
        "id": "src-navapay-mail-latency",
        "account_id": "acct-navapay-fintech",
        "collection": "interactions",
        "source_type": "email_thread",
        "title": "Email Thread - API Latency Escalation",
        "fields": {"from": "Vikram Sethi", "severity": "critical"},
        "content": """Vikram reported three API latency spikes above 900 ms during settlement windows.
He asked whether the account can receive a named incident commander and a 30-day reliability plan.
He also wants product management to confirm whether webhook retries and reconciliation lag are related.
The email thread mentions a competitor offering lower pricing with a dedicated reliability pod.""",
    },
    {
        "id": "src-navapay-knowledge-renewal",
        "account_id": "acct-navapay-fintech",
        "collection": "knowledge",
        "source_type": "customer_success_playbook",
        "title": "Enterprise SaaS Renewal Save Playbook",
        "fields": {"playbook_owner": "CS Ops"},
        "content": """For red health enterprise accounts within 90 days of renewal, create a save plan with executive sponsor, technical owner, product owner, and weekly milestones.
If latency or reliability is the main risk, attach an RCA, 30-day prevention plan, and named incident commander.
If adoption is below 55 percent in a purchased module, schedule workflow enablement with customer operations leads.
Every save plan must include success metrics agreed with the sponsor.""",
    },
    {
        "id": "src-navapay-risk-latency",
        "account_id": "acct-navapay-fintech",
        "collection": "risks",
        "source_type": "incident_review",
        "title": "Latency Incident Review - NavaPay",
        "fields": {"severity": "critical", "open_actions": 4},
        "content": """Incident pattern: API latency spikes during bank settlement windows on Monday and Thursday evenings.
Customer impact: delayed payment confirmation, manual reconciliation, and executive complaints.
Root cause is suspected to be queue saturation combined with webhook retry storms.
Risk: renewal downgrade or competitor replacement if reliability plan is not accepted before steering committee.""",
    },
    {
        "id": "src-navapay-crm-stakeholders",
        "account_id": "acct-navapay-fintech",
        "collection": "crm",
        "source_type": "crm_relationships",
        "title": "Stakeholder Map - NavaPay",
        "fields": {
            "executive_sponsor": "Suhani Bansal",
            "technical_owner": "Vikram Sethi",
            "ops_owner": "Aditi Prakash",
            "procurement": "Manav Chawla",
        },
        "content": """Suhani Bansal owns renewal sentiment and needs an executive-level reliability narrative.
Vikram Sethi controls technical acceptance and wants RCA details before any commercial discussion.
Aditi Prakash can unblock reconciliation adoption if training is mapped to actual exception workflows.
Manav Chawla from procurement is already comparing competitor pricing and will join the next renewal call.""",
    },
    {
        "id": "src-navapay-knowledge-reconciliation",
        "account_id": "acct-navapay-fintech",
        "collection": "knowledge",
        "source_type": "product_enablement_playbook",
        "title": "Reconciliation Adoption Playbook",
        "fields": {"playbook_owner": "Product Enablement", "applies_to": "payments operations"},
        "content": """Low reconciliation adoption should be treated as workflow trust risk, not just training risk.
Run a 45-minute workflow lab using the customer's real exception categories, then measure exception closure rate.
If adoption is below 55 percent, assign a product specialist and customer operations champion for two weekly sessions.""",
    },
    {
        "id": "src-navapay-risk-competitor",
        "account_id": "acct-navapay-fintech",
        "collection": "risks",
        "source_type": "competitive_risk",
        "title": "Competitor Risk - NavaPay Renewal",
        "fields": {"severity": "high", "competitor_signal": "dedicated reliability pod"},
        "content": """Procurement mentioned a competitor offering lower pricing and a dedicated reliability pod.
The risk is strongest if Flow360 cannot show named owners, settlement-window monitoring, and a prevention plan.
Recommended counter-position: reliability plan plus executive sponsor update before procurement anchors on price.""",
    },
    {
        "id": "src-prithvigrid-crm-account",
        "account_id": "acct-prithvigrid-energy",
        "collection": "crm",
        "source_type": "crm_account",
        "title": "CRM Account Profile - PrithviGrid Utilities",
        "fields": {
            "operations_head": "Harish Nambiar",
            "safety_owner": "Ishita Rao",
            "contract_value": "INR 22.4 Cr",
            "health": "amber",
        },
        "content": """PrithviGrid Utilities manages distribution assets across Maharashtra and Karnataka.
The account has 11 active outage or maintenance tickets, including 4 critical feeders serving hospital and industrial zones.
Harish Nambiar wants faster dispatch coordination during monsoon load spikes.
Ishita Rao owns safety compliance and will block field work if lockout-tagout steps are missing.
Contract renewal is October 15 and the client is tracking SLA adherence closely.""",
    },
    {
        "id": "src-prithvigrid-meeting-dispatch",
        "account_id": "acct-prithvigrid-energy",
        "collection": "interactions",
        "source_type": "meeting_notes",
        "title": "Dispatch Planning Notes - Monsoon Response",
        "fields": {"meeting_owner": "Raghav Bendre", "region": "Maharashtra"},
        "content": """Harish said transformer T-42 near Nashik has crossed the heat threshold twice this week.
The client wants field technicians dispatched before the next evening load peak.
Ishita warned that two technicians assigned to the job have expired safety refresher certificates.
The operations team also needs a customer update message before 3 PM with ETA, risk, and backup crew details.""",
    },
    {
        "id": "src-prithvigrid-knowledge-safety",
        "account_id": "acct-prithvigrid-energy",
        "collection": "knowledge",
        "source_type": "safety_policy",
        "title": "Field Safety Lockout Policy",
        "fields": {"policy_owner": "Ishita Rao"},
        "content": """No transformer maintenance task can start until lockout-tagout checklist, PPE verification, site permit, weather risk review, and technician safety refresher status are complete.
If a technician refresher has expired, dispatch must assign an alternate certified technician or get written safety approval.
Hospital feeder incidents require a customer ETA update every two hours until restoration.""",
    },
    {
        "id": "src-prithvigrid-risk-sla",
        "account_id": "acct-prithvigrid-energy",
        "collection": "risks",
        "source_type": "sla_incident",
        "title": "June Feeder SLA Breach - PrithviGrid",
        "fields": {"severity": "medium", "root_cause": "dispatch delay"},
        "content": """Root cause: technician assignment was delayed because safety certification status was checked after dispatch instead of before.
Impact: feeder restoration exceeded SLA by 3 hours and hospital operations complained about communication gaps.
Corrective action: pre-check technician safety certification before dispatch and send customer ETA updates every two hours for hospital feeders.""",
    },
    {
        "id": "src-prithvigrid-crm-assets",
        "account_id": "acct-prithvigrid-energy",
        "collection": "crm",
        "source_type": "crm_asset_register",
        "title": "CRM Asset Register - Critical Feeders",
        "fields": {"critical_feeders": 4, "region": "Maharashtra", "owner": "Harish Nambiar"},
        "content": """Critical feeder list includes Nashik hospital feeder HF-12, Pune industrial feeder PI-07, Solapur municipal feeder SM-03, and Belagavi waterworks feeder BW-09.
HF-12 and PI-07 have the highest penalty exposure because downstream customers require two-hour ETA updates.
Harish Nambiar wants dispatch recommendations to include asset criticality, technician certification, and customer communication owner.""",
    },
    {
        "id": "src-prithvigrid-knowledge-monsoon",
        "account_id": "acct-prithvigrid-energy",
        "collection": "knowledge",
        "source_type": "monsoon_response_playbook",
        "title": "Monsoon Dispatch Playbook",
        "fields": {"policy_owner": "Ishita Rao", "applies_to": "field dispatch"},
        "content": """During monsoon alerts, transformer heat thresholds, feeder criticality, and technician certification must be evaluated before assigning crews.
Hospital and municipal feeders require ETA communication every two hours.
If the preferred technician has expired refresher status, assign the next certified technician even if travel time is 30 minutes longer.""",
    },
    {
        "id": "src-prithvigrid-risk-safety-nearmiss",
        "account_id": "acct-prithvigrid-energy",
        "collection": "risks",
        "source_type": "safety_near_miss",
        "title": "Safety Near Miss - Expired Refresher Assignment",
        "fields": {"severity": "high", "root_cause": "certification checked too late"},
        "content": """A crew was nearly dispatched to transformer T-18 before the system flagged expired safety refresher status.
The customer saw the assignment reversal and asked whether Flow360 can prevent unsafe dispatch recommendations.
Future recommendations must check safety refresher status before ETA promises are sent to Harish Nambiar.""",
    },
]


DEMO_CANDIDATES = [
    {
        "id": "cand-ananya-sharma",
        "account_id": "acct-aarogya-health",
        "name": "Ananya Sharma",
        "role": "ICU Nurse",
        "availability_date": "2026-07-02",
        "credentialing_status": "license verification pending",
        "bgv_status": "background complete",
        "fit_score": 92,
        "rate_variance_percent": 8,
        "missing_items": ["Karnataka nursing license verification"],
        "risk_flags": ["start date within 4 days", "license pending"],
        "metadata": {"city": "Bengaluru", "experience": "7 years ICU"},
    },
    {
        "id": "cand-riya-menon",
        "account_id": "acct-aarogya-health",
        "name": "Riya Menon",
        "role": "ICU Nurse",
        "availability_date": "2026-07-04",
        "credentialing_status": "immunization attestation pending",
        "bgv_status": "background complete",
        "fit_score": 84,
        "rate_variance_percent": 11,
        "missing_items": ["flu immunization attestation"],
        "risk_flags": ["premium rate needs justification"],
        "metadata": {"city": "Pune", "experience": "6 years ICU"},
    },
    {
        "id": "cand-devika-iyer",
        "account_id": "acct-aarogya-health",
        "name": "Devika Iyer",
        "role": "Emergency Ward Nurse",
        "availability_date": "2026-07-01",
        "credentialing_status": "fully verified",
        "bgv_status": "verified",
        "fit_score": 88,
        "rate_variance_percent": 4,
        "missing_items": [],
        "risk_flags": ["needs night-shift confirmation"],
        "metadata": {"city": "Mysuru", "experience": "5 years emergency care"},
    },
    {
        "id": "cand-karan-malhotra",
        "account_id": "acct-aarogya-health",
        "name": "Karan Malhotra",
        "role": "Epic Analyst",
        "availability_date": "2026-07-06",
        "credentialing_status": "reference check pending",
        "bgv_status": "identity verified",
        "fit_score": 81,
        "rate_variance_percent": 6,
        "missing_items": ["client reference check"],
        "risk_flags": ["module fit needs hiring manager review"],
        "metadata": {"city": "Hyderabad", "module": "Epic Orders"},
    },
]


def _candidate_to_source(candidate: dict) -> dict:
    return {
        "id": f"src-{candidate['id']}",
        "account_id": candidate["account_id"],
        "collection": "candidates",
        "source_type": "candidate_profile",
        "title": f"Candidate Profile - {candidate['name']}",
        "fields": {
            "name": candidate["name"],
            "role": candidate["role"],
            "credentialing_status": candidate["credentialing_status"],
            "bgv_status": candidate["bgv_status"],
            "fit_score": candidate["fit_score"],
        },
        "content": (
            f"{candidate['name']} is a {candidate['role']} available on {candidate['availability_date']}. "
            f"Credentialing status: {candidate['credentialing_status']}. "
            f"BGV status: {candidate['bgv_status']}. "
            f"Fit score: {candidate['fit_score']}. "
            f"Rate variance: {candidate['rate_variance_percent']} percent. "
            f"Missing items: {', '.join(candidate['missing_items']) or 'none'}. "
            f"Risk flags: {', '.join(candidate['risk_flags']) or 'none'}."
        ),
    }


DEMO_SOURCE_ENTRIES.extend(_candidate_to_source(candidate) for candidate in DEMO_CANDIDATES)


DEMO_DOCS = [
    {
        "id": entry["id"].replace("src-", "doc-", 1),
        "title": entry["title"],
        "source_type": entry["source_type"],
        "account_id": entry["account_id"],
        "content": entry["content"],
        "metadata": {"collection": entry["collection"], "fields": entry["fields"]},
    }
    for entry in DEMO_SOURCE_ENTRIES
]


DEMO_MEMORY_CARDS = [
    {
        "id": "mem-aarogya-profile",
        "entity_type": "account",
        "entity_id": "acct-aarogya-health",
        "title": "Aarogya Account Profile",
        "memory_type": "profile",
        "summary": "Aarogya is renewal-sensitive, urgent ICU coverage is open, and credentialing misses directly affect executive trust.",
        "confidence": 93,
    },
    {
        "id": "mem-aarogya-rule-credentialing",
        "entity_type": "account",
        "entity_id": "acct-aarogya-health",
        "title": "Credentialing Before Shortlist Rule",
        "memory_type": "rule",
        "summary": "For clinical starts within five days, license and BGV blockers must be escalated before shortlist presentation.",
        "confidence": 96,
    },
    {
        "id": "mem-aarogya-episode-may",
        "entity_type": "account",
        "entity_id": "acct-aarogya-health",
        "title": "May SLA Breach Pattern",
        "memory_type": "episodic",
        "summary": "Late license verification caused two delayed starts and increased renewal risk with Kavya Raman.",
        "confidence": 90,
    },
    {
        "id": "mem-navapay-profile",
        "entity_type": "account",
        "entity_id": "acct-navapay-fintech",
        "title": "NavaPay Renewal Profile",
        "memory_type": "profile",
        "summary": "NavaPay is red-health because API latency and reconciliation adoption threaten a September renewal.",
        "confidence": 90,
    },
    {
        "id": "mem-navapay-rule-save-plan",
        "entity_type": "account",
        "entity_id": "acct-navapay-fintech",
        "title": "Enterprise Renewal Save Plan Rule",
        "memory_type": "rule",
        "summary": "Red-health enterprise SaaS renewals within 90 days require an executive save plan, RCA, milestones, and named owners.",
        "confidence": 94,
    },
    {
        "id": "mem-prithvigrid-profile",
        "entity_type": "account",
        "entity_id": "acct-prithvigrid-energy",
        "title": "PrithviGrid Operations Profile",
        "memory_type": "profile",
        "summary": "PrithviGrid prioritizes outage response, safety compliance, and customer ETA communication during monsoon risk.",
        "confidence": 88,
    },
    {
        "id": "mem-prithvigrid-rule-safety",
        "entity_type": "account",
        "entity_id": "acct-prithvigrid-energy",
        "title": "Safety Before Dispatch Rule",
        "memory_type": "rule",
        "summary": "Technician safety refresher status must be verified before dispatch for transformer maintenance work.",
        "confidence": 94,
    },
]


DEMO_INTERACTIONS = {
    account["id"]: next(
        (entry["content"] for entry in DEMO_SOURCE_ENTRIES if entry["account_id"] == account["id"] and entry["collection"] == "interactions"),
        account["description"],
    )
    for account in DEMO_ACCOUNTS
}

DEMO_INTERACTION = DEMO_INTERACTIONS[DEMO_ACCOUNT_ID]
DEMO_METRICS = DEMO_ACCOUNTS[0]["metrics"]
RISK_TREND = DEMO_ACCOUNTS[0]["risk_trend"]
