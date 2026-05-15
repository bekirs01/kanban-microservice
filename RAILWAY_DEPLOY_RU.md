# Деплой на Railway (монорепозиторий)

Из этой среды (Cursor-агент без браузера и без твоего `RAILWAY_TOKEN`) **невозможно** выполнить `railway login`: CLI пишет «Cannot login in non-interactive mode». Ниже — то, что уже проверено локально и что сделать тебе **один раз**, после чего можно запускать скрипт из консоли.

## Что уже сделано автоматически

- Проверена установка CLI: `railway 4.30.5` (Homebrew).
- `railway whoami` без авторизации: **Unauthorized**.

## Самый простой путь: Docker Compose в Railway

Railway умеет импортировать `docker-compose.yml` на холст проекта (перетащить файл). См. раздел в документации [Dockerfiles — Docker compose](https://docs.railway.com/builds/dockerfiles).

1. Создай проект на [railway.app](https://railway.app).
2. Перетащи в проект файл **`docker-compose.yml`** из корня репозитория.
3. Проверь сгенерированные сервисы, переменные и порты; при необходимости добавь **PostgreSQL** и **RabbitMQ** из каталога шаблонов, если импорт их не создал как нужно.
4. Для **фронта в браузере** задай сборочные `VITE_API_URL` и `VITE_WEBSOCKET_URL` на **публичные HTTPS/wss URL** сервисов gateway и notifications (не localhost).
5. В **api-gateway** нужно разрешить origin фронта в CORS (`apps/api-gateway/src/main.ts`) — иначе браузер заблокирует запросы к API.

## Путь через CLI (после входа в аккаунт)

### Шаг 1 — один раз вручную в твоём терминале (нужен браузер)

```bash
railway login
```

Следуй открывшейся авторизации. Проверка:

```bash
railway whoami
```

Альтератива без браузера — [Account tokens](https://railway.app/account/tokens), затем:

```bash
export RAILWAY_TOKEN="твой_токен"
railway whoami
```

### Шаг 2 — связать проект и сервис

Создай проект в веб-интерфейсе (или через `railway init`), затем из корня репозитория:

```bash
cd ~/Desktop/kanban-microservice-main
railway link -p <PROJECT_ID> -s <SERVICE_NAME>
```

`<PROJECT_ID>` и сервис можно взять из URL в дашборде Railway.

Для **каждого** микросервиса в том же репозитории задаётся свой сервис: либо отдельные `railway link` с разными `-s`, либо используй импорт Compose (см. выше).

### Шаг 3 — указать Dockerfile в корне монорепо

В переменных **каждого** сервиса в Dashboard задай:

- `RAILWAY_DOCKERFILE_PATH=apps/api-gateway/Dockerfile` (и аналогично для остальных путей).

Или добавь конфиг через [config as code](https://docs.railway.com/reference/config-as-code) с `build.dockerfilePath` (если включаете файл в том же репо для этого сервиса).

### Шаг 4 — деплой

```bash
cd ~/Desktop/kanban-microservice-main
railway up --detach
```

С флагом `-s`:

```bash
railway up -s api-gateway --detach
```

Подробнее: [Deploying with the CLI](https://docs.railway.com/cli/deploying).

## Скрипт в репозитории

`scripts/railway-check.sh` — проверяет, что ты авторизован (`railway whoami`), и напоминает про `railway link` / `railway up`. Запуск из корня:

```bash
./scripts/railway-check.sh
```

## Вывод

| Действие | Кто выполняет |
|----------|----------------|
| `railway login` или `RAILWAY_TOKEN` | Ты (интерактивно один раз или токен) |
| Создание проекта и сервисов / импорт Compose | Ты в Railway UI |
| `railway link`, `railway up` после входа | Можешь запускать в консоли по этой памятке |
| Полный деплой «за тебя» без доступа к аккаунту | Невозможно из текущего агента Cursor |

Supabase для этого проекта не требуется, если PostgreSQL живёт на Railway или в вашем Compose-стеке.
