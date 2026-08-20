# Smart Planogram Control Center

Веб-платформа для управления планограммами розничных сетей: магазины, оборудование, товары, расстановки, план этажа, экспорт в мобильное приложение (Firebase), биллинг и администрирование арендаторов.

## Для чего этот сайт

Система нужна сетям и магазинам, чтобы:

- вести каталог магазинов, отделов и товаров;
- описывать полки, холодильники и стенды;
- строить планограммы (расстановку SKU на уровнях полок);
- рисовать план торгового зала (расположение оборудования и стен);
- выгружать данные в Firebase Realtime Database для мобильного клиента;
- управлять пользователями, ролями, подписками и счетами в мультиарендной модели.

## Стек

| Слой | Технологии |
|------|------------|
| Backend | PHP 8.3+, Laravel 13, Inertia.js 2 |
| Frontend | React 19, TypeScript 5.7, Vite 8, Tailwind CSS 4 |
| БД / кэш | PostgreSQL 16 (рекомендуется), Redis 7 |
| Auth / API | Laravel Breeze (session), Sanctum (`/api/v1`) |
| Realtime | Laravel Reverb + Echo |
| Интеграции | Firebase Admin SDK (`kreait/firebase-php`) |
| Прочее | Spatie Permission, Spatie Activity Log, DomPDF |

## Быстрый старт

```bash
cp .env.example .env
composer install
php artisan key:generate
# настройте DB_* / Redis в .env (для продакшена — PostgreSQL)
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

Подробно: [docs/SETUP.md](docs/SETUP.md) · деплой: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Документация

| Документ | Содержание |
|----------|------------|
| [docs/OVERVIEW.md](docs/OVERVIEW.md) | Цели продукта, кто пользователи, что умеет система |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура, слои, мультиарендность, поток данных |
| [docs/MODULES.md](docs/MODULES.md) | Модули и экраны приложения |
| [docs/ROLES.md](docs/ROLES.md) | Роли и права доступа |
| [docs/API.md](docs/API.md) | HTTP API v1 |
| [docs/FIREBASE.md](docs/FIREBASE.md) | Экспорт в Firebase |
| [docs/SETUP.md](docs/SETUP.md) | Локальная установка |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Публикация на сервере |

## Структура репозитория

```
app/            # PHP: модели, контроллеры, сервисы
bootstrap/      # загрузка Laravel
config/         # конфигурация
database/       # миграции, сидеры, фабрики
docs/           # документация
public/         # точка входа веб-сервера
resources/js/   # React + Inertia страницы и компоненты
routes/         # web.php, api.php, auth.php
storage/        # логи, приватные файлы (credentials — не в git)
```

## Безопасность

Не коммитьте:

- `.env`
- Firebase service account JSON (`**/firebase-credentials.json`, `*adminsdk*.json`)
- `vendor/`, `node_modules/`, `storage/app/private/**`

Credentials для Firebase кладите на сервер в `storage/app/private/...` или указывайте абсолютный путь в `FIREBASE_CREDENTIALS`.

## Лицензия

Проект на базе Laravel skeleton; условия использования продукта определяются владельцем репозитория.
