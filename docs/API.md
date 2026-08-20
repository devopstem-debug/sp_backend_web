# API v1

Базовый префикс: `/api/v1`  
Файл маршрутов: `routes/api.php`  
Имена маршрутов: `api.v1.*`

## Аутентификация

- Laravel **Sanctum** (`auth:sanctum`)
- Дополнительно: `user.active`, `tenant.active`
- Для SPA-cookie сценариев укажите `SANCTUM_STATEFUL_DOMAINS` в `.env`

Получение токена — через стандартный поток Sanctum / login вашего клиента (session cookie или personal access token, в зависимости от интеграции).

## Ресурсы

| Метод | Путь | Назначение |
|-------|------|------------|
| REST | `/api/v1/stores` | CRUD магазинов (`apiResource`) |
| REST | `/api/v1/departments` | CRUD отделов |
| REST | `/api/v1/products` | CRUD товаров |
| GET | `/api/v1/export/{storeId}` | Сгенерировать JSON-экспорт магазина |

## Уведомления

| Метод | Путь |
|-------|------|
| GET | `/api/v1/notifications` |
| GET | `/api/v1/notifications/unread-count` |
| POST | `/api/v1/notifications/{id}/read` |
| POST | `/api/v1/notifications/read-all` |

## Чат

| Метод | Путь |
|-------|------|
| GET/POST | сообщения общего чата (см. `routes/api.php`) |
| GET | `/api/v1/chat/conversations` |
| GET | `/api/v1/chat/users` |
| POST | `/api/v1/chat/heartbeat` |
| POST | `/api/v1/chat/direct` |
| GET/POST | сообщения и read внутри conversation |

Точные URI сверяйте с `routes/api.php` — они являются источником истины при рефакторинге.

## Формат ответов

Контроллеры API возвращают JSON. Ошибки валидации — стандартный Laravel 422. Доступ без права / неактивный tenant — 403.

## Связь с UI

Веб-панель в основном ходит через Inertia (не через этот API). API предназначен для внешних/мобильных клиентов и точечных JSON-операций (например, экспорт).
