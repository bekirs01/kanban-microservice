# Railway: deploy variables checklist

Set these in the Railway dashboard **per service** (or reference a shared Postgres / RabbitMQ plugin). Align **`JWT_SECRET`** across **api-gateway**, **auth-service**, and **notifications-service**.

## Web (`@challenge/web`)

- `VITE_API_URL` = `https://<api-gateway-public-url>`
- `VITE_WEBSOCKET_URL` = `https://<notifications-service-public-url>`

## API gateway (`@challenge/api-gateway`)

- `AUTH_SERVICE_HOST`, `AUTH_SERVICE_PORT`
- `TASKS_SERVICE_HOST`, `TASKS_SERVICE_PORT`
- `JWT_SECRET`
- `CORS_ORIGINS` = `https://challengeweb-production.up.railway.app` (or your production web URL)

## Postgres (same logical database for all services below)

Reference Railway Postgres variables so each service receives:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASS`
- `DB_NAME`
- `DB_SSL` = `true` when the driver must use TLS to Railway Postgres

## Auth service

- `DB_*` and `DB_SSL` (as above)
- `JWT_SECRET`

## Tasks service

- `DB_*` and `DB_SSL`
- `RABBITMQ_URI`

## Notifications service

- `DB_*` and `DB_SSL`
- `JWT_SECRET`
- `RABBITMQ_URI`

If the CLI cannot list your project, use the Railway UI to confirm each variable on each service.
