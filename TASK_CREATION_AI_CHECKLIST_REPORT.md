# Task Creation + Checklist + Demo AI Assistant — Report

## Summary

The "Create Task" modal was upgraded to a premium, full-width, two-column
dialog with:

- Title + multi-line description.
- Priority selector.
- Deadline with **date and exact time** (`datetime-local`).
- Step-by-step **Checklist** ("Шаги выполнения") that is editable before
  creating the task.
- Local **AI Task Assistant** ("AI-помощник") that drafts title,
  description, priority, deadline and checklist from a natural-language
  prompt — fully deterministic, no external API call.

Checklist items are persisted in PostgreSQL as a `jsonb` column on
`task_service.tasks` and surface again in the Task Detail dialog, where
admins and assignees can tick items off. The Kanban card progress bar
now reflects checklist completion when a checklist exists, falling back
to the previous status-based percentage otherwise.

All other flows (auth, RBAC, drag-and-drop, comments, history,
attachments, archive, real-time WS) were preserved without refactor.

---

## Changed files

### Shared types
- `packages/types/dto/tasks/create-task.dto.ts`
  - Added `TaskChecklistItemDto` (id, title, completed).
  - `CreateTaskDto` now has optional `checklist: TaskChecklistItemDto[]`.
  - `UpdateTaskDto` automatically inherits it via `PartialType`.
- `packages/types/dto/tasks/response-task.dto.ts`
  - Exported `TaskChecklistItem` interface.
  - `ResponseTaskDto` now exposes optional `checklist`.

### Tasks microservice
- `apps/tasks-service/src/task/entity/task.entity.ts`
  - New `checklist` JSONB column (`NOT NULL DEFAULT '[]'`).
- `apps/tasks-service/src/task/task.service.ts`
  - `sanitizeChecklist()` normalizes input (caps length, regenerates
    missing ids, drops empty titles, limits to 50 items × 200 chars).
  - `create()` sanitizes checklist before persisting.
  - `update()` sanitizes checklist for both admins and assignees.
  - `USER` role (worker) is now allowed to send `status` **and**
    `checklist` updates (assignee toggling checklist items is the
    intended UX). All other admin-only fields stay blocked.
- `apps/tasks-service/db/migrations/1768000000000-alterTableTasksAddChecklist.ts`
  - Safe `ADD COLUMN IF NOT EXISTS "checklist" jsonb NOT NULL DEFAULT '[]'`.
  - Reversible via `DROP COLUMN IF EXISTS`.

### Web app
- `apps/web/src/lib/aiTaskAssistant.ts` (new)
  - Local deterministic generator: detects RU/EN, keywords (dishes,
    presentation, auth, urgency), produces title / description /
    priority / `datetime-local` deadline / checklist.
- `apps/web/src/components/CreateTaskDialog.tsx`
  - Full redesign: 920px two-column layout, premium card, dedicated
    AI Assistant block, checklist builder with add/remove/edit,
    `datetime-local` deadline input, polished empty state.
- `apps/web/src/components/TaskChecklist.tsx` (new)
  - Shown in task detail: progress bar, toggleable checkboxes for
    admin + assignees, admin-only add/remove, inline RBAC, optimistic
    updates with toast rollback on failure.
- `apps/web/src/components/TaskDetailDialog.tsx`
  - Renders `<TaskChecklist />` between description and comments.
- `apps/web/src/components/TaskDetailsPanel.tsx`
  - Deadline display + edit input switched to date **and** time.
- `apps/web/src/components/KanbanBoard.tsx`
  - Progress bar uses checklist completion when present, status-based
    fallback otherwise.
- `apps/web/src/lib/taskDetailUtils.ts`
  - New `formatFriendlyDateTime()` formatter.
  - `mapTaskToForm()` outputs `datetime-local` strings (was date-only).
- `apps/web/src/lib/schemas.ts`
  - `buildCreateTaskSchema` now allows optional `checklist`.
- `apps/web/src/i18n/locales/{ru,en,tr}.ts`
  - New keys under `createTask.*` and `task.*` for the assistant,
    checklist, deadline help text.

No other pages, routes, hooks, or socket logic were touched.

---

## Database

- **Migration needed:** yes (`1768000000000-alterTableTasksAddChecklist.ts`).
- **New column:** `task_service.tasks.checklist` — `jsonb NOT NULL DEFAULT '[]'`.
- **Structure:** `[{ id: string, title: string, completed: boolean }]`.
- **Backward compatibility:** all old tasks read back `checklist === []`.
  The column was added with a default, so existing rows do not need to
  be backfilled.
- `synchronize: true` is currently enabled in
  `apps/tasks-service/db/datasource.ts`, so the column is created
  automatically on next service start. The migration file is provided
  for environments where `synchronize` is off (production).

### Run the migration explicitly (optional)
```
cd apps/tasks-service
npm run migration:run
```
This uses the existing TypeORM data source and respects the
`.env.railway.local` / `.env` setup without printing secrets.

---

## How deadline date + time is saved

- UI: `<Input type="datetime-local" />` in both Create modal and Task
  detail edit panel.
- Submit: the form's local string is passed through
  `new Date(data.deadline)` so the JS engine attaches the local
  timezone before stringifying.
- Wire: `CreateTaskDto.deadline` is validated as `IsDateString` (ISO
  8601) and stored in the existing `timestamp` column.
- Read: server returns ISO; the client formats with
  `formatFriendlyDateTime()` (e.g. `"Завтра · 18:00"` or
  `"23 May 26 · 20:00"`).

---

## How checklist is saved

- UI: built locally with React state (`TaskChecklistItem[]`).
- Submit: sent to the gateway under the regular `POST /tasks` body.
- Validation: class-validator at the gateway (`@ValidateNested`,
  `@Type(() => TaskChecklistItemDto)` + `whitelist: true`).
- Service: `sanitizeChecklist()` re-generates missing ids, trims/caps
  titles, removes empty rows, caps at 50 items.
- DB: stored verbatim in `tasks.checklist` (jsonb).
- Updates: assignees may toggle `completed`; admins may also
  add/remove items via `useUpdateTask` mutation.

---

## How the demo AI assistant works

- Pure local function in `apps/web/src/lib/aiTaskAssistant.ts`.
- No fetch, no key, no external request — verified at build time.
- Detects:
  - Language (Russian vs English) from Unicode range.
  - Predefined intents (dishes / presentation / auth bug).
  - Urgency hints (`urgent`, `срочно`, `tomorrow`, `завтра`, etc.).
  - Time of day hint (`demo`, `presentation`, `tonight` → 20:00).
- Returns a `AiTaskDraft` containing:
  - `title`, `description`, `priority`, `deadlineLocal`,
    `checklist[]`, `language`.
- The dialog applies the draft with `setValue(...)` so the user can
  still review and edit before clicking **Create task**.

---

## Test phrases for the AI Assistant

Type any of these in the "AI-помощник" textarea and press
**Сгенерировать**:

1. `You need to wash the dishes`  
   → Title "Wash the dishes", description about cleaning the kitchen,
   priority **MEDIUM**, deadline tomorrow 18:00, 5 checklist steps.
2. `Нужно подготовить презентацию к завтрашнему демо`  
   → Title "Подготовить презентацию к демо", description in Russian,
   priority **HIGH**, deadline tomorrow 20:00, 5 checklist steps.
3. `Fix auth bug before tomorrow`  
   → Title "Fix auth bug", priority **HIGH**, deadline tomorrow 18:00,
   5 checklist steps focused on auth-service.
4. Anything else → generic 5-step checklist, **MEDIUM** priority,
   deadline tomorrow 18:00 (or **HIGH/URGENT** if the text mentions
   urgency keywords).

---

## Builds run

```
npm run build --workspace=@challenge/types          # OK
npm run build --workspace=@challenge/tasks-service  # OK
npm run build --workspace=@challenge/api-gateway    # OK
npm run build --workspace=@challenge/web            # OK (vite build, no errors)
```

All four workspaces built successfully on this branch.

---

## What works now

- Premium two-column "Create task" modal with AI block and checklist.
- Deadline saved with **date + exact time** (datetime-local).
- Checklist items persisted in Postgres as `jsonb`, with default `[]`.
- Task detail dialog renders the checklist with progress bar.
- Admins can add/remove items, admins **and assignees** can toggle.
- Kanban card progress reflects checklist completion when present.
- Local demo AI assistant fills the draft without any network call.
- i18n keys provided in EN / RU / TR.
- Real-time updates: existing WebSocket flow already invalidates
  task queries, so checklist changes propagate without page reload.
- Existing routes, RBAC, comments, history, attachments, archive
  flows are untouched.

---

## Remaining limitations

- The AI assistant is intentionally deterministic and rule-based; it
  does not parse free-form deadline phrases like "next Friday at 15:00"
  beyond the documented heuristics (tomorrow at 18:00 / 20:00 / urgent).
- The history audit logs a generic `UPDATE` entry every time a
  checklist item is toggled, because the existing change detector
  compares arrays by reference. This is not a regression — it follows
  the existing audit semantics.
- Checklist items are not reorderable yet (grip icon is decorative).
  Add/remove/rename and toggle are fully functional.
- Kanban card still shows date only (no time) to keep the dense card
  layout readable; the full date + time is visible in task detail and
  in the "Upcoming 7 days" panel inherits the same data.
