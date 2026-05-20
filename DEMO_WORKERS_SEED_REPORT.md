# Demo Workers Seed Report

## Changed files

- `scripts/seed-demo-workers.cjs` — new idempotent seed script (host-side Node.js CommonJS).
- `package.json` — added the `seed:workers` npm script that runs the new script.
- `DEMO_WORKERS_SEED_REPORT.md` — this report.

No application source files (auth-service, api-gateway, web, types) were modified.
No migration files were added or changed.

## DB migration needed?

**No.** The existing schema already covers all required profile fields:

- `displayName varchar(120) NULL`
- `specialization varchar(32) NULL`
- `bio text NULL`
- `skills jsonb NULL`
- `avatarData text NULL`

(See `apps/auth-service/db/migrations/1770890000000-userProfileColumnsAndManagerRemoval.ts`
and `apps/auth-service/db/migrations/1770910000000-ensureUserProfileColumnsAgain.ts`.)

The `<img src={user.avatarData}>` pattern in the web app (`WorkersPage.tsx`,
`WorkerDetailPage.tsx`, `ProfilePage.tsx`) accepts any valid URL or data URL,
so a public avatar URL stored in `avatarData` renders directly as the profile photo.

## Seed script created?

**Yes** — `scripts/seed-demo-workers.cjs`. Highlights:

- Plain CommonJS Node.js, no TypeScript compilation required.
- Reads connection settings from `.env.railway.local` when present (Railway DB),
  otherwise falls back to the local Docker stack (`localhost:5433`, `challenge_db`,
  schema `auth_service`).
- Idempotent: looks up each user by lower-cased email **or** username; updates
  in place if found, inserts otherwise.
- Forces `role = 'USER'` on every row (never creates an ADMIN, never touches
  the existing ADMIN account).
- Hashes the demo password with `bcryptjs` (same algorithm/format the
  auth-service uses, `$2b$10$...`), so login works exactly like normal users.
- Final SELECT prints a per-row verification line.

## Users created/updated (exact list)

All five rows currently exist in `auth_service.users` with `role = USER`:

| # | Username             | Email                              | Display name        | Specialization | Skills                                      | Avatar |
|---|----------------------|------------------------------------|---------------------|----------------|---------------------------------------------|--------|
| 1 | `anna.smirnova`      | `anna.smirnova@example.com`        | Анна Смирнова       | FRONTEND       | React, TypeScript, UI, CSS                  | yes    |
| 2 | `maria.ivanova`      | `maria.ivanova@example.com`        | Мария Иванова       | BACKEND        | NestJS, PostgreSQL, TypeORM, API            | yes    |
| 3 | `ekaterina.petrova`  | `ekaterina.petrova@example.com`    | Екатерина Петрова   | QA             | Testing, QA, Bug reports, Regression        | yes    |
| 4 | `alina.kuznetsova`   | `alina.kuznetsova@example.com`     | Алина Кузнецова     | DESIGNER       | UI/UX, Figma, Design systems, Prototyping   | yes    |
| 5 | `dmitry.volkov`      | `dmitry.volkov@example.com`        | Дмитрий Волков      | DEVOPS         | Docker, Railway, CI/CD, Monitoring          | yes    |

Shared demo password (plain): `WorkerDemo123!`
Hashed and stored with bcrypt, never as plain text.

## Are passwords hashed?

**Yes.** Verified directly on a sample row:

```
SELECT "passwordHash" FROM auth_service.users WHERE email='anna.smirnova@example.com';
-> $2b$10$pdjWIS13Eb3xGEWPhqegs.AtqoACd1V6bLJEaLqg8V4n1cKRSfwfi
```

This is the standard bcrypt format (`$2b$10$...`) used elsewhere in
`apps/auth-service/src/user/user.service.ts` (`bcrypt.hash(password, 10)`),
so login through the existing auth flow will validate the hash normally.

## Are avatars saved?

**Yes.** Each user has a unique stable public avatar URL stored in
`avatarData`. Four female workers use the `lorelei` DiceBear style,
the one male worker uses the `avataaars` style. Sizes:

```
alina.kuznetsova  avatarData length = 108
anna.smirnova     avatarData length = 105
dmitry.volkov     avatarData length = 100
ekaterina.petrova avatarData length = 109
maria.ivanova     avatarData length = 105
```

The web app renders these directly via `<AvatarImage src={user.avatarData} />`.

## DB verification result

Final check executed against the running local Postgres
(`docker exec db psql -U postgres -d challenge_db`):

```
 username          | email                          | role | displayName        | specialization | avatar_len | skills_count
-------------------+--------------------------------+------+--------------------+----------------+------------+--------------
 alina.kuznetsova  | alina.kuznetsova@example.com   | USER | Алина Кузнецова    | DESIGNER       |    108     |      4
 anna.smirnova     | anna.smirnova@example.com      | USER | Анна Смирнова      | FRONTEND       |    105     |      4
 dmitry.volkov     | dmitry.volkov@example.com      | USER | Дмитрий Волков     | DEVOPS         |    100     |      4
 ekaterina.petrova | ekaterina.petrova@example.com  | USER | Екатерина Петрова  | QA             |    109     |      4
 maria.ivanova     | maria.ivanova@example.com      | USER | Мария Иванова      | BACKEND        |    105     |      4
```

Role distribution (whole `auth_service.users` table):

```
 role  | count
-------+-------
 ADMIN |   1
 USER  |   6
```

No `MANAGER` role exists anywhere. The previously existing ADMIN was untouched.

## Frontend / API verification result

Direct REST/UI verification could not be completed in this run because the
running `auth-service` / `api-gateway` / `tasks-service` / `notifications-service`
Docker containers were already `unhealthy` before this task started — their bind
mount points to an older directory (`/Users/bekirsucikaran/Desktop/kanban-microservice-main`)
that does not contain the current application source, so `api-gateway` returns
`ECONNREFUSED 172.18.0.4:3002` when calling `auth-service`.

This is a pre-existing local-environment issue (the containers were started
from a different folder), unrelated to the demo workers themselves. Once the
backend services are restarted against the current workspace (e.g.
`bash scripts/dev-backend.sh` from this repo root), the API will read the same
users that already exist in the database, so:

- `GET /api/admin/users` will return the 5 workers with `role = USER`.
- `GET /api/users/workers` (workers directory used by `WorkersPage.tsx`) will
  return them with `avatarData`, `displayName`, `specialization`, `skills` populated.
- The Admin page rows already render correctly off `username/email/role` only;
  the avatars show up wherever the UI passes `<AvatarImage src={user.avatarData} />`
  (Workers list, Worker detail, profile header).

Build sanity checks were executed and **all passed**:

```
npm run build --workspace=@challenge/types         -> OK
npm run build --workspace=@challenge/auth-service  -> OK (nest build)
npm run build --workspace=@challenge/api-gateway   -> OK (nest build)
npm run build --workspace=@challenge/web           -> OK (tsc -b && vite build)
```

## Exact command to rerun the seed

From the repository root:

```bash
npm run seed:workers
```

Equivalent direct call:

```bash
node scripts/seed-demo-workers.cjs
```

Connection mode is auto-detected:

- If `.env.railway.local` exists with `RAILWAY_DB_*` set, the script targets that DB.
- Otherwise it uses the local Docker DB defaults (`localhost:5433`, user
  `postgres`, db `challenge_db`).

The script is idempotent — running it again only updates the existing five
rows in place; it never duplicates them.

## Remaining limitations

1. Running `docker-compose` containers were already `unhealthy` before this
   task because the bind mount points to a stale directory
   (`kanban-microservice-main`). DB writes work fine (Postgres is independent
   of those services), but live API/UI verification needs the backend stack
   to be restarted against the current workspace. The seed scripts and DB
   contents are unaffected by this.
2. The avatars are remote URLs (DiceBear public API). If the demo is shown
   fully offline, those images won't load. The profile page UI continues to
   fall back to the user's initials via `AvatarFallback`. If a hard
   offline-proof demo is required, the next step is to swap each URL for a
   small base64 data URL via the existing profile patch endpoint (validated
   by `assertAvatarData`); the DB column type and the front-end rendering
   both already support this without further changes.
3. Display names are stored on the user row directly (`displayName`), exactly
   like the existing profile patch endpoint writes them. No separate "profile"
   table was introduced.
