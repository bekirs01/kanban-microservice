#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/docker-compose.sh" up -d --build db rabbitmq auth-service tasks-service notifications-service api-gateway
