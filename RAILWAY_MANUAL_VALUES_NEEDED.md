# Railway Postgres values (manual entry)

Use this if **Railway CLI** is not installed, you are not logged in (`railway login`), or the project is not linked (`railway link`).

Copy from **Railway dashboard → your project → Postgres → Variables** or **Connect / Data** (use the **public** connection if your app runs on your machine or in Docker on your Mac).

Fill `.env.railway.local` (create from `.env.railway.example`):

| Variable | Where to copy from |
|----------|---------------------|
| `RAILWAY_DB_HOST` | `PGHOST`, or the hostname from `DATABASE_PUBLIC_URL` (often `*.proxy.rlwy.net` for external access) |
| `RAILWAY_DB_PORT` | `PGPORT`, or the port from the same URL |
| `RAILWAY_DB_USER` | `PGUSER` |
| `RAILWAY_DB_PASS` | `PGPASSWORD` |
| `RAILWAY_DB_NAME` | `PGDATABASE` (often `railway`) |

**Public vs internal host**

- **Local Docker on your Mac** connecting **out** to Railway must use the **public / proxy** host and port (`DATABASE_PUBLIC_URL`), not `*.railway.internal`.
- **`DB_SSL=true`** is usually required for the public proxy endpoint.

Optional:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Align with `@challenge/api-gateway` and services on Railway if you share tokens |
| `RABBITMQ_URI` | Leave empty to use local Docker RabbitMQ in `npm run dev:railway-db` |
| `DB_SSL` | `true` when using Railway public Postgres through TLS |

Then run:

```bash
npm run dev:railway-db
```

Never commit `.env.railway.local`.

#### Automated alternative

If CLI works:

```bash
npm run sync:railway-env
```

This writes `.env.railway.local` from Railway (does not print secrets).
