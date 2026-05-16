# Database structure explanation

This document describes how data storage works in this monorepo. It reflects **repository inspection only** — no destructive operations, installs, or refactors were performed to produce it.

---

## Answers to the questionnaire

### 1. Which database is used?

**PostgreSQL** (`postgres` driver via **TypeORM**).

### 2. Where is the database defined?

- **Infrastructure:** Docker Compose service `db` in `docker-compose.yml` (`image: postgres:17.5-alpine3.21`, volumes, env).
- **Application wiring:** Each backend that uses Postgres configures TypeORM in `apps/<service>/db/datasource.ts`.
- **Logical layout:** PostgreSQL schemas are created during first DB init by `init.sql` (mounted into the container).

### 3. What is the database name?

**`challenge_db`** — set by `POSTGRES_DB` on the Postgres container and matched by `DB_NAME=challenge_db` for `auth-service`, `tasks-service`, and `notifications-service` in `docker-compose.yml`.

### 4. Username and password (local Docker)

From `docker-compose.yml`:

| Setting    | Value     |
|-----------|-----------|
| User      | `postgres`|
| Password  | `password`|

(Auth for RabbitMQ management is separate: `admin` / `admin`; that is **not** the Postgres password.)

### 5. Which Docker service runs PostgreSQL?

The Compose service **`db`** (container name **`db`**).

### 6. Which services connect to the database?

| Compose / app service        | Connects to PostgreSQL? |
|-----------------------------|--------------------------|
| `auth-service`              | **Yes** (TypeORM)        |
| `tasks-service`             | **Yes** (TypeORM)        |
| `notifications-service`     | **Yes** (TypeORM)        |

### 7. Which services do NOT connect directly to the database?

| Service        | Reason |
|----------------|--------|
| `web`          | Frontend; talks HTTP to the gateway only |
| `api-gateway` | Proxies REST → TCP/RPC to other services; no `DB_*` / no TypeORM in this arrangement |
| `rabbitmq`     | Message broker only |

### 8. Which schema belongs to each service?

| Service                    | PostgreSQL schema        | Config location |
|---------------------------|---------------------------|----------------|
| `@challenge/auth-service` | **`auth_service`**        | `apps/auth-service/db/datasource.ts` |
| `@challenge/tasks-service`| **`task_service`**       | `apps/tasks-service/db/datasource.ts` |
| `@challenge/notifications-service` | **`notification_service`** | `apps/notifications-service/db/datasource.ts` |

Schemas are created in `init.sql` (`CREATE SCHEMA IF NOT EXISTS …`).

### 9. Where are user accounts saved?

**Schema:** `auth_service`  
**Table:** **`users`** (entity: `apps/auth-service/src/user/entity/user.entity.ts`, `@Entity('users')`)

Stores: UUID `id`, `username`, `email`, `passwordHash`, `refreshTokenHash`, timestamps.

### 10. Where are tasks saved?

**Schema:** `task_service`  
**Table:** **`tasks`** (entity: `apps/tasks-service/src/task/entity/task.entity.ts`, `@Entity("tasks")`)

### 11. Where are comments saved?

**Schema:** `task_service`  
**Table:** **`comments`** (entity: `apps/tasks-service/src/comment/entity/comment.entity.ts`, `@Entity("comments")`), with a **many-to-one** relation to `Task` (`taskId`) and **`onDelete: "CASCADE"`** from task.

### 12. Where is task history saved?

**Schema:** `task_service`  
**Table:** **`task_history`** (entity: `apps/tasks-service/src/history/entity/task-history.entity.ts`, `@Entity("task_history")`)

Stores audit rows: `task_id`, `action` (`ActionType` enum), `changes` (JSON `old` / `new`), `changed_by`, `changed_at`.

### 13. Where are notifications saved?

**Schema:** `notification_service`  
**Table:** **`notifications`** (entity: `apps/notifications-service/src/notifications/entity/notification.entity.ts`, `@Entity("notifications")`)

Fields include `userId`, `title`, `content`, `read`, `createdAt`.

### 14. Which TypeORM entities exist?

| App                    | Entity file(s) |
|------------------------|----------------|
| auth-service           | `User` → `apps/auth-service/src/user/entity/user.entity.ts` |
| tasks-service          | `Task`, `Comment`, `TaskHistory` → under `apps/tasks-service/src/*/entity/` |
| notifications-service  | `Notification` → `apps/notifications-service/src/notifications/entity/notification.entity.ts` |

Shared enums used by entities/DTOs (e.g. `TaskPriority`, `TaskStatus`, `ActionType`) live in **`packages/types`** (`packages/types/enums/index.ts`).

### 15. Which migrations exist?

Repositories under each service:

**auth-service** (`apps/auth-service/db/migrations/`)

- `1764995289244-createUserTable.ts`
- `1765483388960-alterTableUserAddRefreshTokenHashAndPasswordHash.ts`

**tasks-service** (`apps/tasks-service/db/migrations/`)

- `1765044450524-createTasksTable.ts`
- `1765208180948-alterTableTasksAddAssignees.ts`
- `1765217182623-createTableComments.ts`
- `1765495680814-createTableTaskHistory.ts`

**notifications-service** (`apps/notifications-service/db/migrations/`)

- `1765285176813-createTableNotifications.ts`

### 16. How are migrations executed?

1. **TypeORM CLI** is wired via workspace scripts in each service’s `package.json` (`migration:run` runs `npm run typeorm -- migration:run` with datasource `db/datasource.ts`).
2. **Local Docker Compose (intended path):** `docker-compose.yml` runs for each DB-owning service, before Nest starts:

   `npm run migration:run --workspace=@challenge/<service>`

See also `DATABASE_CONNECTION_REPORT.md` for command examples (`docker compose exec …`).

**Current datasource note:** In the repository **as inspected**, each `apps/*/db/datasource.ts` has `migrationsRun: false` but **`synchronize: true`**. That means TypeORM can **auto-sync** schema from entities at startup, which bypasses migrations for DDL in practice. (`DATABASE_CONNECTION_REPORT.md` describes the earlier “migrations-first” Compose story.) For predictable environments, migrations should remain the DDL source of truth once `synchronize` is turned off again (policy decision).

### 17. How does data flow when a user registers?

1. Browser → **`POST /api/auth/register`** on **API Gateway** (`apps/api-gateway/src/auth/auth.controller.ts`).
2. Gateway → **`auth.register`** TCP message to **auth-service**.
3. **AuthController** (`MessagePattern`) → **AuthService.register** → **UserService.create**.
4. **UserService** hashes password and **`userRepository.save(...)`** → row in **`auth_service.users`**.
5. Tokens generated; **`refreshTokenHash`** updated on same user row.
6. Response (tokens + user DTO) returns through gateway — **no direct DB access** from gateway or web.

### 18. How does data flow when a user logs in?

1. **`POST /api/auth/login`** → gateway → **`auth.login`** → **AuthService.login**.
2. **UserService.getByEmail** reads **`auth_service.users`**.
3. bcrypt compare; JWTs minted; **refresh token hash** stored on **users** row.
4. Tokens returned via gateway.

### 19. How does data flow when a task is created?

1. Authenticated **`POST /api/tasks`** on gateway attaches **`creatorId`** from JWT (`TasksController`).
2. Gateway sends **`task.create`** to **tasks-service**.
3. **TaskService.create** → **`taskRepository.save(dto)`** → **`task_service.tasks`**.
4. **No history row or RabbitMQ emit** occurs in **`TaskService.create`** in the current code (creation audit / `task.created` event is **not** wired there).

### 20. How does data flow when a task is moved?

Kanban moves map to **`PATCH /api/tasks/:id`** updating fields (typically **`status`**).

1. Gateway → **`task.update`** with `UpdateTaskPayload` (`taskId`, `authorId`, changed fields).
2. **TaskService.update** loads task, computes **diff**, then **`saveHistory`** → **`task_service.task_history`** with **`STATUS_CHANGE`** or **`UPDATE`**.
3. **Task row** persisted with new values **`task_service.tasks`**.
4. **notifyUpdate** emits **`task.updated`** on RabbitMQ to **notifications-service** recipients (excluding author).

Assign/unassign and comments also write **`task_history`** and emit **`task.assigned`**, **`task.updated`**, or **`task.comment`**.

### 21. How does RabbitMQ relate to the database?

- **tasks-service** is both a **PostgreSQL writer** for tasks/comments/history and an **RMQ publisher** (`ClientProxy.emit`) for notification-related events (`NOTIFICATION_SERVICE` client in `task.module.ts` / `comment.module.ts`).
- **notifications-service** consumes from queue **`notifications_queue`** (`apps/notifications-service/src/main.ts`), handles **`task.assigned`**, **`task.updated`**, **`task.comment`** (`EventPattern`s in `notifications.controller.ts`).
- Handling methods call **`NotificationsService`** which **persists rows** into **`notification_service.notifications`** and pushes **WebSocket** events via the gateway.

RabbitMQ is **not** a substitute for Postgres for core domain entities; it **couples** tasks activity to asynchronous notification persistence + realtime push.

### 22. Does RabbitMQ store permanent data or only pass events?

- **Queues** are declared with **`queueOptions: { durable: false }`** in Nest RMQ configs (messages are **not** guaranteed long-term persistence on the broker the way durable queues imply).
- **Permanent user-facing notification history** intended for this app is in **PostgreSQL** (`notifications` table), written when events are processed successfully.

So: RabbitMQ carries **delivery of events**; durable business record for notifications is **the database**.

### 23. If I want to add a new field to tasks, where should I change it?

1. **`apps/tasks-service/src/task/entity/task.entity.ts`** — add the TypeORM `@Column()` (and relations if needed).
2. **`packages/types`** — extend **`CreateTaskDto` / `UpdateTaskDto` / payloads** if the API should accept or return the field (`packages/types/dto/tasks/`).
3. **Gateway** Swagger/DTO imports pick up `@challenge/types` — usually no duplication if DTO lives in packages.
4. **Frontend** — forms, API typings, Kanban/task detail UI as needed (`apps/web/...`).
5. **Migration** — add a migration under **`apps/tasks-service/db/migrations/`** (recommended once `synchronize` is disabled for DDL control).

### 24. If I want to add tags to tasks, what files would need to change?

**Facts:** **`Task`** has **no tags** column/array and **`CreateTaskDto`** / **`UpdateTaskDto`** expose **no tag field**. i18n keys such as **`board.tags`** are **UI-only** placeholders, not persisted types.

Likely touches:

- `apps/tasks-service/src/task/entity/task.entity.ts` (e.g. `simple-array` or junction table entity).
- New migration in **`apps/tasks-service/db/migrations/`** (recommended).
- **`packages/types/dto/tasks/create-task.dto.ts`** and **`update-task.dto.ts`** (+ any response DTO if returned to client).
- **`TaskService`** and possibly query filters in **`getAll`**.
- **`apps/web`** Kanban/task detail/search components.
- If tags are normalized: possibly **new table** relations and repository methods.

### 25. If I want to add a new table, where should I create the entity and migration?

- Put the **`@Entity()`** classnext to related domain code under the owning service (**`apps/<service>/src/...`**), using the correct **`schema`** from that service’s `datasource.ts`.
- Generate/add a **`MigrationInterface`** under **`apps/<service>/db/migrations/`** for that schema.
- Register entity path indirectly via **`dist/**/*.entity.js`** builds (ensure build output picks up entity).

Cross-service FKs across schemas are uncommon here; prefer **IDs** referencing users/tasks from other schemas without Postgres-level FK constraints unless you deliberately design composite ownership.

### 26. Should I edit SQL manually or create a TypeORM migration?

For this repo pattern:

| Approach              | Recommendation |
|----------------------|----------------|
| **Ad-hoc `psql`**    | Okay for **exploration** or **safe** bootstrap like `init.sql` already in repo — avoid one-off DDL in production without versioning |
| **TypeORM migrations** | **Preferred** for team review, repeatable deploys, rollback story |

Manual SQL for **schemas** duplicates what `init.sql` already establishes; coordinate if you extend schema creation.

### 27. Safest way to add database changes in this project?

1. **Design** schema change in entity + migrations under the **correct service schema**.
2. **Run migrations** locally (Compose or `npm run migration:run --workspace=@challenge/tasks-service`) and verify `\dt <schema>.*`.
3. **Avoid** disabling constraints or rewriting production volumes without backups.
4. **Align environments:** if **`synchronize: true`** remains on any env, DDL can diverge silently from migrations — prefer **`synchronize: false`** plus migrations for deterministic deploys.
5. **Cross-service IDs:** preserve UUID strings consistently (auth IDs used as `creatorId`, `assignees`, notification `userId`).

### 28. Commands to inspect the database (Docker)

From repo root, with Compose stack running:

```bash
docker compose ps db
docker inspect --format '{{.State.Health.Status}}' db
docker compose exec db psql -U postgres -d challenge_db -c "SELECT version();"
docker compose exec db psql -U postgres -d challenge_db -c "\dn"
```

### 29. Commands to see tables

```bash
docker compose exec db psql -U postgres -d challenge_db -c "\dt auth_service.*"
docker compose exec db psql -U postgres -d challenge_db -c "\dt task_service.*"
docker compose exec db psql -U postgres -d challenge_db -c "\dt notification_service.*"
```

### 30. Commands to see users / tasks / notifications data

**Users (auth)**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, username, email, "createdAt" FROM auth_service.users LIMIT 20;'
```

**Tasks**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, title, status, "creatorId" FROM task_service.tasks LIMIT 20;'
```

**Notifications**

```bash
docker compose exec db psql -U postgres -d challenge_db -c 'SELECT id, "userId", title, read, "createdAt" FROM notification_service.notifications LIMIT 20;'
```

Avoid dumping password hashes unnecessarily in screenshots or logs.

### 31. What should I avoid so I don’t break the database?

- **`docker compose down -v`** or deleting **`postgres_data`** volume without backup (`init.sql` re-runs, **data is wiped**).
- Editing **`postgres_data`** externally while containers run.
- **Conflicting DDL:** `synchronize: true` + manual DB edits / partial migrations causing drift or duplicate objects.
- **Wrong `DB_NAME` / schema:** datasource falls back to `postgres` DB if env unset (`database: process.env.DB_NAME || 'postgres'`) — different from Compose’s `challenge_db`.
- **`uuid` dependency:** migrations reference `uuid_generate_v4()` — Postgres needs **`uuid-ossp`** (often added in migration/extension steps; verify migrations ran if insert fails).

---

## Diagram: request path vs persisted data

```
Frontend (@challenge/web)
        │  HTTPS (REST)
        ▼
API Gateway (@challenge/api-gateway)
        │
        ├── TCP / ClientProxy ──► Auth Service ──► PostgreSQL `auth_service`
        │
        └── TCP / ClientProxy ──► Tasks Service ──► PostgreSQL `task_service`
                        │
                        └── RMQ emit ─────────────► Notifications Service
                                      ├──► PostgreSQL `notification_service`
                                      └──► WebSocket to clients
```

---

## Schema reference

### `auth_service`

| Table      | Purpose |
|-----------|---------|
| **`users`** | Registered accounts: credentials, JWT refresh hashing, timestamps |
| **`migrations`** | TypeORM migration history (see `migrationsTableName` in datasource) |

### `task_service`

| Table           | Purpose |
|----------------|---------|
| **`tasks`**     | Kanban task rows (title, description, enums, assignees[], deadline, creator, timestamps) |
| **`comments`**  | Comments on tasks; FK to task (`CASCADE` delete) |
| **`task_history`** | Audit log of changes (assignment, status, updates, comments, deletes) |
| **`migrations`** | TypeORM migration history |

PostgreSQL enums for task priority/status are created by migrations (e.g. `tasks_priority_enum`, `tasks_status_enum`).

### `notification_service`

| Table               | Purpose |
|--------------------|---------|
| **`notifications`** | Per-user persisted notification records + read flag |
| **`migrations`**    | TypeORM migration history |

---

## Feature honesty (requirements check)

| Item | Status in this codebase |
|------|-------------------------|
| **Tags on tasks** | **Not modeled** — no `tags` on `Task`; i18n has a “tags” label for UI strings only |
| **Automation rules persisted** | **Not present** — no automation tables or entities inspected |
| **Admin / per-board column configuration in DB** | **Not present** — columns derive from **`TaskStatus`** enum in frontend (`KanbanBoard` / `TaskDetailHeader`) |
| **`task.created` event** | **Partial** — **`notifyTaskCreated`** exists in **`NotificationsService`** but **notifications controller has no `@EventPattern('task.created')`**, and **`TaskService.create` does not emit** that event (`PROJECT_ANALYSIS_REPORT.md` aligns with this) |
| **Supabase** | **Not required** — self-hosted Postgres + TypeORM (`DATABASE_CONNECTION_REPORT.md`) |

---

## Recommended next database step

**Restore “migrations-first” DDL as the single source of truth:** set **`synchronize: false`** in all three `datasource.ts` files (after confirming `init.sql` + migrations run cleanly in every deployment path — Docker Compose and any cloud override), run **`migration:show`** before deploy, and reserve **`synchronize: true`** only for throwaway demo DBs.

This minimizes surprise schema drift (especially harmful for hackathon demos and parallel Railway/Docker setups) while keeping **`init.sql`** for schema namespace creation only.
