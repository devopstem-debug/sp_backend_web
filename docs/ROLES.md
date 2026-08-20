# Роли и права доступа

Источник истины: `app/Support/Permissions.php` и `database/seeders/RoleSeeder.php` (Spatie Permission, guard `web`).

## Роли

| Роль (код) | Отображаемое имя | Назначение |
|------------|------------------|------------|
| `Super Admin` | Super Admin | Полный доступ ко всей платформе, всем tenant |
| `Заместитель` | Заместитель | Операционный админ сети (почти всё в tenant, без опасных delete/системных зон) |
| `Заведующий` | Заведующий | Управление магазином/отделом в ограниченных рамках |
| `Программист` | Программист | Просмотр + интеграции + экспорт (в т.ч. Firebase) |
| `Мерчандайзер` | Мерчандайзер | Просмотр планограмм и товаров |

Роли, которые назначаются пользователям tenant: Заместитель, Заведующий, Программист, Мерчандайзер.

> Исторические имена Network Manager / Store Manager в сидере переименованы в Заместитель / Заведующий.

## Матрица (упрощённо)

| Возможность | Super Admin | Заместитель | Заведующий | Программист | Мерчандайзер |
|-------------|:-----------:|:-----------:|:----------:|:-----------:|:------------:|
| CRUD магазины / отделы / оборудование | ✅ | ✅* | частично | view | — |
| Товары + импорт | ✅ | ✅* | частично | view | view |
| Планограммы | ✅ | ✅* | edit/view | view | view |
| Экспорт / Firebase | ✅ | ✅* | — | ✅ | — |
| Пользователи | ✅ | без block/delete* | — | — | — |
| Интеграции (Firebase credentials) | ✅ | — | — | ✅ | — |
| Tenants / Plans / Invoices / Legal / DB viewer | ✅ | — | — | — | — |
| System logs | ✅ | — | — | — | — |

\* Точные списки permissions — в `Permissions::forDeputy()`, `forHead()`, `forProgrammer()`, `forMerchandiser()`. Super Admin получает `Permissions::all()`.

## Группы permissions

- **Stores:** `view-stores`, `create-stores`, `edit-stores`, `delete-stores`, `restore-stores`
- **Departments / Shelves / Coolers / Stands:** `view-*`, `create-*`, `edit-*`, `delete-*`
- **Products:** `view/create/edit/delete-products`, `import-products`
- **Planograms:** `view/create/edit/delete-planograms`, `manage-planograms`
- **Export:** `view-export`, `generate-export`, `download-export`, `firebase-export`
- **Users:** `view/create/edit/block/delete-users`
- **Logs:** `view-audit-logs`, `view-login-logs`, `view-system-logs`
- **Settings:** `edit-profile`, `edit-security`, `edit-integrations`
- **Platform:** `view-analytics`, `manage-tenants`, `manage-plans`, `manage-billing`, `manage-invoices`, `manage-legal`, `manage-database`

## Middleware доступа к приложению

Помимо permissions, веб-приложение (кроме профиля/биллинга) проходит цепочку:

1. `auth`
2. `user.active` — пользователь не заблокирован
3. `tenant.active` — tenant активен (Super Admin исключение)
4. `subscription.active` — есть действующая подписка

Биллинг доступен без `subscription.active`, чтобы можно было оплатить продление.
