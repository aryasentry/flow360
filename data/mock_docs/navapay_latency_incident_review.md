# NavaPay Fintech - API Latency Incident Review

Severity: Critical
Business impact: delayed payment confirmations and manual reconciliation during bank settlement windows.

Observed pattern:
- Monday evening settlement window: API p95 latency crossed 900 ms.
- Thursday evening settlement window: webhook retry queue created duplicate reconciliation checks.
- Customer operations team manually verified exceptions for 4 hours.

Suspected root cause:
Queue saturation combined with webhook retry storms.

Customer asks:
- RCA in plain language.
- 30-day prevention plan.
- Named incident commander.
- Weekly executive update until steering committee.

