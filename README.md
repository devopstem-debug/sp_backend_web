# Smart Planogram Control Center V 2.4

Веб-платформа для управления планограммами розничных сетей: магазины, оборудование, товары, расстановки, план этажа, экспорт в мобильное приложение (Firebase), биллинг и администрирование арендаторов.

| | |
|---|---|
| **Version** | `2.4.0` (см. [VERSION](VERSION)) |
| **Author** | [DevOpsTem](https://github.com/devopstem-debug) (`devopstem`) |
| **License** | [MIT](LICENSE) |
| **Stack** | Laravel 13 · Inertia/React · PostgreSQL · Redis · Firebase · Reverb |

## Для чего этот сайт

Система нужна сетям и магазинам, чтобы:

- вести каталог магазинов, отделов и товаров;
- описывать полки, холодильники и стенды;
- строить планограммы (расстановку SKU на уровнях полок);
- рисовать план торгового зала (расположение оборудования и стен);
- выгружать данные в Firebase Realtime Database для мобильного клиента;
- управлять пользователями, ролями, подписками и счетами в мультиарендной модели.

## Что нового в 2.4

- Полноэкранная форма магазина с картой (геокодирование OpenStreetMap)
- Экспорт магазина + полного каталога товаров в Firebase одной кнопкой
- SQL-дамп всей БД (Super Admin) для переезда на другой VPS
- Двухфакторная аутентификация (TOTP + recovery-коды)
- Browser push-уведомления (баннер разрешения + Service Worker)
- Скрипты `scripts/install.sh` / `scripts/deploy.sh` для Ubuntu VPS
- Nginx-шаблон: gzip + долгий кэш `/build/`
- Упрощённые Настройки (без Tenant-блока и вкладки Интеграции в UI)

## Быстрый старт (локально)

См. [docs/SETUP.md](docs/SETUP.md).

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed
npm ci && npm run build
php artisan serve
```

## Деплой на VPS

См. [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

```bash
# новый сервер (репозиторий уже склонирован)
sudo DOMAIN=your-domain.tld WITH_SSL=1 ./scripts/install.sh

# обновление
sudo ./scripts/deploy.sh
```

## Документация

Полный указатель: [docs/README.md](docs/README.md)

| Документ | Тема |
|----------|------|
| [OVERVIEW](docs/OVERVIEW.md) | Продукт |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Архитектура |
| [FIREBASE](docs/FIREBASE.md) | Экспорт / каталог / пользователи |
| [SECURITY](docs/SECURITY.md) | Безопасность |
| [ROLES](docs/ROLES.md) | Роли |

## Автор и лицензия

Copyright © 2024–2026 **DevOpsTem** ([@devopstem-debug](https://github.com/devopstem-debug)).

Распространяется по лицензии **MIT** — см. [LICENSE](LICENSE).
