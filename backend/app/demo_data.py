from __future__ import annotations

DEMO_ACCOUNT_ID = "acct-northstar-health"
DEMO_ACCOUNT_NAME = "Northstar Health Network"

DEMO_INTERACTION = """Meeting notes: Northstar Health needs 12 ICU nurses and 4 Epic analysts placed before July 5.
Maya Rao said the current vendor missed two credentialing deadlines last quarter. The CFO is asking for a cost-risk
view before approving premium rates. Priya N. is the strongest ICU candidate but license verification is still pending.
The hiring manager wants a shortlist today and asked whether Flow360 can guarantee replacement coverage if a candidate
drops before day 10."""

DEMO_DOCS = [
    {
        "id": "doc-meeting-northstar-jun26",
        "title": "Northstar Health - Account Meeting Transcript",
        "source_type": "meeting_transcript",
        "account_id": DEMO_ACCOUNT_ID,
        "content": DEMO_INTERACTION,
    },
    {
        "id": "doc-crm-northstar-history",
        "title": "CRM Account History - Northstar Health",
        "source_type": "crm_history",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Northstar Health is a strategic healthcare staffing account with 38 active facilities.
Renewal date: August 31. Last quarter there were two SLA misses caused by late license verification and incomplete
background checks. Account sentiment moved from green to amber after the May escalation. Executive sponsor:
Maya Rao, VP Workforce Operations. Economic buyer: CFO Daniel Iyer. Current open reqs: 12 ICU nurses, 4 Epic analysts,
2 night-shift respiratory therapists. Success metric: fill critical roles within 7 business days while keeping premium
rate variance below 12 percent.""",
    },
    {
        "id": "doc-candidate-shortlist-icu",
        "title": "Candidate Shortlist - ICU Nurse Coverage",
        "source_type": "candidate_shortlist",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Priya N. - ICU RN, 7 years, available July 2, requested rate 8 percent above card, license verification pending,
background check complete, prefers day shift. Marcus Lee - ICU RN, 5 years, available July 8, fully credentialed,
rate within card, can cover nights. Elena Cruz - ICU RN, 9 years, available July 4, license active, missing flu attestation,
premium rate 14 percent above card. Asha K. - ICU RN, 4 years, available July 1, fully compliant, needs relocation confirmation.""",
    },
    {
        "id": "doc-staffing-playbook",
        "title": "Strategic Staffing Escalation Playbook",
        "source_type": "playbook",
        "account_id": "global",
        "content": """If a strategic account has renewal within 90 days and an SLA breach risk, create an executive check-in within
48 hours. For critical healthcare roles starting within 5 days, credentialing blockers must be escalated to compliance
lead before candidate presentation. If premium rates exceed 10 percent above card, include a cost-risk explanation and
replacement guarantee options. For accounts marked amber or red, every next best action must name an owner and due date.""",
    },
    {
        "id": "doc-credentialing-checklist",
        "title": "Healthcare Credentialing Checklist",
        "source_type": "policy",
        "account_id": "global",
        "content": """Required before candidate submission: active license verification, background check, immunization attestation,
facility-specific compliance packet, shift preference confirmation, and start-date availability. License verification
is the highest risk blocker because it can take 24 to 72 hours depending on state board response.""",
    },
    {
        "id": "doc-email-thread-cfo",
        "title": "Email Thread - CFO Rate Approval",
        "source_type": "email",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Daniel Iyer requested a rate justification by Friday noon. He will approve premium rates only if the staffing
team provides a business case comparing vacancy cost, overtime cost, and replacement risk. Maya wants the first shortlist
today by 4 PM and asked that candidates with unresolved compliance items be clearly marked.""",
    },
    {
        "id": "doc-renewal-risk",
        "title": "Renewal Risk Notes - Northstar Health",
        "source_type": "account_health",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Renewal risk level: medium-high. Positive signals: high volume, strong relationship with VP Workforce Operations,
good fill quality when candidates clear compliance. Negative signals: credentialing misses, CFO pressure on rates,
open critical reqs near holiday week, and competitor offering 10-day replacement guarantee.""",
    },
    {
        "id": "doc-rate-card-policy",
        "title": "Healthcare Staffing Rate Card Policy",
        "source_type": "commercial_policy",
        "account_id": "global",
        "content": """Standard ICU nurse rate variance should stay within 10 percent of card unless vacancy cost, overtime exposure,
or patient-care continuity risk justifies premium approval. Variance above 12 percent requires CFO approval and a documented
cost-risk comparison. Strategic accounts may receive temporary premium approval when renewal risk is tied to urgent coverage.""",
    },
    {
        "id": "doc-replacement-guarantee",
        "title": "Replacement Guarantee Options",
        "source_type": "playbook",
        "account_id": "global",
        "content": """For strategic healthcare accounts, offer a 10-day replacement guarantee only when candidate compliance is fully verified
before start date. If compliance is conditional, present the guarantee as pending final verification. The guarantee should name
the escalation owner and backup candidate pool.""",
    },
    {
        "id": "doc-stakeholder-map",
        "title": "Northstar Stakeholder Map",
        "source_type": "crm_relationships",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Maya Rao owns workforce operations and values reliability over lowest cost. Daniel Iyer owns economic approval and
requires quantified rate justification. Facility administrators are frustrated by previous missed starts. Compliance lead
Nora Shah responds fastest to license verification escalations before noon.""",
    },
    {
        "id": "doc-epic-analyst-shortlist",
        "title": "Candidate Shortlist - Epic Analyst Coverage",
        "source_type": "candidate_shortlist",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Arjun Mehta - Epic Orders analyst, available July 6, rate within card, background complete. Sofia Grant - Epic ClinDoc
analyst, available July 8, premium rate 9 percent above card, strong hospital rollout experience. Neel Thomas - Epic Bridges
analyst, available July 10, missing reference check, can cover integration backlog.""",
    },
    {
        "id": "doc-may-sla-rca",
        "title": "May SLA Incident RCA",
        "source_type": "incident_review",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """Root cause: license verification was requested after candidate presentation instead of before shortlist submission.
Impact: two delayed starts, 36 hours of overtime coverage, and executive escalation from Maya Rao. Corrective action:
credentialing blockers for Northstar must be escalated before shortlist delivery.""",
    },
    {
        "id": "doc-competitor-intel",
        "title": "Competitor Intelligence - Northstar Renewal",
        "source_type": "competitive_intel",
        "account_id": DEMO_ACCOUNT_ID,
        "content": """A competing staffing vendor is offering a 10-day replacement guarantee and a flat 6 percent premium cap. Their weakness
is slower Epic analyst coverage. Flow360 can differentiate with transparent compliance tracking, faster shortlist delivery,
and named escalation ownership.""",
    },
]

DEMO_MEMORY_CARDS = [
    {
        "id": "mem-profile-northstar",
        "entity_type": "account",
        "entity_id": DEMO_ACCOUNT_ID,
        "title": "Account Profile",
        "memory_type": "profile",
        "summary": "Strategic healthcare staffing account with renewal on August 31, amber sentiment, and high sensitivity to credentialing misses.",
        "confidence": 91,
    },
    {
        "id": "mem-rule-healthcare-critical",
        "entity_type": "account",
        "entity_id": DEMO_ACCOUNT_ID,
        "title": "Critical Healthcare SLA Rule",
        "memory_type": "rule",
        "summary": "For starts within 5 days, credentialing blockers must be escalated before candidate presentation.",
        "confidence": 95,
    },
    {
        "id": "mem-episodic-may-escalation",
        "entity_type": "account",
        "entity_id": DEMO_ACCOUNT_ID,
        "title": "May Escalation Pattern",
        "memory_type": "episodic",
        "summary": "A prior late license verification caused stakeholder frustration and reduced account sentiment.",
        "confidence": 88,
    },
]

DEMO_METRICS = [
    {"label": "Critical reqs", "value": "18", "delta": "+6 this week"},
    {"label": "SLA breach risk", "value": "High", "delta": "5-day start window"},
    {"label": "Renewal exposure", "value": "$1.8M", "delta": "Aug 31 renewal"},
    {"label": "Memory confidence", "value": "91%", "delta": "7 sources linked"},
]

RISK_TREND = [
    {"day": "Mon", "risk": 62, "confidence": 71},
    {"day": "Tue", "risk": 68, "confidence": 74},
    {"day": "Wed", "risk": 75, "confidence": 79},
    {"day": "Thu", "risk": 83, "confidence": 84},
    {"day": "Fri", "risk": 88, "confidence": 91},
]
