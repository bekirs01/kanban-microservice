# Telegram private DM deadline reminders

## Changed files

- `apps/notifications-service/src/telegram/entity/telegram-deadline-reminder.entity.ts` (new)
- `apps/notifications-service/src/telegram/telegram-html.util.ts` (new)
- `apps/notifications-service/src/telegram/telegram-notification.service.ts` (new)
- `apps/notifications-service/src/telegram/task-deadline-query.service.ts` (new)
- `apps/notifications-service/src/telegram/deadline-reminder.service.ts` (new)
- `apps/notifications-service/src/telegram/deadline-reminder.scheduler.ts` (new)
- `apps/notifications-service/src/telegram/telegram-reminders.module.ts` (new)
- `apps/notifications-service/db/migrations/1772000000000-createTelegramDeadlineReminders.ts` (new)
- `apps/notifications-service/src/app.module.ts`
- `apps/notifications-service/src/notifications/notifications.module.ts`
- `apps/notifications-service/src/notifications/notifications.controller.ts`
- `scripts/telegram-test-reminder.cjs` (new)
- `.env.example` (new)
- `.env.railway.example`
- `docker-compose.yml`
- `docker-compose.railway-db.yml`
- `package.json`

## Migrations added

- `apps/notifications-service/db/migrations/1772000000000-createTelegramDeadlineReminders.ts`
  - Creates `notification_service.telegram_deadline_reminders`
  - Unique index on `(taskId, deadlineAt, chatId, reminderType)`

## Env variables added

| Variable | Purpose | Default |
|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | BotFather token (backend only) | — |
| `TELEGRAM_PERSONAL_CHAT_ID` | Your private Telegram user chat id | — |
| `TELEGRAM_REMINDER_WINDOW_HOURS` | Send when deadline is within this many hours | `24` |
| `TELEGRAM_REMINDER_SCAN_INTERVAL_MINUTES` | Periodic scan interval | `10` |

## Where `TELEGRAM_BOT_TOKEN` is used

- `apps/notifications-service/src/telegram/telegram-notification.service.ts` — reads env, calls Telegram Bot API `sendMessage` (never logged).
- `scripts/telegram-test-reminder.cjs` — test helper only (never prints token).

## Where `TELEGRAM_PERSONAL_CHAT_ID` is used

- `apps/notifications-service/src/telegram/telegram-notification.service.ts` — sole `chat_id` for `sendMessage`.
- `apps/notifications-service/src/telegram/deadline-reminder.service.ts` — duplicate-tracking key and eligibility checks.
- `scripts/telegram-test-reminder.cjs` — test helper only.

## Private-only sending guarantee

- `chat_id` is taken **only** from `TELEGRAM_PERSONAL_CHAT_ID` (env). No group/channel ids from DB or API payloads.
- `TelegramNotificationService.isPersonalChatId()` accepts only **positive numeric** ids (personal chats). Negative ids (groups/supergroups/channels) are rejected.
- No group/channel send APIs are implemented.
- No phone number is requested or stored.

## Duplicate reminder prevention

- Table `notification_service.telegram_deadline_reminders` stores one row per successful send.
- Unique constraint: `taskId + deadlineAt + chatId + reminderType` (`DEADLINE_24H`).
- Before send: lookup existing row; after successful Telegram API response: insert row.
- If deadline changes, `deadlineAt` changes → new unique key → one new reminder allowed.
- DONE or archived tasks are excluded from queries and immediate checks.

## Migration command

```bash
npm run migration:run --workspace=@challenge/notifications-service
```

Docker local stack (runs migration on notifications-service start):

```bash
npm run dev:local-db
```

## Test message command

```bash
npm run telegram:test-reminder
```

Requires `TELEGRAM_BOT_TOKEN` and `TELEGRAM_PERSONAL_CHAT_ID` in project root `.env` (or exported in shell). Does not print the token.

## Manual test steps

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token.
2. Open your bot in Telegram and press **Start**.
3. Obtain your private `chat_id` (e.g. message `@userinfobot` or `getUpdates` after messaging the bot).
4. Set backend env (root `.env` for local, or Railway/host env for deploy):
   - `TELEGRAM_BOT_TOKEN=<your-bot-token>`
   - `TELEGRAM_PERSONAL_CHAT_ID=<your-private-chat-id>`
   - Optional: `TELEGRAM_REMINDER_WINDOW_HOURS=24`, `TELEGRAM_REMINDER_SCAN_INTERVAL_MINUTES=10`
5. Run migration (see above) and restart `notifications-service`.
6. Run `npm run telegram:test-reminder` and confirm a private DM arrives.
7. Create a task with deadline ~3 hours ahead (not DONE, not archived).
8. Wait for scan (≤10 min) or rely on immediate check on `task.created` / `task.updated`.
9. Confirm one Russian HTML reminder DM; create/update should not spam duplicates for the same deadline.
10. Change the task deadline — a new reminder may be sent for the new deadline.

## Remaining limitations

- Reminders go to **one** personal chat (Bekir) configured in env; no per-user Telegram linking in UI.
- Message labels are Russian (fixed copy), independent of app UI language.
- Assignee/creator names require rows in `auth_service.users`.
- Scan interval means up to ~10 minutes delay unless `task.created` / `task.updated` triggers an immediate check.
- Telegram delivery depends on Bot API availability; failures are logged safely without token exposure.
- Past deadlines (already overdue) are not reminded; only future deadlines within the window.
- No retry queue for failed Telegram sends (failed send does not record a duplicate row).
