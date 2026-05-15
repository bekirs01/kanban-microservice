# README Improvement Plan

This document plans a future revision of the repository **`README.md`**. It does **not** replace the current README yet and contains **no application code** changes.

---

## Purpose

Produce a **single authoritative README** that satisfies hackathon expectations: jury clarity, developer onboarding, honest feature scope, reproducible commands, and alignment with **`HACKATHON_CASE_REQUIREMENTS.md`**, **`PROJECT_RULES.md`**, and **`I18N_IMPLEMENTATION_PLAN.md`**.

---

## Planned README structure

When the README is rewritten, it should include the following sections **in a logical order** (headings may vary; content must be present).

### 1. Project title

- Clear product name (e.g., “Kanban Microservices Platform”).
- Optional one-line badge row only if maintained (avoid dead links).

### 2. Short project description

- Two to four sentences: what the system is, primary user value, and architectural style (microservices, event-driven, realtime).
- Audience: technical reader who has sixty seconds.

### 3. Hackathon case summary

- Condensed narrative of the case: Kanban board comparable to Jira/Trello, realtime collaboration, notifications, optional queue ingestion, automation, i18n roadmap.
- Reference the full spec: link to **`HACKATHON_CASE_REQUIREMENTS.md`**.

### 4. Main features

- Bullet list of **user-visible** and **operator-visible** capabilities.
- Split into **implemented** vs **planned / partial** where honesty matters (see README Quality Rules).

### 5. Architecture overview

- Diagram (Mermaid or static image) or numbered component list: web, API gateway, domain services, PostgreSQL, RabbitMQ, WebSocket path.
- Data flow: sync RPC vs async events (high level).
- Link to deeper doc if one exists.

### 6. Technology stack

- Table or grouped list: frontend (e.g., React, Vite), backend (NestJS), ORM, DB, broker, monorepo tool (Turborepo), containers.
- Versions only if pinned or critical for reproduction.

### 7. Real-time synchronization explanation

- How clients connect (e.g., Socket.io / gateway path).
- Which domain changes trigger pushes (task CRUD, moves, notifications).
- What “instant” means (optimistic UI vs server ack) and how reconnect is handled at a high level.

### 8. Event-driven architecture explanation

- Published events: task created, updated, moved, deleted (and any others).
- Which service publishes, which consumes, and why decoupling matters for notifications or future workers.

### 9. Queue processing explanation

- Broker in use (e.g., RabbitMQ)—state if Kafka is **not** used to avoid confusion.
- Inbound paths: REST vs queue consumer; stages: validation, deduplication, enrichment, error handling / DLQ narrative.
- Explicitly mark **not implemented** items if the code only covers a subset.

### 10. Automation rules explanation

- What rules exist (e.g., notify on move); how tags and deadlines are intended to behave.
- Distinguish **live behavior** from **roadmap** aligned with hackathon case.

### 11. Internationalization explanation

- Target locales: English (default), Russian, Turkish.
- How language is selected and persisted; link to **`I18N_IMPLEMENTATION_PLAN.md`** until fully implemented.
- Note replacement of legacy Portuguese UI strings as a migration item if still applicable.

### 12. Environment variables

- Table: variable name, purpose, default, required in prod vs dev.
- Separate blocks for **web** (Vite-prefixed public vars), **gateway**, **auth**, **tasks**, **notifications**, **database**, **broker**.
- Never commit secrets; document `.env.example` if introduced.

### 13. Local setup instructions

- Prerequisites: Node version, package manager, optional Colima/Docker Desktop.
- `git clone`, `cd`, `npm install` (or workspace equivalent).
- Order of operations if packages must be built before apps.

### 14. Docker setup instructions (if Docker exists)

- Reference `docker-compose.yml` (or equivalent).
- Commands: `docker compose up -d --build`, health wait, log tailing.
- Port map summary and known conflicts (3000–3004, 5432, 5672, 15672).
- Note **Colima** or Docker Desktop requirement on macOS where relevant.

### 15. How to run frontend

- Exact command(s) for dev and production build.
- Workspace name (`@challenge/web` or equivalent).

### 16. How to run backend

- Per-service or unified command; clarify gateway vs microservices startup.
- Migration note if services run migrations on boot.

### 17. How to run database / message broker (if needed)

- Docker service names; local connection strings; management UI URL and default credentials if dev-only.
- Optional: seed script command if present.

### 18. How to test the real-time demo

- Step-by-step minimal repro: two browsers, same board, move task, expect notification.
- Troubleshooting: websocket URL env, CORS, mixed HTTP/HTTPS.

### 19. Deployment instructions

- Target platform options (VPS, PaaS, container host).
- Build artifacts, env injection, scaling caveats (stateless vs broker).
- Separate frontend static hosting vs backend services if applicable.

### 20. Demo scenario for the jury

- Short scripted walkthrough (can mirror “Best Jury Demo Flow” below in condensed form).
- Expected timing (e.g., five to eight minutes).

### 21. Known limitations

- Explicit gaps: missing automation, partial i18n, no Kafka, single-region, schema-in-one-DB dev pattern, etc.
- Anything that could surprise evaluators if oversold.

### 22. Future improvements

- Ordered backlog: DLX, tracing, rate limiting, full automation engine, etc.—cross-reference hackathon roadmap.

---

## Best Jury Demo Flow

Use this as the **canonical live demo script** when presenting; the README should summarize or embed it.

1. Open the app in **two browser windows** (or normal + incognito).
2. **Log in as two different users** if authentication exists; otherwise state why single-user demo applies.
3. **Create a new task** from one window.
4. Show that the task **appears in real time** in the other window without refresh.
5. **Move the task** to another column in the first window.
6. Show that the **second browser updates instantly**.
7. **Add an urgent tag** (or equivalent priority/tag affordance).
8. Show an **automatic flag or notification** tied to that action if implemented; otherwise narrate as planned behavior without claiming it works.
9. **Trigger a task through API or queue** if implemented (curl example or documented producer).
10. Show **event-driven behavior** (notification consumer or audit trail) consistent with actual architecture.
11. **Switch UI language** among English, Russian, and Turkish **if implemented**; if not, point to `I18N_IMPLEMENTATION_PLAN.md` and README honesty rules.

---

## README Quality Rules

These constraints apply when editing **`README.md`**:

- The README must be written in **English**.
- The README must be **clear** for both **developers** (setup, architecture) and **jury members** (value, demo path).
- The README must **not exaggerate** capabilities that are not implemented.
- The README must **clearly separate** **implemented features** and **planned / partial features** (tables or labeled subsections work well).
- The README must include **exact run commands** (copy-paste safe, tested on the target OS or noted otherwise).
- The README must include **troubleshooting notes** (ports in use, unhealthy containers, migration failures, websocket connectivity).

---

## Execution checklist (for the future README rewrite)

When ready to implement this plan:

- [ ] Audit the codebase and mark each hackathon feature as implemented, partial, or missing.
- [ ] Draft README sections 1–22 using only verified facts.
- [ ] Add “Best Jury Demo Flow” (condensed) and link to **`HACKATHON_CASE_REQUIREMENTS.md`**.
- [ ] Verify every command in README on a clean clone (or document OS-specific deviations).
- [ ] Peer-review for overselling vs **`DEVELOPMENT_TODO.md`** status.
- [ ] Replace deprecated Portuguese references in diagrams/copy if diagrams are locale-specific.

---

## Note

Only **`README_IMPROVEMENT_PLAN.md`** was added in this step. The existing **`README.md`** remains unchanged until a follow-up task applies this plan.
