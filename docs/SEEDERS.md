# Сидеры (database/seeders)

Краткая шпаргалка: что есть, когда запускать, что нужно заранее.

## Автоматически при установке

```bash
php artisan db:seed --force
# или scripts/install.sh WITH_SEED=1
```

| Сидер | Что делает | Нужно в .env |
|-------|------------|--------------|
| **RoleSeeder** | Роли и права Spatie (Super Admin, Заместитель, …) | — |
| **SuperAdminSeeder** | Пользователь Super Admin | `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (см. `config/services.php`) |
| **PlanSeeder** | Тарифы Free/Basic/Pro/Enterprise, банковский счёт, подписки для существующих арендаторов | — |
| **LegalDocumentSeeder** | Оферта и политика конфиденциальности (если ещё нет) | — |
| **BotTrainingSeeder** | Правила обогащения товаров для Product Bot (~напитки BY/RU) | — |

**Не создаёт:** магазины, отделы, карту зала, демо-оборудование.

---

## Демо-магазин (вручную, после создания Tenant + Store)

```bash
php artisan db:seed --class=StoreCatalogSeeder --force
```

Один сидер делает всё:

1. Карта зала 30×25 м (стены, вход, 8 касс) — `FloorPlanService::setupHall`
2. **77 отделов** — `DepartmentsCatalogSeeder`
3. **Оборудование на карте** (координаты pos_x/pos_y) — `StoreEquipmentSeeder`
   - 10 стеллажей (WC, KW, SN)
   - 3 холодильника (DF, IC)
   - 3 стойки

Конкретный магазин:

```bash
STORE_CATALOG_STORE=<uuid-магазина> php artisan db:seed --class=StoreCatalogSeeder --force
```

Без переменной — **первый** магазин в БД.

### По частям

| Команда | Только |
|---------|--------|
| `DepartmentsCatalogSeeder` | 77 отделов |
| `StoreEquipmentSeeder` | Стеллажи/холодильники/стойки (нужны отделы WC, KW, SN, DF, IC) |
| `FloorPlanDemoSeeder` | Алиас → `StoreCatalogSeeder` (старые скрипты) |

Повторный запуск безопасен (`updateOrCreate`).

---

## Порядок для чистого VPS

```bash
# 1. Обновить код + сбросить БД
CONFIRM=1 sudo ./scripts/reset.sh

# 2. В UI: арендатор → магазин

# 3. Демо-каталог
STORE_CATALOG_STORE=<uuid> sudo ./scripts/seed-store-catalog.sh

# 4. Firebase Console → очистить Realtime Database вручную
```

Или вручную:

1. `php artisan migrate:fresh --seed --force` — роли, админ, тарифы
2. В UI: **Арендатор** → **Магазин**
3. `php artisan db:seed --class=StoreCatalogSeeder --force`
4. При необходимости: очистить Firebase вручную, затем экспорт из UI

---

## Не в DatabaseSeeder (осознанно)

| Сидер | Почему отдельно |
|-------|-----------------|
| StoreCatalogSeeder | Демо-данные магазина, не для продакшена |
| DepartmentsCatalogSeeder | Часть StoreCatalogSeeder |
| StoreEquipmentSeeder | Часть StoreCatalogSeeder |
| FloorPlanDemoSeeder | Устаревший алиас |

---

## Проверка синтаксиса

```bash
for f in database/seeders/*.php database/seeders/Concerns/*.php; do php -l "$f"; done
```

## Удаление демо-данных

Сидеры не удаляют — только создают/обновляют. Личные данные убирайте в UI или через `migrate:fresh` на тестовом стенде.
