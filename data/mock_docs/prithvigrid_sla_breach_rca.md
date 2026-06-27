# PrithviGrid Utilities - Feeder Restoration SLA Breach RCA And Field Safety Review

Document ID: PGU-RCA-FEEDER-2026-06
Account: PrithviGrid Utilities
Prepared By: Flow360 Field Operations
Reviewed By: Harish Nambiar, Operations Head; Ishita Rao, Safety Owner
Incident Date: 2026-06-18
Severity: Medium Operational Breach With High Safety Sensitivity

## 1. Executive Summary

PrithviGrid experienced a feeder restoration SLA miss because technician certification status was checked after dispatch assignment instead of before dispatch recommendation. The preferred crew was later found to have expired safety refresher certificates, requiring reassignment. The reassignment delayed field response and created a customer communication gap for a hospital feeder.

The incident did not lead to injury or unsafe work, but it exposed a process weakness. Flow360 must not recommend a dispatch action based only on location and availability. Technician safety certification must be treated as a hard decision input.

## 2. SLA And Safety Expectations

| Requirement | Expected Standard | Actual Outcome | Status |
| --- | --- | --- | --- |
| Hospital feeder ETA update | Every two hours | First update was late | Missed |
| Crew dispatch recommendation | Certified crew before dispatch | Certification checked late | Missed |
| Restoration timeline | Within SLA window | Exceeded by 3 hours | Missed |
| Safety compliance | Lockout-tagout and refresher complete | Unsafe dispatch prevented before work | Controlled risk |
| Customer communication | ETA, risk, backup plan included | Backup plan was delayed | Missed |

## 3. Timeline

| Time | Event |
| --- | --- |
| 2026-06-18 07:40 IST | Feeder HF-12 reported unstable load after monsoon surge. |
| 2026-06-18 08:05 IST | Preferred crew assigned based on proximity. |
| 2026-06-18 08:25 IST | Safety review found two technicians had expired refresher certificates. |
| 2026-06-18 08:50 IST | Assignment reversed and backup crew search began. |
| 2026-06-18 09:35 IST | Harish requested updated ETA for hospital operations. |
| 2026-06-18 10:20 IST | Certified backup crew assigned. |
| 2026-06-18 13:10 IST | Restoration completed outside target SLA. |

## 4. Root Cause

The primary root cause was sequence failure. The dispatch system considered location and availability before safety certification status. Certification status was validated after the dispatch recommendation, which forced reassignment.

Contributing causes:

- Certification status was not visible in the first dispatch view.
- Monsoon urgency increased pressure to assign the closest crew quickly.
- Customer ETA was sent before backup plan was stable.
- The account lacked a structured rule that hospital feeders require certification check before ETA commitment.

## 5. Corrective Actions

| Corrective Action | Owner | Due | Status |
| --- | --- | --- | --- |
| Add safety refresher status to dispatch decision inputs | Flow360 Field Ops | 2026-06-25 | Complete |
| Require certified backup option for hospital feeders | Field Operations Manager | 2026-06-26 | Active |
| Update customer ETA template | Ishita Rao | 2026-06-26 | Complete |
| Flag critical feeders in CRM asset register | Harish Nambiar | 2026-06-27 | Active |
| Add weather-delay risk note before monsoon dispatch | Flow360 Planner Agent | 2026-06-28 | Active |

## 6. Preventive Rule

For PrithviGrid hospital, municipal, and industrial feeders, Flow360 should evaluate:

- Feeder criticality
- Technician certification
- Lockout-tagout readiness
- Weather and travel risk
- Backup crew option
- Customer ETA update requirement

The agent should not recommend "dispatch nearest crew" if certification status is expired or unknown.

## 7. Flow360 Recommendation Guidance

The preferred next best action after a similar signal is:

"Assign a certified backup crew and send a structured ETA update to Harish Nambiar, including safety approval status, next update time, and backup plan."

Evidence should include dispatch notes, field safety policy, monsoon playbook, asset register, and prior SLA breach RCA.
