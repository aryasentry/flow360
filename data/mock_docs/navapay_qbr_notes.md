# NavaPay Fintech - Quarterly Business Review Notes And Renewal Risk Decision Log

Document ID: NPAY-QBR-2026-Q2
Meeting Date: 2026-06-24
Account Owner: Ira Joshi
Customer Participants: Suhani Bansal, Vikram Sethi, Aditi Prakash, Manav Chawla
Flow360 Participants: Ira Joshi, Product Enablement Lead, Platform Reliability Lead
Renewal Date: 2026-09-20
Account Health: Red

## 1. Meeting Purpose

The QBR was intended to review adoption, reliability, product value, and renewal readiness. The meeting became an escalation review because the customer connected API latency incidents and low reconciliation adoption to renewal risk.

## 2. Customer Business Context

NavaPay uses the payments API for transaction confirmation, the reconciliation module for exception handling, and the fraud-review dashboard for operations review. The payments API is considered business-critical because settlement-window delays affect customer support volume and finance operations.

The reconciliation module has not achieved expected adoption in Chennai and Gurugram teams. Operations users continue to resolve many exceptions outside the system because they do not trust the category matching.

## 3. Stakeholder Statements

Suhani Bansal said NavaPay will not renew at the current tier unless Flow360 demonstrates a concrete reliability recovery plan before the next steering committee. She wants measurable reduction in settlement-window incidents and weekly executive updates.

Vikram Sethi said the technical team needs more than an apology. He requested a technical RCA, a named incident commander, a prevention checklist, and direct escalation channel during settlement windows.

Aditi Prakash said reconciliation adoption is low because the workflow does not match how operations teams categorize failed settlement cases. She requested a workflow lab using real exception cases.

Manav Chawla from procurement asked whether the current tier is still justified if reliability requires additional manual oversight. He mentioned that a competitor is offering lower pricing with a dedicated reliability pod.

## 4. Risks Identified

| Risk | Severity | Owner | Evidence |
| --- | --- | --- | --- |
| API latency during settlement windows | Critical | Vikram Sethi | Latency incident review |
| Renewal downgrade or churn | High | Suhani Bansal | QBR statement |
| Procurement price pressure | High | Manav Chawla | Competitor mention |
| Low reconciliation adoption | Medium | Aditi Prakash | Operations feedback |
| Weak incident ownership perception | High | Customer Success | Request for incident commander |

## 5. Agreed Follow-Ups

| Action | Owner | Due Date |
| --- | --- | --- |
| Assign named incident commander | Ira Joshi | 2026-06-28 |
| Publish technical RCA | Platform Reliability Lead | 2026-07-01 |
| Create 30-day reliability plan | Platform Reliability Lead | 2026-07-03 |
| Run reconciliation workflow lab | Product Enablement Lead | 2026-07-08 |
| Send weekly executive update | Ira Joshi | Every Friday |
| Prepare renewal save plan | Customer Success Manager | 2026-07-05 |

## 6. Flow360 Memory Guidance

Future recommendations for NavaPay should prioritize a recovery plan over generic relationship outreach. The account is red because reliability has become a renewal condition. Recommendations should include technical owner, executive sponsor, procurement risk, and adoption owner.

The next best action should connect the API RCA with renewal save planning and adoption intervention. Treating latency and adoption as separate issues would understate the account risk.
