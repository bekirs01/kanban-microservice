# Project rules — Kanban microservices (hackathon)

This document aligns **human engineers** and **Cursor / AI tooling** with how we evolve this codebase. Detailed agent-focused rules live in `.cursor/rules/*.mdc`.

---

## 1. Purpose

Preserve a **professional, jury-ready hackathon demo** while we add features—especially **internationalization**. Work must stay **incremental**, **reviewable**, and safe for authentication, realtime, and Kanban behavior.

---

## 2. Language policy

### 2.1 Code and repository

| Artifact | Language |
| -------- | -------- |
| Application source code | **English** |
| Identifiers (variables, functions, classes, types) | **English** |
| File and directory names | **English** |
| Commit messages | **English** |
| Internal developer docs, ADRs in repo, PR bodies | **English** |

### 2.2 User interface (end users)

- **Visible UI strings** must not live as hard-coded literals scattered in React components once i18n is in place for a screen.
- The product targets **three** UI languages:

  | Locale code | Language | Notes |
  | ----------- | -------- | ----- |
  | `en` | English | **Default** on first visit |
  | `ru` | Russian | Full parity expected for keys |
  | `tr` | Turkish | Full parity expected for keys |

- A **language selector** in the interface is planned; implementations should persist the user choice (e.g. local storage) without breaking SSR/hydration assumptions if applicable.
- **Portuguese** copy that exists today must be phased out from the codebase as the **primary** UX language—replaced by **English authoring** plus **Russian** and **Turkish** translation resources. Removing Portuguese is **content migration**, not arbitrary refactoring; do it in dedicated, small commits or PR slices.

---

## 3. Comments and documentation noise

- **Default: no comments in code.** Do not add comments “for clarity,” placeholders, TODO blocks, block dividers `---`, or restatements of obvious control flow.
- **When the stakeholder explicitly requests comments**, add short, factual **English** comments only where ambiguity or non-obvious invariants genuinely exist.
- `PROJECT_RULES.md` and `.cursor/rules/*` **are documentation**, not runtime code—they should stay clear and actionable.

---

## 4. Change discipline

### 4.1 What to avoid

- Random refactors, wide renames, or style-only churn across unrelated files.
- Rewriting entire modules “for cleanliness” unless there is **no safer minimal fix**.
- Installing dependencies without documenting **why** they are necessary and why simpler options were rejected.

### 4.2 What to prefer

- **Minimal diffs** that solve one problem clearly.
- Reuse existing patterns (Nest modules, hooks, Axios layer, Turborepo layout) unless there is an agreed architectural migration.
- **Production-realistic** choices: predictable error handling, no debug logs in demo paths unless debugging with the team.

---

## 5. Non-regression areas (explicit)

Treat the following as **high-risk**. Changes that touch these areas must be **narrow** and **verified**:

1. **Authentication** — JWT access/refresh, token storage assumptions, guarded routes.
2. **Routing** — React Router paths, loaders, redirects.
3. **API integration** — gateway base URL env, payloads, optimistic updates aligned with backend contracts.
4. **Realtime** — notifications / WebSockets / RabbitMQ-backed flows as exposed to the client.
5. **Kanban** — board layout, drag-and-drop, ordering, optimistic UI for moves.
6. **Tasks CRUD & lifecycle** — create, edit, delete, assign, status changes.
7. **Notifications** — creation triggers, unread state, realtime push.

Breaking any of these for a stylistic preference is unacceptable unless the ticket is explicitly to fix a defect there.

---

## 6. Dependencies

- Do not leave **unused** imports, variables, or packages.
- Any new dependency must:

  - solve a concrete problem aligned with roadmap (e.g. i18n), and  
  - be lightweight and commonly maintained—**explain the rationale** when proposing `package.json` changes.

---

## 7. Internationalization workflow (planned implementation)

Until i18n is fully wired:

1. Inventory hardcoded strings (page by page or route by route).
2. Introduce namespaces and keys consistent with UX domains (`auth.*`, `board.*`, `task.*`, …).
3. Replace literals with lookups from the chosen i18n layer.
4. Add `en`, `ru`, `tr` resource files/folders—**no orphaned keys** across shipped screens.
5. Add a compact **language switcher** and persist preference.
6. Migrate legacy Portuguese snippets to translations as separate, reviewable steps.

Technical choice of library is left to implementing tasks (**justify**—e.g. `i18next` ecosystem vs alternatives).

---

## 8. Collaboration workflow (agents and humans)

For **every task**, collaborators should:

1. **Inspect** relevant files before editing (no blind patches).
2. Author a **checkbox TODO list** before substantive changes and **update checkboxes as work progresses**—never skip tracking.
3. Avoid **scope creep**.
4. On completion, provide a short report:

   - **What changed** (outcomes).  
   - **Which files/directories**.  
   - **Manual QA checklist** (auth, Kanban moves, realtime, APIs as relevant).  
   - **Next recommended step.**

Cursor-specific automation of §8 lives in `.cursor/rules/workflow-rules.mdc`.

---

## 9. Where rules live

| Path | Audience |
| ---- | -------- |
| `.cursor/rules/project-rules.mdc` | Cursor — core constraints (always applied) |
| `.cursor/rules/workflow-rules.mdc` | Cursor — process (always applied) |
| `.cursor/rules/i18n-rules.mdc` | Cursor — i18n when editing web TS/TSX |
| `PROJECT_RULES.md` | Humans & onboarding |

---

## 10. Versioning mindset

These rules prioritize **maintainability and demo credibility** over speed-of-hacking. When in doubt: **smaller PR**, **no surprise behavior change**, **English code**, **string keys for UI**, protect **Kanban + auth + realtime**.
