# Деплой (публикация)

Инструкция для выкладки из GitHub на VPS / хостинг с PHP-FPM + Nginx (или аналог).

## Что НЕ выкладывать из git

- `.env` — создать на сервере
- Firebase JSON — скопировать отдельно в `storage/app/private/...`
- `node_modules/`, `vendor/` — ставить на сервере
- Локальные логи и кэш

## Чеклист на сервере

1. **Клон репозитория**

```bash
git clone <repo> /var/www/sp_backend_web
cd /var/www/sp_backend_web
```

2. **Окружение**

```bash
cp .env.example .env
# заполнить APP_*, DB_*, Redis, Reverb, mail, Firebase
php artisan key:generate
```

Рекомендуемые значения продакшена:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.tld

DB_CONNECTION=pgsql
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
SESSION_SECURE_COOKIE=true
SECURE_HEADERS_HSTS=true

# Reverb через Nginx на 443 (не 8080 в браузере):
REVERB_HOST=your-domain.tld
REVERB_PORT=443
REVERB_SCHEME=https
```

3. **Зависимости и сборка**

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan db:seed --force   # только при первой установке / осознанно
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

4. **Права**

Пользователь PHP-FPM должен писать в `storage/` и `bootstrap/cache/`.

5. **Веб-сервер**

Document root → `public/`. Пример Nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.tld;
    root /var/www/sp_backend_web/public;

    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
    }

    # Laravel Reverb (WebSocket) — клиент подключается к wss://domain/app/...
    location /app {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Scheme $scheme;
        proxy_set_header SERVER_PORT $server_port;
        proxy_set_header SERVER_NAME $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_pass http://127.0.0.1:8080;
    }
}
```

6. **Фоновые процессы**

- `queue:work` (Supervisor)
- `reverb:start` (если нужны чат/уведомления realtime)
- scheduler: cron `* * * * * php /var/www/sp_backend_web/artisan schedule:run`

7. **Firebase**

Скопировать service account на сервер, выставить `FIREBASE_*` или загрузить через UI (Super Admin / Программист). См. [FIREBASE.md](FIREBASE.md).

## Обновление с GitHub

```bash
git pull
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
# перезапуск queue/reverb workers
```

## После деплоя

- [ ] HTTPS и `SESSION_SECURE_COOKIE=true`
- [ ] `APP_DEBUG=false`
- [ ] Бэкапы PostgreSQL
- [ ] Логин Super Admin работает
- [ ] Экспорт в Firebase (если используется)
- [ ] Права файлов credentials `600`

## Архитектура на проде (минимум)

```text
Internet → Nginx/TLS → PHP-FPM (Laravel) → PostgreSQL
                     ↘ Redis
                     ↘ Reverb (WS)
                     ↘ Firebase RTDB (egress)
```
