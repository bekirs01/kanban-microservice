# Real-time Kanban visibility — fix report

## Root cause

1. **API filtering:** `tasks-service.getAll` only returned rows where `creatorId === userId` OR `assignees` contained the user. After a websocket-driven refetch, **User B never received User A’s tasks** from `GET /api/tasks`.
2. **Cache refresh robustness:** Board sync already ran `invalidateQueries` on `["tasks"]`, which usually matches `[ "tasks", filters ]`; this was tightened to a **predicate** plus **active refetch** so every task-related observer updates reliably within the debounced window (~200 ms).

`board:changed` was already emitted globally (`server.emit`). The main functional gap was the **narrow list API**, not Socket.IO absence.

---

## Changed files

| Area | Path |
|------|------|
| Shared pagination DTO | `packages/types/dto/pagination/pagination-query.dto.ts` |
| Tasks list backend | `apps/tasks-service/src/task/task.service.ts` |
| Queries / mutations | `apps/web/src/hooks/useTasks.ts` |
| WebSocket sync | `apps/web/src/hooks/useWebSocket.ts` |
| Kanban caller | `apps/web/src/pages/KanbanPage.tsx` |

---

## Backend: shared board listing

- **Query:** `GET /api/tasks?sharedBoard=true&page=&limit=` (validated via `PaginationQueryDto.sharedBoard`).
- **Behavior:** When `sharedBoard === true`, the list returns **all** tasks (pagination unchanged). When omitted/false, the previous creator/assignee filter remains.

The Kanban page passes `sharedBoard: true` through `tasksService.getTasks` query params.

---

## Frontend: query invalidation

- **Debounced (~200 ms)** handler runs on: `board:changed`, `task:moved`, `task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new`.
- **Steps:** `invalidateQueries({ predicate })` where the first segment of `queryKey` is **`tasks`** (`TASKS_QUERY_ROOT`) or **`task`**, then **`refetchQueries({ type: "active", same predicate })`**.
- **Central key:** exported `TASKS_QUERY_ROOT = "tasks"` in `useTasks.ts`.

---

## Event names used (unchanged)

| Layer | Names |
|--------|--------|
| RabbitMQ → notifications | `task.created`, `task.updated`, `task.deleted`, `task.assigned`, `task.comment` |
| Socket.IO — global board | `board:changed`, `task:moved` |
| Socket.IO — per-room toasts | `task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new` |

---

## Manual test expectation

With `npm run dev:railway-db`, two browsers, two users:

1. A creates → B sees card without reload (`sharedBoard` + websocket refetch).
2. A moves → B column updates (`board:changed` / invalidate).
3. A edits → B updates after refetch.
4. A deletes → B card disappears (`GET` no longer returns it).

---

## Remaining limitations

- **`GET /api/tasks`** without `sharedBoard` retains the legacy restricted list (backward compatible).
- **`GET /api/tasks/:id`** is still unscoped; unrelated pages are unchanged.
- **Authorization:** Hackathon/demo choice: listing is auth-only; any logged-in user can see all tasks when `sharedBoard=true`.
