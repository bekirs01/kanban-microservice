CREATE SCHEMA IF NOT EXISTS auth_service;
CREATE SCHEMA IF NOT EXISTS task_service;
CREATE SCHEMA IF NOT EXISTS notification_service;

GRANT ALL PRIVILEGES ON SCHEMA auth_service TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA task_service TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA notification_service TO postgres;