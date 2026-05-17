export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

ensure_docker_daemon() {
  if docker info >/dev/null 2>&1; then
    return 0
  fi
  if command -v colima >/dev/null 2>&1; then
    docker context use colima 2>/dev/null || true
    if docker info >/dev/null 2>&1; then
      return 0
    fi
    colima start
    docker context use colima 2>/dev/null || true
    local i=1
    while [ "$i" -le 45 ]; do
      if docker info >/dev/null 2>&1; then
        return 0
      fi
      sleep 1
      i=$((i + 1))
    done
    return 1
  fi
  docker info >/dev/null 2>&1
}
