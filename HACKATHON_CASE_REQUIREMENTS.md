# Hackathon Case Requirements

## Executive overview

This document defines the hackathon scenario for **Kanban task management**, comparable in intent to mainstream products such as **Jira** and **Trello**. Teams deliver a cohesive **frontend** and **backend**, demonstrate **real-time collaboration**, expose **integrations** suitable for queued task intake, and show **notifications**, **administration**, and **automation**. Submissions must be **reliable**, **demonstrably synchronized**, and **production-minded** enough to deploy for jury review.

---

## 1. Kanban board

The product must expose a configurable **Kanban board** with baseline workflow columns plus extensibility:

| Requirement | Detail |
| ----------- | ------ |
| Default columns | **To Do**, **In Progress**, **Review**, **Done** |
| Custom columns | Administrators can configure additional or renamed columns aligned to process needs |
| Behaviour | Columns represent lifecycle stages; tasks move between columns according to user actions or automation |

---

## 2. Task card (task model)

Every task MUST support at least the following attributes:

| Field | Description |
| ----- | ----------- |
| **ID** | Stable identifier for references, APIs, notifications, and queue messages |
| **Title** | Short human-readable summary |
| **Description** | Longer explanatory content |
| **Status** | Aligned with board column / workflow stage |
| **Priority** | Relative urgency or importance |
| **Tags** | Labels for filtering, routing, automation, or visual grouping |
| **Created date** | Audit and ordering |
| **Deadline** | Scheduling; may drive automation or warnings |

Implementations MAY add internal fields as needed provided the contract above remains satisfied for users and integrations.

---

## 3. User functionality

Authenticated (or duly scoped) end users MUST be able to:

- **View** tasks on the board and in detail contexts
- **Create** tasks with required metadata
- **Edit** mutable fields consistent with authorization rules
- **Delete** tasks where policy allows
- **Move** tasks between columns via drag-and-drop or equivalent explicit actions
- **Receive real-time notifications** when relevant domain events occur (assignments, status changes, comments if present, deadlines, automation outcomes, etc.)

---

## 4. Admin functionality

Administrative roles MUST be able to operate the operational layer of Kanban workflow:

| Capability | Objective |
| ---------- | --------- |
| **Configure board columns** | Shape workflows without developer intervention |
| **Configure automation rules** | Encode policy (e.g. move on deadline, escalate on priority) |
| **Control incoming task flow** | Govern validation, quotas, moderation, or assignment defaults for externally ingested tasks |
| **Manage notifications** | Tune what users receive, channels, thresholds, deduplicated noise control |

Administrative UX may be consolidated or split across screens provided all capabilities remain accessible and auditable enough for demonstration.

---

## 5. Real-time behaviour

- When **any user mutates shared state that affects visible tasks**, other connected clients MUST reflect the update **without manual page refresh**.
- The UI MUST remain **synchronized** across sessions observing the same board or overlapping task scope.
- Degraded-network behaviour SHOULD be clarified (retry, reconciliation, optimistic rollback) when demonstrated.

---

## 6. Event-driven architecture

The system MUST **react programmatically** to domain events across services or modules. Mandatory event categories:

1. **Task created**
2. **Task updated**
3. **Task moved**
4. **Task deleted**

Downstream subscribers (notifications, analytics, automation engine, integrations) SHOULD consume these events through a documented pattern consistent with asynchronous messaging where appropriate.

---

## 7. Automation

Beyond manual drag-and-move, teams SHOULD showcase **rule-driven behaviour**:

| Area | Illustrative behaviours |
| ---- | ----------------------- |
| **Automatic notifications** | Trigger on transitions, mentions, SLA breaches |
| **Rule-based task movement** | Promote to Review when checklist complete or move to Done when reviewer approves |
| **Tag-based flags** | Visual emphasis, escalation, rerouting queues |
| **Deadline-based reactions** | Warnings before due date or auto-transition after breach |

Automation MUST be coherent with permission and concurrency rules.

---

## 8. Queue processing

The platform SHOULD accept **incoming work** representing tasks produced outside the interactive UI—for example inbound API submissions or asynchronous **message brokers**:

- **Recommended technologies**: **RabbitMQ** or **Apache Kafka**, justified by backlog volume, persistence model, replay needs, delivery semantics demonstration

Queue handling MUST minimally include stages or documented equivalents:

| Stage | Purpose |
| ----- | ------- |
| **Deduplication** | Prevent accidental double-processing via idempotency keys or natural keys |
| **Validation** | Schema, ACL, tenancy, cardinality against limits |
| **Enrichment** | Default priorities, SLA tags, inferred assignees from mappings |
| **Safe error handling** | Dead-lettering, exponential backoff semantics, Poison message isolation when explained |

Demonstrations SHOULD show at least **one realistic failed message path** resolving without silent loss.

---

## 9. Notifications

The submission MUST unify across channels logically:

| Type | Audience / scope |
| ---- | ---------------- |
| **System notifications** | Policy, maintenance, degraded integration |
| **User notifications** | Direct user relevance (assignment, mentions, completions) |
| **Real-time notifications** | WebSocket or analogous push surfaced live in-browser |

Delivery MUST align with §5 (immediate visibility) wherever applicable.

---

## 10. Non-functional requirements

| Requirement | Expectation |
| ----------- | ----------- |
| **Reliability** | Graceful handling of partial failures; recovery paths demonstrable |
| **No message loss** | At-least-once or exactly-once semantics explicitly chosen and justified in README / architecture prose |
| **Error handling** | Uniform error surfaces API↔Gateway↔Frontend; surfaced to operators where appropriate |
| **Consistent UI state** | Reconciliation eliminates ghost cards or orphaned optimistic rows after conflicts |
| **Conflict control** | Last-writer-visible OR explicit versioning / merge strategy explained |
| **Scalable architecture** | Logical service boundaries permitting horizontal scaling of stateless layers or partitioned queues |

---

## 11. Expected deliverable

Each team MUST supply:

1. **Working backend** services (or modular monolith if justified) implementing core domain, integrations, and messaging
2. **Working frontend** covering board interaction, admin surfaces (or equivalent), and notification presentation
3. **Source code** in a repository with clear structure
4. **README** containing:
   - High-level **architecture** diagram or narrative
   - **Technology** stack justification
   - **Run instructions** (local and/or containerized)
5. **Server deployment** instructions or live URL suitable for jury access (HTTPS preferred)

---

## Jury Evaluation Criteria

The jury may assess submissions across the following dimensions (not necessarily equal weight):

| Criterion | Focus |
| --------- | ----- |
| **Functionality** | Completeness versus scope, correctness of CRUD & movement |
| **Real-time synchronization** | Observed simultaneity, absence of stale UI without refresh |
| **Automation logic** | Non-trivial rules, correctness, observability |
| **Interface usability** | Clarity, flow, error affordances, accessibility basics |
| **Reliability** | Recovery, messaging integrity, demonstrated edge cases |
| **Additional useful features** | Thoughtful extras without destabilizing core scope |
| **Technical implementation quality** | Idiomatic frameworks, cohesive layering, test evidence if any |
| **Code quality** | Readability, consistency, avoidance of gratuitous complexity |
| **Architecture quality** | Separation of concerns, messaging patterns, observability hooks |
| **Deployment readiness** | Reproducibility, environment discipline, secrets hygiene |

---

## Minimum Winning Demo

A **minimum strong jury demo** SHOULD, in a single continuous session:

1. Open the board in **two separate browser contexts** representing **distinct users**.
2. **User A** moves a task between columns; **User B observes the movement immediately** without reloading.
3. An **automatic notification** appears relevant to that change (assignment, transition, comment, or rule trigger as appropriate).
4. **Create or enqueue a task** through an **HTTP API or message queue** pathway (not only the primary UI form), then show its appearance on the board after processing.
5. Trigger an **automation rule** responding to either a **tag** or a **deadline** condition (movement, notification, or flag).
6. Present a **clean, professional UI** aligned with hackathon polish, with **English, Russian, and Turkish** internationalization either **implemented** or **clearly staged** as the next planned iteration (navigation copy, labels, selector affordance roadmap explained live or in README).

Teams meeting this baseline with stable execution and articulate architecture narrative are positioned competitively for recognition.
