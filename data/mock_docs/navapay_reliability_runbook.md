# Technical Runbook: NavaPay Settlement Window Reliability

Document owner: Flow360 Platform Engineering  
Applies to: Enterprise payments API, webhook delivery, reconciliation module  
Customer account: NavaPay Fintech  
Version: 2026.06  
Classification: Technical runbook, customer-specific reliability control

## Purpose

This runbook defines how Flow360 teams should investigate and respond to latency spikes for NavaPay during bank settlement windows. It is written as an operational document, not a marketing response. The goal is to give the planner concrete rules when recommending next best actions for a reliability-sensitive account.

## Trigger Conditions

The runbook applies when any of the following conditions are true:

- p95 payments API latency exceeds 750 ms for more than 10 minutes.
- webhook retry volume increases by more than 40 percent compared with baseline.
- queue depth remains elevated after settlement window close.
- reconciliation lag exceeds 30 minutes for high-value transaction batches.
- the customer reports manual reconciliation caused by delayed confirmation.

## Required Investigation Sequence

1. Confirm whether latency is isolated to NavaPay or shared across enterprise tenants.
2. Compare queue depth with webhook retry volume.
3. Check whether retry backoff settings are increasing load.
4. Review reconciliation lag and exception creation timestamps.
5. Identify customer-facing impact before sending an update.
6. Assign incident commander if two or more trigger conditions are active.

## Customer Communication Rules

Customer updates must avoid blaming partner banks until internal queue health and retry behavior are verified. Updates to Vikram Sethi should include current status, suspected cause, owner, next update time, and whether reconciliation data integrity is affected. Updates to Suhani Bansal should summarize customer impact and recovery timeline, not raw telemetry.

## Success Metrics

The 30-day recovery plan should report:

- settlement-window p95 latency
- retry volume compared with baseline
- number of manual reconciliation interventions
- incident response time
- number of executive escalations
- adoption progress in reconciliation workflow lab

## Planner Guidance

If this runbook is retrieved with renewal-risk evidence, the planner should recommend a reliability recovery action with technical owner, due date, and evidence. It should not recommend a price discount before operational recovery actions are defined.
