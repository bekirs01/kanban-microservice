"use strict";

const path = require("node:path");
const fs = require("node:fs");

const ROOT = path.resolve(__dirname, "..");

function loadEnvFile(p) {
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(ROOT, ".env.railway.local"));
loadEnvFile(path.resolve(ROOT, ".env"));

const usingRailway =
  !!process.env.RAILWAY_DB_HOST &&
  !!process.env.RAILWAY_DB_USER &&
  !!process.env.RAILWAY_DB_PASS &&
  !!process.env.RAILWAY_DB_NAME;

const DB_HOST = usingRailway
  ? process.env.RAILWAY_DB_HOST
  : process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(
  usingRailway
    ? process.env.RAILWAY_DB_PORT || "5432"
    : process.env.DB_PORT || "5433",
  10,
);
const DB_USER = usingRailway
  ? process.env.RAILWAY_DB_USER
  : process.env.DB_USER || "postgres";
const DB_PASS = usingRailway
  ? process.env.RAILWAY_DB_PASS
  : process.env.DB_PASS || "password";
const DB_NAME = usingRailway
  ? process.env.RAILWAY_DB_NAME
  : process.env.DB_NAME || "challenge_db";
const DB_SSL =
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL === "1" ||
  (usingRailway && process.env.DB_SSL !== "false");

const AUTH_SCHEMA = "auth_service";
const TASK_SCHEMA = "task_service";

const DEMO_WORKER_EMAILS = [
  "anna.smirnova@example.com",
  "maria.ivanova@example.com",
  "ekaterina.petrova@example.com",
  "alina.kuznetsova@example.com",
  "dmitry.volkov@example.com",
];

let pg;
try {
  pg = require(require.resolve("pg", { paths: [ROOT] }));
} catch (_) {
  pg = require("pg");
}

function isoDate(year, monthIndex0, day, hour = 12, minute = 0) {
  const d = new Date(Date.UTC(year, monthIndex0, day, hour, minute, 0));
  return d.toISOString();
}

function buildPlan(usersByKey, adminId) {
  const A = usersByKey.anna;
  const M = usersByKey.maria;
  const E = usersByKey.ekaterina;
  const D = usersByKey.alina;
  const V = usersByKey.dmitry;

  const Y = 2026;
  const MO = 4;

  return [
    {
      title: "Запуск проекта Kanban",
      description:
        "Согласование скоупа, ролей и базовых процессов разработки на спринт 0.",
      status: "DONE",
      priority: "HIGH",
      assignees: [A, M],
      deadline: isoDate(Y, MO, 1, 17, 0),
    },
    {
      title: "Воркшоп по архитектуре микросервисов",
      description:
        "Обсудили границы сервисов, очереди и контракты, зафиксировали решения.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [V, M],
      deadline: isoDate(Y, MO, 2, 17, 0),
    },
    {
      title: "Прокачка скиллов: Tailwind и shadcn/ui",
      description: "Внутренний митап по UI-стеку, домашние задания и шаринг ссылок.",
      status: "DONE",
      priority: "LOW",
      assignees: [A, D],
      deadline: isoDate(Y, MO, 3, 17, 0),
    },
    {
      title: "Старт спринта 0",
      description: "Зафиксированы цели спринта 0, расписан backlog и owners.",
      status: "DONE",
      priority: "HIGH",
      assignees: [M],
      deadline: isoDate(Y, MO, 4, 17, 0),
    },
    {
      title: "Дизайн-система: палитра и типографика",
      description: "Базовая палитра и шкала шрифтов, токены экспортированы в Figma.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [D],
      deadline: isoDate(Y, MO, 5, 17, 0),
    },
    {
      title: "Базовая модель пользователей",
      description: "Сущность User, миграции и роли в auth-service подняты.",
      status: "DONE",
      priority: "HIGH",
      assignees: [M],
      deadline: isoDate(Y, MO, 6, 17, 0),
    },
    {
      title: "Настройка ESLint и Prettier для монорепы",
      description: "Единые правила линтинга и форматирования, проверка в CI.",
      status: "DONE",
      priority: "LOW",
      assignees: [V],
      deadline: isoDate(Y, MO, 7, 17, 0),
    },
    {
      title: "Прототип логина (черновик)",
      description: "Базовый UI логина и регистрации без подключения к API.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [A],
      deadline: isoDate(Y, MO, 8, 17, 0),
    },
    {
      title: "Чек-лист QA для логина",
      description: "Сценарии тестирования логина и регистрации в Confluence.",
      status: "DONE",
      priority: "LOW",
      assignees: [E],
      deadline: isoDate(Y, MO, 9, 17, 0),
    },
    {
      title: "Иконки и айдентика дашборда",
      description: "Иконпак и базовая визуальная идентификация дашборда.",
      status: "DONE",
      priority: "LOW",
      assignees: [D],
      deadline: isoDate(Y, MO, 10, 17, 0),
    },
    {
      title: "CI/CD пайплайн (черновик)",
      description: "Базовый workflow сборки и деплоя для staging.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [V],
      deadline: isoDate(Y, MO, 11, 17, 0),
    },
    {
      title: "Каркас тёмной темы",
      description: "Подготовлены CSS-переменные и базовые токены для dark mode.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [A],
      deadline: isoDate(Y, MO, 12, 17, 0),
    },
    {
      title: "Закрытие спринта 0",
      description: "Подведены итоги спринта 0, обновлён общий roadmap.",
      status: "DONE",
      priority: "LOW",
      assignees: [M],
      deadline: isoDate(Y, MO, 13, 17, 0),
    },
    {
      title: "Базовый QA-чек-лист по релизу",
      description: "Согласован общий чек-лист и критерии приёмки релизов.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [E],
      deadline: isoDate(Y, MO, 14, 17, 0),
    },
    {
      title: "Слайды для презентации команде",
      description: "Подготовлены слайды по статусу и планам на спринт 1.",
      status: "DONE",
      priority: "LOW",
      assignees: [D],
      deadline: isoDate(Y, MO, 15, 17, 0),
    },
    {
      title: "Ретро по итогам спринта 0",
      description: "Ретроспектива команды, action items зафиксированы.",
      status: "DONE",
      priority: "LOW",
      assignees: [A, E],
      deadline: isoDate(Y, MO, 16, 17, 0),
    },
    {
      title: "Планёрка нового спринта 1",
      description: "Сформирован backlog спринта 1, назначены owners.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [A, M, E, D, V],
      deadline: isoDate(Y, MO, 17, 17, 0),
    },

    {
      title: "Дейли стендап и груминг бэклога",
      description: "Понедельничный стендап, обзор приоритетов недели.",
      status: "IN_PROGRESS",
      priority: "LOW",
      assignees: [A, M, E, D, V],
      deadline: isoDate(Y, MO, 18, 17, 0),
    },

    {
      title: "Подключить тёмную тему на дашборде",
      description:
        "Добавить переключатель и сохранение выбора пользователя. Проверить контрастность.",
      status: "TODO",
      priority: "MEDIUM",
      assignees: [A],
      deadline: isoDate(Y, MO, 21, 17, 0),
    },
    {
      title: "Добавить пагинацию в API задач",
      description:
        "Лимит/оффсет, метаданные ответа, обновить документацию Swagger.",
      status: "TODO",
      priority: "HIGH",
      assignees: [M],
      deadline: isoDate(Y, MO, 22, 17, 0),
    },
    {
      title: "Обновить иконки на главной странице",
      description:
        "Заменить устаревший иконпак на новую систему. Прислать обновлённый Figma-файл.",
      status: "TODO",
      priority: "LOW",
      assignees: [D],
      deadline: isoDate(Y, MO, 23, 17, 0),
    },
    {
      title: "Настроить алерты в Grafana по latency",
      description:
        "Алерты по 95-перцентилю auth/tasks API, оповещение в Slack/Telegram.",
      status: "TODO",
      priority: "MEDIUM",
      assignees: [V],
      deadline: isoDate(Y, MO, 24, 17, 0),
    },

    {
      title: "Переделать форму входа на новый дизайн",
      description:
        "Адаптировать поля и валидацию под обновлённый макет UI-команды.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignees: [A, D],
      deadline: isoDate(Y, MO, 20, 17, 0),
    },
    {
      title: "Оптимизировать SQL-запросы дашборда",
      description:
        "Долго грузится главный экран — добавить индексы и переписать N+1 запросы.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      assignees: [M],
      deadline: isoDate(Y, MO, 19, 17, 0),
    },
    {
      title: "Регрессионное тестирование релиза 1.4",
      description:
        "Прогнать чек-лист, завести баги, согласовать критичные с командой.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignees: [E],
      deadline: isoDate(Y, MO, 21, 17, 0),
    },
    {
      title: "Перенести staging на новый кластер",
      description:
        "Поднять окружение, проверить миграции, обновить переменные CI/CD.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assignees: [V],
      deadline: isoDate(Y, MO, 22, 17, 0),
    },

    {
      title: "Адаптивная вёрстка списка задач для мобильных",
      description:
        "Колонки в одну ленту, тач-жесты, проверить на iPhone SE и Pixel 7.",
      status: "REVIEW",
      priority: "MEDIUM",
      assignees: [A, D],
      deadline: isoDate(Y, MO, 19, 17, 0),
    },
    {
      title: "Рефакторинг сервиса уведомлений",
      description:
        "Разделить обработчики, добавить ретраи, покрыть unit-тестами.",
      status: "REVIEW",
      priority: "LOW",
      assignees: [M],
      deadline: isoDate(Y, MO, 20, 17, 0),
    },
    {
      title: "Чек-лист тестирования экрана профиля",
      description:
        "Сценарии: загрузка аватара, валидация, поведение оффлайн, скриншоты багов.",
      status: "REVIEW",
      priority: "LOW",
      assignees: [E],
      deadline: isoDate(Y, MO, 21, 17, 0),
    },

    {
      title: "Логин по email — финализация",
      description:
        "Закрыть тикет: проверки на бэке, корректные сообщения об ошибках, e2e тесты.",
      status: "DONE",
      priority: "HIGH",
      assignees: [A, M],
      deadline: isoDate(Y, MO, 19, 17, 0),
    },
    {
      title: "Макет страницы профиля сотрудника",
      description:
        "Финальный макет в Figma согласован с командой и передан в разработку.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [D],
      deadline: isoDate(Y, MO, 20, 17, 0),
    },
    {
      title: "Обновление Docker-образов сервисов",
      description:
        "Перевести базовые образы на Node 20 LTS, прогнать smoke-тесты.",
      status: "DONE",
      priority: "LOW",
      assignees: [V],
      deadline: isoDate(Y, MO, 21, 17, 0),
    },

    {
      title: "Старт спринта 2",
      description: "Постановка целей, распределение задач, фиксация owners.",
      status: "TODO",
      priority: "HIGH",
      assignees: [M, A],
      deadline: isoDate(Y, MO, 25, 17, 0),
    },
    {
      title: "Интеграция OAuth Google",
      description: "Подключение Google OAuth к auth-service и UI-страницам логина.",
      status: "TODO",
      priority: "HIGH",
      assignees: [M],
      deadline: isoDate(Y, MO, 26, 17, 0),
    },
    {
      title: "Юзер-тестирование экрана профиля",
      description: "Сценарии тестирования, сбор фидбэка, корректировка макета.",
      status: "TODO",
      priority: "MEDIUM",
      assignees: [E, D],
      deadline: isoDate(Y, MO, 27, 17, 0),
    },
    {
      title: "Websocket для уведомлений в реальном времени",
      description: "Реализация подписки на события и тестирование на staging.",
      status: "TODO",
      priority: "MEDIUM",
      assignees: [V, M],
      deadline: isoDate(Y, MO, 28, 17, 0),
    },
    {
      title: "Демонстрация прогресса команде",
      description: "Подготовка слайдов и демо для синка с командой по итогам недели.",
      status: "TODO",
      priority: "LOW",
      assignees: [A],
      deadline: isoDate(Y, MO, 29, 17, 0),
    },
    {
      title: "Подведение итогов недели",
      description: "Сбор метрик, апдейт roadmap и обновление статуса проекта.",
      status: "TODO",
      priority: "LOW",
      assignees: [E],
      deadline: isoDate(Y, MO, 30, 17, 0),
    },
    {
      title: "Подготовка к спринту 3",
      description: "Грумминг бэклога, оценка задач, синхронизация с продактом.",
      status: "TODO",
      priority: "LOW",
      assignees: [M],
      deadline: isoDate(Y, MO, 31, 17, 0),
    },

    {
      title: "Поднять JWT refresh-токены",
      description:
        "Реализована ротация refresh-токенов и инвалидация на logout.",
      status: "DONE",
      priority: "HIGH",
      assignees: [M],
      deadline: isoDate(Y, MO, 15, 17, 0),
      archivedAt: isoDate(Y, MO, 16, 10, 0),
    },
    {
      title: "Тестирование архива задач",
      description:
        "Покрыт сценарий архивирования/восстановления, баги переданы команде.",
      status: "DONE",
      priority: "MEDIUM",
      assignees: [E],
      deadline: isoDate(Y, MO, 14, 17, 0),
      archivedAt: isoDate(Y, MO, 15, 11, 0),
    },
    {
      title: "Прототип Kanban-доски",
      description:
        "Сделан прототип с drag-and-drop, согласован общий поток работы.",
      status: "DONE",
      priority: "URGENT",
      assignees: [A, D],
      deadline: isoDate(Y, MO, 12, 17, 0),
      archivedAt: isoDate(Y, MO, 13, 14, 0),
    },
  ].map((t) => ({
    ...t,
    creatorId: adminId,
  }));
}

async function main() {
  console.log(`[seed-demo-tasks] target: ${DB_HOST}:${DB_PORT}/${DB_NAME}`);

  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    ssl: DB_SSL ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    const adminRow = await client.query(
      `SELECT id FROM "${AUTH_SCHEMA}"."users" WHERE role='ADMIN' ORDER BY "createdAt" ASC LIMIT 1`,
    );
    if (adminRow.rowCount === 0) {
      throw new Error("No ADMIN user found to use as task creator.");
    }
    const adminId = adminRow.rows[0].id;
    console.log(`[seed-demo-tasks] using creator (admin) id: ${adminId}`);

    const workerRows = await client.query(
      `SELECT id, email FROM "${AUTH_SCHEMA}"."users"
         WHERE email IN ($1,$2,$3,$4,$5)`,
      DEMO_WORKER_EMAILS,
    );
    if (workerRows.rowCount !== 5) {
      throw new Error(
        `Expected 5 demo workers, found ${workerRows.rowCount}. Run \`npm run seed:workers\` first.`,
      );
    }
    const byEmail = Object.fromEntries(
      workerRows.rows.map((r) => [r.email, r.id]),
    );
    const usersByKey = {
      anna: byEmail["anna.smirnova@example.com"],
      maria: byEmail["maria.ivanova@example.com"],
      ekaterina: byEmail["ekaterina.petrova@example.com"],
      alina: byEmail["alina.kuznetsova@example.com"],
      dmitry: byEmail["dmitry.volkov@example.com"],
    };

    const plan = buildPlan(usersByKey, adminId);

    await client.query("BEGIN");
    try {
      const existing = await client.query(
        `SELECT id FROM "${TASK_SCHEMA}"."tasks"`,
      );
      if (existing.rowCount > 0) {
        const ids = existing.rows.map((r) => r.id);
        console.log(
          `[seed-demo-tasks] removing ${ids.length} existing task(s) (and orphan history)`,
        );
        await client.query(
          `DELETE FROM "${TASK_SCHEMA}"."task_history" WHERE task_id = ANY($1::text[])`,
          [ids],
        );
        await client.query(
          `DELETE FROM "${TASK_SCHEMA}"."tasks" WHERE id = ANY($1::uuid[])`,
          [ids],
        );
      }

      let activeCount = 0;
      let archivedCount = 0;
      const byStatus = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0, DONE: 0 };

      for (const task of plan) {
        const assigneesCsv = task.assignees.join(",");
        await client.query(
          `INSERT INTO "${TASK_SCHEMA}"."tasks"
             (title, description, priority, status,
              assignees, deadline, "creatorId", "archivedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            task.title,
            task.description,
            task.priority,
            task.status,
            assigneesCsv,
            task.deadline,
            task.creatorId,
            task.archivedAt ?? null,
          ],
        );
        byStatus[task.status] += 1;
        if (task.archivedAt) archivedCount += 1;
        else activeCount += 1;
      }

      await client.query("COMMIT");
      console.log(
        `[seed-demo-tasks] inserted ${plan.length} task(s) | active=${activeCount} archived=${archivedCount}`,
      );
      console.log(
        `[seed-demo-tasks] by status: TODO=${byStatus.TODO} IN_PROGRESS=${byStatus.IN_PROGRESS} REVIEW=${byStatus.REVIEW} DONE=${byStatus.DONE}`,
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }

    const verify = await client.query(
      `SELECT status, COUNT(*) AS c, COUNT("archivedAt") AS archived
         FROM "${TASK_SCHEMA}"."tasks"
        GROUP BY status
        ORDER BY status`,
    );
    console.log("\n[seed-demo-tasks] DB verification:");
    for (const r of verify.rows) {
      console.log(
        `  - status=${r.status.padEnd(11)} count=${r.c} archived=${r.archived}`,
      );
    }
    console.log("\n[seed-demo-tasks] OK");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(
    "[seed-demo-tasks] ERROR:",
    err && err.stack ? err.stack : err,
  );
  process.exitCode = 1;
});
