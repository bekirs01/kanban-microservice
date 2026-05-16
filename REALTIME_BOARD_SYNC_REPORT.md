# Real-time Kanban board sync — report

## Summary

Cross-user board updates use **RabbitMQ** (`notifications_queue`) from **tasks-service** into **notifications-service**, which persists optional in-app notifications and **broadcasts Socket.IO** (`board:changed`, `task:moved`, per-user `task:*` events). The **web** app **debounces React Query invalidation** (`tasks` / `task` keys) and **mutes toasts** when `actorId` matches the logged-in user (from `localStorage.user`).

---

## Changed files

| Area | File |
|------|------|
| Types | `packages/types/payloads/notifications/task-notification.payload.ts` |
| Types | `packages/types/dto/notification/response-notification.dto.ts` |
| Tasks service | `apps/tasks-service/src/task/task.service.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.controller.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.service.ts` |
| Notifications | `apps/notifications-service/src/notifications/notifications.gateway.ts` |
| Notifications tests | `apps/notifications-service/src/notifications/notifications.service.spec.ts` |
| Frontend | `apps/web/src/hooks/useWebSocket.ts` |
| Tracking | `DEVELOPMENT_TODO.md` |

---

## RabbitMQ events (tasks-service → notifications_queue)

| Pattern | When |
|---------|------|
| `task.created` | After task save |
| `task.updated` | After update with history, and on unassign flow |
| `task.deleted` | Before row delete (snapshot in payload) |
| `task.assigned` | Assignee added (unchanged pattern name) |
| `task.comment` | New comment (existing) |

Payload: `TaskNotificationPayload` with required **`actorId`**, optional `creatorId`, `timestamp`, **`recipients`**, **`task`** snapshot (id, title, status, assignees, creatorId, priority, deadline ISO), **`action`** (`ActionType`).

---

## Socket.IO events (notifications-service → clients)

| Event | Audience | Purpose |
|-------|----------|---------|
| `board:changed` | **All** connected clients | Triggers debounced invalidate of task queries |
| `task:moved` | **All** connected clients | Fired when payload `action` is `ActionType.STATUS_CHANGE` in `notifyTaskUpdated` |
| `task:created` | Per-recipient rooms | Toast + persists notification (assignees/other recipients) |
| `task:updated` | Per-recipient rooms | Toast + persists |
| `task:assigned` | Per-recipient rooms | Fixed from previous `task:updated` misuse for assigns |
| `task:deleted` | Per-recipient rooms | Toast + persists |
| `comment:new` | Per-recipient rooms | Unchanged semantics + board sync |

Broadcast DTO shape: **`KanbanBoardChangeDto`** (`actorId`, `reason`, optional `taskId` / `status`, `timestamp`).

Movement DTO: **`TaskMovedSocketDto`**.

---

## Frontend cache strategy

- **`board:changed`** and **`task:moved`**: schedule a **single debounced invalidation** (400 ms): `invalidateQueries({ queryKey: ["tasks"], exact: false })` and `["task"]` similarly.
- **Per-user events** (`task:created`, `task:updated`, `task:deleted`, `task:assigned`, `comment:new`): **same scheduled invalidation** so the board catches updates even when the client is not a named “recipient”.
- Existing **`comment:new`** still invalidates **`taskHistory`**.

---

## Duplicate updates / toast spam avoidance

- **Toasts**: If `payload.actorId` equals the parsed id from **`localStorage` `user`**, the client **skips** the toast (the mutator already shows success where applicable).
- **Refetch storm**: Debounced invalidation batches rapid `board:changed` + `task:moved` + per-user events.

---

## Manual test checklist

1. Open `http://localhost:3000` in two browsers (two users logged in).
2. **Create** a task in A → B’s board updates without refresh (if B’s API list includes that task per **creator/assignee** rules).
3. **Move** a task in A → B updates column without refresh.
4. **Edit** title/priority/deadline in A → B sees changes after refetch.
5. **Delete** in A → B sees card disappear when the task was in B’s list.
6. **Comment** in A → B gets notification path + history/comment refresh behavior.
7. Confirm **no double toast** for the user who performed the action (only success from mutation where present).

---

## Remaining limitations

- **Task list scope**: `GET /tasks` only returns tasks where the user is **creator** or **assignee**. Real-time refetch cannot show another user’s private tasks on B’s board until B is added as assignee or creates shared visibility.
- **Deploy**: Local and production must share the same **RabbitMQ** for cross-instance fan-out, or use a managed broker; otherwise only users on the same notifications instance receive events.
- **Ordering**: Debounce means sub-400 ms bursts collapse to one refetch (acceptable for hackathon demo).
