# Workshop Notes: NavaPay Reliability And Reconciliation Recovery Plan

Workshop owner: Ira Joshi  
Product owner: Naman Vaidya  
Customer technical owner: Vikram Sethi  
Date: 27 Jun 2026  
Classification: Customer workshop, incident prevention, adoption recovery

## Objective

The workshop was held to align NavaPay and Flow360 on the recovery plan needed before renewal. The meeting covered API latency spikes, webhook retry behavior, reconciliation adoption, and how the customer will evaluate success over the next 30 days.

## Discussion Summary

Vikram Sethi stated that the technical team is willing to continue with Flow360 only if the reliability plan is measurable. He rejected high-level statements such as "we are monitoring the issue" and asked for specific thresholds, owners, and response times. He wants queue depth, retry count, settlement-window latency, and reconciliation lag to appear in the weekly report.

Aditi Prakash explained that reconciliation adoption is not low because the team dislikes the product. It is low because exception categories do not map cleanly to how her Chennai operations team triages failed settlements. She asked for a workflow lab using actual exception cases from the last two weeks.

Naman Vaidya confirmed that product engineering can review retry backoff configuration and queue saturation telemetry. He warned that the team should not promise a code fix until the retry pattern is confirmed.

## Customer Success Plan

The proposed recovery plan has four tracks:

1. Reliability track: RCA, queue metrics, retry-storm investigation, and named incident commander.
2. Adoption track: reconciliation workflow lab with Chennai operations.
3. Executive track: weekly summary for Suhani Bansal and Vikram Sethi.
4. Commercial track: procurement response covering service commitment and competitive positioning.

## Open Decisions

The team has not yet agreed whether NavaPay receives a dedicated reliability pod. Procurement is asking for this language because a competitor included it. Flow360 should avoid promising this in writing until commercial approval is obtained.

## Flow360 Planner Instruction

When new NavaPay source data is ingested, the planner should prefer a combined reliability-and-adoption recovery action over a generic renewal reminder. Recommended owners should include Customer Success, Product Engineering, and Commercial Lead. Human approval is required before any customer-facing commitment is sent.
