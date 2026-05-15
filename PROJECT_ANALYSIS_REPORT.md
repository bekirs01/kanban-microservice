# Project analysis report

**Scope:** Static inspection of the repository layout, configuration, and selected source files. No runtime tests were executed. No application code was modified.

**Reference docs read:** `PROJECT_RULES.md`, `HACKATHON_CASE_REQUIREMENTS.md`, `I18N_IMPLEMENTATION_PLAN.md`, `DEVELOPMENT_TODO.md`, `README_IMPROVEMENT_PLAN.md`, root `package.json`, `docker-compose.yml`, `README.md` (header and architecture sections).

---

## 1. Detected frontend framework

- **React 19** with **TypeScript**
- **Vite 7** as the build/dev server (`apps/web/package.json`, scripts `vite`, `vite build`)
- **TanStack Router** for routing (`@tanstack/react-router`)
- **TanStack Query** for server state (`@tanstack/react-query`)
- **Tailwind CSS 4** (`tailwindcss`, `@tailwindcss/vite`)
- **@dnd-kit** for drag-and-drop on the board
- **socket.io-client** for WebSocket connectivity to the notifications service

---

## 2. Detected backend framework

- **NestJS** (Node 20 in Dockerfiles; microservice `ClientProxy` / `MessagePattern` / `EventPattern` usage)
- **Monorepo** managed with **npm workspaces** and **Turborepo** (root `package.json`, `turbo` devDependency)
- Deployable apps under `apps/`:
  - `api-gateway` — HTTP REST entry
  - `auth-service` — TCP microservice + HTTP health
  - `tasks-service` — TCP microservice + HTTP health + RabbitMQ client
  - `notifications-service` — HTTP + WebSocket + RabbitMQ consumer

---

## 3. Detected database

- **PostgreSQL** — `docker-compose.yml` service `db` uses image `postgres:17.5-alpine3.21`
- **ORM:** **TypeORM** (task entity decorators; root dependencies include `typeorm`)
- **Schema isolation:** Per-service PostgreSQL schemas (`auth_service`, `task_service`, `notification_service`) as described in `README.md`

---

## 4. Detected real-time technology

- **Socket.IO** — Server: NestJS `@WebSocketGateway` in notifications service (`apps/notifications-service` compiled output references `socket.io`; gateway uses JWT auth via handshake). Client: `socket.io-client` in `apps/web/src/hooks/useWebSocket.ts`, env **`VITE_WEBSOCKET_URL`** (compose default `http://localhost:3004`).
- **Purpose today:** Push **notification** payloads and drive **toasts** + selective **React Query invalidation** (e.g. comment events). It is **not** the same as full live mirroring of the tasks query cache for every board change (see §15 and §16).

---

## 5. Detected queue / message broker technology

- **RabbitMQ** — `docker-compose.yml` service `rabbitmq` (`rabbitmq:3.13-management-alpine`), ports `5672` / `15672`, default credentials `admin` / `admin`
- **NestJS RMQ transport** — `tasks-service` registers `NOTIFICATION_SERVICE` with `Transport.RMQ` and queue `notification_queue` (`apps/tasks-service/src/task/task.module.ts`)
- **Kafka:** No application-level Kafka configuration was found under `apps/` source trees in this pass (broker choice is **RabbitMQ** for inter-service async messaging in this repo).

---

## 6. Main folders

| Path | Role |
| ---- | ---- |
| `apps/web/` | React SPA (Kanban UI, auth pages, WebSocket hook) |
| `apps/api-gateway/` | HTTP API aggregating calls to auth/tasks microservices |
| `apps/auth-service/` | Users, JWT, refresh tokens |
| `apps/tasks-service/` | Tasks, comments, history; emits RMQ events toward notifications |
| `apps/notifications-service/` | Consumes RMQ events; persists notifications; Socket.IO gateway |
| `packages/types/` | Shared DTOs, enums, payloads |
| `packages/exceptions/` | Shared RPC/HTTP exceptions |
| `packages/typescript-config/` | Shared TS configs |
| `packages/eslint-config/` | Shared lint config |
| `scripts/` | Root utilities (e.g. `seed.ts` referenced from root `package.json`) |
| Root | `docker-compose.yml`, Turborepo root, workspace `package.json` |

---

## 7. Main entry files

| Area | Entry / bootstrap |
| ---- | ----------------- |
| Web app | `apps/web/src/main.tsx` → `App`, `QueryProvider`, `AuthProvider` |
| Web routing | `apps/web/src/router.tsx` (TanStack Router: `/`, `/login`, `/register`, `/kanban`) |
| API gateway | `apps/api-gateway/src/main.ts` |
| Auth service | `apps/auth-service/src/main.ts` |
| Tasks service | `apps/tasks-service/src/main.ts` |
| Notifications service | `apps/notifications-service/src/main.ts` |

---

## 8. Existing Kanban-related files (representative)

- `apps/web/src/pages/KanbanPage.tsx` — Board page shell, header, create button, task list wiring
- `apps/web/src/components/KanbanBoard.tsx` — Columns by `TaskStatus`, drag-and-drop, column labels
- `apps/web/src/components/CreateTaskDialog.tsx` — Task creation UI
- `apps/web/src/components/TaskDetailDialog.tsx`, `TaskDetailsPanel.tsx`, `TaskDetailHeader.tsx` — Task detail UX
- `apps/api-gateway/src/tasks/` — HTTP controllers delegating to tasks microservice (pattern observable in repo layout; not every line audited)

---

## 9. Existing task-related files (representative)

**Backend**

- `apps/tasks-service/src/task/task.controller.ts` — RPC patterns: `task.create`, `task.update`, `task.delete`, `task.find_all`, etc.
- `apps/tasks-service/src/task/task.service.ts` — Core CRUD, history, assignment, comment orchestration; **RabbitMQ emits** for notifications
- `apps/tasks-service/src/task/entity/task.entity.ts` — TypeORM `Task` entity
- `apps/tasks-service/src/comment/` — Comment entity and service
- `apps/tasks-service/src/history/` — Task history entity and audit trail usage

**Frontend**

- `apps/web/src/services/tasks.service.ts` — HTTP client for tasks via gateway
- `apps/web/src/hooks/useTasks.ts` — Queries and mutations with `invalidateQueries` on success

**Shared contracts**

- `packages/types/dto/tasks/*.ts` — Create/update/response DTOs and payloads
- `packages/types/enums/index.ts` — `TaskStatus`, `TaskPriority`, `ActionType`

---

## 10. Existing notification-related files (representative)

- `apps/notifications-service/src/notifications/notifications.controller.ts` — `@EventPattern('task.assigned' | 'task.updated' | 'task.comment')`
- `apps/notifications-service/src/notifications/notifications.service.ts` — Persists notifications; builds **Portuguese** message strings; invokes gateway
- `apps/notifications-service/src/notifications/notifications.gateway.ts` — Socket.IO gateway (see dist/types in repo)
- `apps/web/src/hooks/useWebSocket.ts` — Connects with JWT; listens for `task:created`, `task:updated`, `task:assigned`, `comment:new`; shows **Sonner** toasts (Portuguese strings)
- `apps/web/src/components/ui/sonner.tsx` — Toast host

---

## 11. Existing authentication-related files (representative)

- `apps/web/src/pages/Login.tsx`, `Register.tsx`
- `apps/web/src/contexts/AuthContext.tsx`, `auth-context.ts`
- `apps/web/src/hooks/useAuth.ts`
- `apps/web/src/services/auth.service.ts`
- `apps/auth-service/src/` — NestJS auth domain (not fully enumerated here)
- `apps/api-gateway/src/auth/` — HTTP auth surface toward the gateway
- Router guards in `apps/web/src/router.tsx` — redirect unauthenticated users from `/kanban`

---

## 12. Existing language / i18n-related files

- **No** `i18next`, `react-i18next`, or project `i18n/` directory was found under `apps/web/src` (search: `i18n`, `i18next`, `useTranslation` → no matches).
- **Locale formatting:** `KanbanBoard.tsx` imports **`date-fns/locale` `ptBR`** for displayed dates — couples visible formatting to Portuguese locale.
- **Plan-only docs:** `I18N_IMPLEMENTATION_PLAN.md`, `.cursor/rules/i18n-rules.mdc`, `PROJECT_RULES.md` (policy) describe target **en / ru / tr** but implementation is **not** present in code from this audit.

---

## 13. Current UI language problem

- **README** and marketing text are largely **Portuguese** (e.g. subtitle “Sistema de Gerenciamento…”, “Visão Geral”).
- **Web UI strings** mix **English** (“Task Board”) with **Portuguese** (column titles “A Fazer”, “Conectado”, buttons “Sair”, “Nova Tarefa”, logout toast, WebSocket toasts and errors in `useWebSocket.ts`).
- **Notifications service** composes user-visible titles and bodies in **Portuguese** (`notifications.service.ts`).
- **Swagger / DTO documentation** in `packages/types` uses **Portuguese** `@ApiProperty` examples and descriptions (e.g. `CreateTaskDto`).
- **Target languages** per project rules are **English (default), Russian, Turkish** — current state is **misaligned** and **not centralized** in translation files.

---

## 14. Current hardcoded visible text problem

- Visible strings are embedded directly in **React components** (`KanbanPage.tsx`, `KanbanBoard.tsx`, dialogs, etc.) and in **`useWebSocket.ts`** toast calls.
- **Column labels** are a local `STATUS_LABELS` map in `KanbanBoard.tsx`, not translation keys.
- **Notification content** is generated server-side with string templates in Portuguese.
- No single **locale JSON** or key namespace exists yet; parity **en / ru / tr** cannot be achieved without structural work.

---

## 15. Missing features compared to hackathon requirements

Cross-check with `HACKATHON_CASE_REQUIREMENTS.md` (high level):

| Requirement area | Observation |
| ---------------- | ----------- |
| **Custom board columns / admin configuration** | Columns are fixed to `TaskStatus` enum (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`) in `KanbanBoard.tsx`. No admin UI or dynamic column configuration was identified. |
| **Task field: tags** | `Task` entity has **no** `tags` column; `CreateTaskDto` has **no** tags field — **tags are not modeled** end-to-end. |
| **Task field: explicit “tags” automation** | Cannot be demonstrated without tags. Priority `URGENT` exists as enum value but not same as hackathon “tag-based flags” unless mapped separately. |
| **Automation (rule-based moves, deadline reactions)** | Notifications exist for some events; **no** configurable rule engine or scheduled deadline workers were identified in this static pass. |
| **Event-driven: all four mandatory events as published + consumed** | RMQ handlers in notifications subscribe to **`task.assigned`**, **`task.updated`**, **`task.comment`** only. **`notifyTaskCreated`** exists in service but **no** `@EventPattern('task.created')` in controller; **`task.service` `create()`** does not emit a creation event in the audited snippet. **Delete path** — no Rabbit emit found in audited `delete()` flow. |
| **Queue ingestion pipeline (dedupe, validation, enrichment, DLQ narrative)** | RabbitMQ is used for **notification fan-out**, not audited as a full **inbound task** pipeline with deduplication/enrichment stages. REST/gateway task creation exists; **Kafka-style** ingress is **out of scope** in repo. |
| **Real-time: other users see board updates without refresh** | WebSocket handlers in `useWebSocket.ts` **do not** `invalidateQueries` for `["tasks"]` on `task:created` / `task:updated` (only `comment:new` touches history queries). Mutations invalidate locally **for the acting user**, but **observers may rely on refetch intervals, focus refetch, or manual refresh** — **gap vs strict “instant board sync”**. |
| **i18n (en, ru, tr)** | Not implemented (see §12–14). |
| **Admin capabilities** | No dedicated **admin** module for columns, automation rules, notification policies, or inbound flow control was identified in `apps/web` naming or obvious routes. |
| **Deployment proof** | `DEVELOPMENT_TODO` / README discuss Docker; **no** captured production URL or deployment checklist completion in repo from this audit. |

Items that **appear** substantially present: authenticated web app, Kanban columns matching default statuses, task CRUD API surface via gateway/RPC pattern, drag-and-move with optimistic patterns in board code path, histories and comments, PostgreSQL persistence, RabbitMQ + event consumers for some task-related signals, Socket.IO notifications.

---

## 16. Risks before editing

- **Realtime + React Query:** Adding `invalidateQueries` on socket events risks **request storms** or **jitter** unless debounced; must not break existing mutation flows.
- **Microservice contracts:** Changing DTOs or event names affects **gateway**, **tasks-service**, and **notifications-service** simultaneously.
- **Docker dev mounts:** Compose bind-mounts repo into services with anonymous `node_modules` volume — local **workspace package builds** (`packages/types`, `packages/exceptions`) must stay consistent with container runtime (documented in prior project context).
- **JWT + WebSocket:** `useWebSocket` ties reconnect to **refresh token** path; changes to auth storage or refresh semantics can **silently break** notifications.
- **Language migration:** Moving strings to i18n will touch **many UI files**; risk of **mixed locales** during transition if not done screen-by-screen.
- **Non-durable RMQ queue:** `queueOptions: { durable: false }` in tasks module — **may conflict** with “no message loss” storytelling unless framed honestly or improved.

---

## 17. Recommended next implementation step

1. **Close the highest-impact hackathon gap:** ensure **multi-user board synchronization** by invalidating or patching the **`["tasks"]`** React Query cache on relevant Socket.IO events (`task:updated`, `task:created`, and any future delete broadcast), with throttling if needed — **without** altering core drag-and-drop mutation semantics.
2. In parallel or next:** begin i18n scaffolding** per `I18N_IMPLEMENTATION_PLAN.md` (English keys first, then `ru`/`tr`), replacing Portuguese UI strings incrementally.
3. **Align backend notification events** with the hackathon list (wire **`task.created`** / **`task.deleted`** or document honestly as partial) before claiming full event-driven coverage in README.

---

## Document control

- **Generated:** repository analysis only; verify behavior in a running environment before marking related `DEVELOPMENT_TODO.md` implementation items complete.
