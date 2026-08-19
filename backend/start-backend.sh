#!/usr/bin/env bash
# Starts the backend with MySQL. An existing local MySQL is reused; otherwise a
# project-local MySQL instance is started with data persisted under ./.mysql.
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Auto-load backend/.env if it exists and vars are not already set
ENV_FILE="$(dirname "${BASH_SOURCE[0]}")/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3308}"
DB_NAME="${DB_NAME:-insurance_portal}"
DB_USER="${DB_USER:-root}"
FILE_STORAGE_DIR="${FILE_STORAGE_DIR:-$ROOT_DIR/backend/uploads}"
MYSQL_DATA_DIR="$ROOT_DIR/.mysql/data"
MYSQL_RUN_DIR="$ROOT_DIR/.mysql/run"
MYSQL_SOCK="$MYSQL_RUN_DIR/mysqld.sock"
MYSQL_LOG="$ROOT_DIR/.mysql/mysqld.log"
MYSQL_PID=""

mkdir -p "$MYSQL_RUN_DIR"

mysql_args=(-h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER")
if [ -n "${DB_PASSWORD:-}" ]; then
  export MYSQL_PWD="$DB_PASSWORD"
fi

if mysqladmin "${mysql_args[@]}" ping > /dev/null 2>&1; then
  echo "[start-backend] Using existing MySQL at ${DB_HOST}:${DB_PORT}."
else
  if [ "$DB_HOST" != "127.0.0.1" ] && [ "$DB_HOST" != "localhost" ]; then
    echo "[start-backend] Cannot connect to MySQL at ${DB_HOST}:${DB_PORT}." >&2
    exit 1
  fi

  if [ ! -d "$MYSQL_DATA_DIR/mysql" ]; then
    echo "[start-backend] Initializing project-local MySQL data directory..."
    mkdir -p "$MYSQL_DATA_DIR"
    mysqld --initialize-insecure --datadir="$MYSQL_DATA_DIR"
  fi

  echo "[start-backend] Starting project-local MySQL..."
  mysqld \
    --datadir="$MYSQL_DATA_DIR" \
    --socket="$MYSQL_SOCK" \
    --pid-file="$MYSQL_RUN_DIR/mysqld.pid" \
    --port="$DB_PORT" \
    --bind-address=127.0.0.1 \
    --skip-mysqlx \
    > "$MYSQL_LOG" 2>&1 &
  MYSQL_PID=$!
  mysql_args=(-S"$MYSQL_SOCK" -u"$DB_USER")
fi

cleanup() {
  if [ -n "$MYSQL_PID" ]; then
    echo "[start-backend] Stopping project-local MySQL..."
    kill "$MYSQL_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "[start-backend] Waiting for MySQL to accept connections..."
for i in $(seq 1 30); do
  if mysqladmin "${mysql_args[@]}" ping > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! mysqladmin "${mysql_args[@]}" ping > /dev/null 2>&1; then
  echo "[start-backend] MySQL did not become ready." >&2
  exit 1
fi

echo "[start-backend] Ensuring database '${DB_NAME}' exists..."
mysql "${mysql_args[@]}" -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
# Schema and seed data are managed by Hibernate (ddl-auto=update) and DataInitializer on startup.

echo "[start-backend] Starting Spring Boot application..."
cd "$ROOT_DIR/backend"
# Use SESSION_SECRET as the JWT signing key when available (Replit secret)
JWT_SECRET_VAL="${JWT_SECRET:-${SESSION_SECRET:-}}"
exec env DB_HOST="$DB_HOST" DB_PORT="$DB_PORT" DB_NAME="$DB_NAME" DB_USER="$DB_USER" \
  FILE_STORAGE_DIR="$FILE_STORAGE_DIR" \
  JWT_SECRET="$JWT_SECRET_VAL" \
  XAI_API_KEY="${XAI_API_KEY:-}" \
  mvn -q spring-boot:run
