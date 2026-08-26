#!/usr/bin/env bash
#
# Обновление уже установленного Smart Planogram на VPS.
#
# Пример:
#   sudo ./scripts/deploy.sh
#   sudo ./scripts/deploy.sh --no-pull
#   sudo ./scripts/deploy.sh --no-build
#   sudo APP_DIR=/var/www/sp_backend_web ./scripts/deploy.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

APP_DIR="${APP_DIR:-${SP_ROOT}}"
WEB_USER="${WEB_USER:-www-data}"
DO_PULL=1
DO_BUILD=1
DO_MIGRATE=1
DO_RESTART=1

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/deploy.sh [options]

Options:
  --no-pull      не делать git pull
  --no-build     пропустить npm ci && npm run build
  --no-migrate   пропустить php artisan migrate --force
  --no-restart   не перезапускать queue/reverb/nginx/php-fpm
  -h, --help     справка

Env:
  APP_DIR        путь к проекту (default: корень репозитория)
  WEB_USER       владелец storage (default: www-data)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-pull) DO_PULL=0; shift ;;
    --no-build) DO_BUILD=0; shift ;;
    --no-migrate) DO_MIGRATE=0; shift ;;
    --no-restart) DO_RESTART=0; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Неизвестный аргумент: $1 (см. --help)" ;;
  esac
done

need_root "$@"
[[ -d "${APP_DIR}" ]] || die "Каталог не найден: ${APP_DIR}"
[[ -f "${APP_DIR}/artisan" ]] || die "Нет artisan в ${APP_DIR}"
[[ -f "${APP_DIR}/.env" ]] || die "Нет .env — сначала запусти install.sh или создай .env вручную"

log "Deploy Smart Planogram → ${APP_DIR}"
cd "${APP_DIR}"

if [[ "${DO_PULL}" == "1" ]]; then
  if [[ -d .git ]]; then
    log "git pull"
    git pull --ff-only
  else
    warn "Нет .git — пропускаем pull"
  fi
fi

log "Composer"
composer_install_prod "${APP_DIR}"

if [[ "${DO_BUILD}" == "1" ]]; then
  log "Frontend build"
  frontend_build "${APP_DIR}"
else
  warn "Пропуск npm build"
fi

app_permissions "${APP_DIR}" "${WEB_USER}"

if [[ "${DO_MIGRATE}" == "1" ]]; then
  log "Migrate + cache"
  (
    cd "${APP_DIR}"
    php artisan migrate --force
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache 2>/dev/null || true
    php artisan storage:link 2>/dev/null || true
  )
else
  log "Только cache (без migrate)"
  (
    cd "${APP_DIR}"
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
  )
fi

if [[ "${DO_RESTART}" == "1" ]]; then
  log "Reload services"
  reload_services
  ok "php-fpm / nginx / supervisor обновлены"
fi

ok "Deploy завершён: $(php -r "echo date('c');")"
echo "Проверь: supervisorctl status && curl -I https://\$(grep ^APP_URL= .env | cut -d= -f2 | sed 's|https\\?://||')"
