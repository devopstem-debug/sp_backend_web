#!/usr/bin/env bash
#
# Демо-каталог для магазина: карта 30×25 м + 77 отделов + оборудование на карте.
#
# Пример:
#   sudo ./scripts/seed-store-catalog.sh
#   STORE_CATALOG_STORE=<uuid> sudo ./scripts/seed-store-catalog.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

APP_DIR="${APP_DIR:-${SP_ROOT}}"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/seed-store-catalog.sh

Env:
  STORE_CATALOG_STORE   UUID магазина (если не задан — первый магазин в БД)
  FLOOR_PLAN_DEMO_STORE альтернативное имя переменной
  APP_DIR               путь к проекту

Требует: арендатор и магазин уже созданы в UI.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

need_root "$@"
[[ -d "${APP_DIR}" ]] || die "Каталог не найден: ${APP_DIR}"
[[ -f "${APP_DIR}/artisan" ]] || die "Нет artisan в ${APP_DIR}"

log "StoreCatalogSeeder → ${APP_DIR}"
cd "${APP_DIR}"

if [[ -n "${STORE_CATALOG_STORE:-}" ]]; then
  ok "Магазин: ${STORE_CATALOG_STORE}"
elif [[ -n "${FLOOR_PLAN_DEMO_STORE:-}" ]]; then
  ok "Магазин: ${FLOOR_PLAN_DEMO_STORE}"
else
  warn "STORE_CATALOG_STORE не задан — будет использован первый магазин в БД"
fi

php artisan db:seed --class=StoreCatalogSeeder --force

ok "Демо-каталог готов"
