#!/usr/bin/env bash
#
# Полный сброс БД и базовых сидеров (роли, Super Admin, тарифы, legal, бот).
# НЕ трогает .env, nginx, Firebase — их чистишь отдельно.
#
# Пример:
#   CONFIRM=1 sudo ./scripts/reset.sh
#   CONFIRM=1 sudo ./scripts/reset.sh --no-pull
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

APP_DIR="${APP_DIR:-${SP_ROOT}}"
WEB_USER="${WEB_USER:-www-data}"
DO_PULL=1

usage() {
  cat <<'EOF'
Usage: CONFIRM=1 sudo ./scripts/reset.sh [options]

Удаляет ВСЕ данные в PostgreSQL и заново накатывает миграции + DatabaseSeeder.

Options:
  --no-pull    не делать git pull перед сбросом
  -h, --help   справка

Env:
  CONFIRM=1    обязательно — без этого скрипт не запустится
  APP_DIR      путь к проекту (default: корень репозитория)

После сброса вручную:
  1. Войти как Super Admin (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD из .env)
  2. Создать арендатора и магазин в UI
  3. Демо-каталог: ./scripts/seed-store-catalog.sh
  4. Очистить Firebase Console (Realtime Database) вручную
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull) DO_PULL=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Неизвестный аргумент: $1 (см. --help)" ;;
  esac
done

need_root "$@"
[[ "${CONFIRM:-}" == "1" ]] || die "Опасная операция. Подтверди: CONFIRM=1 sudo $0"
[[ -d "${APP_DIR}" ]] || die "Каталог не найден: ${APP_DIR}"
[[ -f "${APP_DIR}/artisan" ]] || die "Нет artisan в ${APP_DIR}"
[[ -f "${APP_DIR}/.env" ]] || die "Нет .env"

log "Сброс БД → ${APP_DIR}"
cd "${APP_DIR}"

if [[ "${DO_PULL}" == "1" && -d .git ]]; then
  log "git pull"
  git pull --ff-only
fi

log "Composer (на случай новых сидеров)"
composer_install_prod "${APP_DIR}"

log "migrate:fresh --seed"
php artisan migrate:fresh --seed --force

log "Очистка и пересборка кэша"
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache 2>/dev/null || true

app_permissions "${APP_DIR}" "${WEB_USER}"

log "Перезапуск queue / reverb"
reload_services

cat <<'EOF'

✓ БД сброшена. Базовые сидеры применены.

Дальше:
  1. Открой сайт → войди как Super Admin
  2. Создай арендатора и магазин
  3. Демо (карта + 77 отделов + оборудование):
       STORE_CATALOG_STORE=<uuid> sudo ./scripts/seed-store-catalog.sh
  4. Firebase Console → Realtime Database → очисти данные вручную
  5. После настройки — экспорт каталога из UI

EOF
