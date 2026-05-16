# DBeaver → Railway PostgreSQL (shared database)

Use this to browse the **same** database as your local `npm run dev:railway-db` stack and your **deployed** Railway services. Do **not** point DBeaver at `127.0.0.1:5433` if you need that shared data — that is local Docker only.

All values below come from your machine’s **`.env.railway.local`** at the repo root (gitignored). Open the file locally and copy each field; **do not** commit this file or paste passwords into chat.

## New connection

| Field | What to enter |
|--------|----------------|
| **Connection type** | **PostgreSQL** |
| **Host** | Value of **`RAILWAY_DB_HOST`** (Railway **public / proxy** hostname, often `*.proxy.rlwy.net`) |
| **Port** | Value of **`RAILWAY_DB_PORT`** |
| **Database** | Value of **`RAILWAY_DB_NAME`** |
| **Username** | Value of **`RAILWAY_DB_USER`** |
| **Password** | Value of **`RAILWAY_DB_PASS`** (from your local `.env.railway.local` only) |

## SSL

- If **`DB_SSL=true`** in `.env.railway.local`, enable SSL/TLS in DBeaver (e.g. **SSL** tab: use SSL, or **require** / **prefer** depending on your driver — match your Railway connection requirements).

## After connecting

### Schemas to open

In the database navigator, expand **schemas** and use:

- `auth_service`
- `task_service`
- `notification_service`

### Tables to check

| Schema | Table |
|--------|--------|
| `auth_service` | `users` |
| `task_service` | `tasks` |
| `task_service` | `comments` |
| `task_service` | `task_history` |
| `notification_service` | `notifications` |

## SQL (verification)

**Users**

```sql
SELECT id, username, email, "createdAt"
FROM auth_service.users
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Tasks**

```sql
SELECT id, title, status, "creatorId", "createdAt"
FROM task_service.tasks
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Comments**

```sql
SELECT id, content, "taskId", "createdAt"
FROM task_service.comments
ORDER BY "createdAt" DESC
LIMIT 20;
```

**Task history**

```sql
SELECT id, task_id, action, changed_by, changed_at
FROM task_service.task_history
ORDER BY changed_at DESC
LIMIT 20;
```

**Notifications**

```sql
SELECT id, "userId", title, read, "createdAt"
FROM notification_service.notifications
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Updating credentials

If Railway rotates Postgres credentials, refresh `.env.railway.local` (e.g. `npm run sync:railway-env` when Railway CLI is linked) and update the same fields in DBeaver.
