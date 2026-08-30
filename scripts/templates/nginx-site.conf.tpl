# Smart Planogram — Nginx site template
# Placeholders: __DOMAIN__ __APP_DIR__ __PHP_SOCK__
#
# Gzip встроен в nginx. Brotli — опционально (нужен модуль ngx_brotli):
#   brotli on;
#   brotli_comp_level 5;
#   brotli_types text/plain text/css application/json application/javascript
#                application/xml image/svg+xml font/woff2;

server {
    listen 80;
    listen [::]:80;
    server_name __DOMAIN__;

    root __APP_DIR__/public;
    index index.php;

    client_max_body_size 64M;

    # --- compression ---
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/rss+xml
        application/atom+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon;

    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Vite hashed assets — долгий кэш (имя файла меняется при сборке)
    location ^~ /build/ {
        access_log off;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
        add_header X-Content-Type-Options "nosniff" always;
        try_files $uri =404;
    }

    location ^~ /images/ {
        access_log off;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_pass unix:__PHP_SOCK__;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_hide_header X-Powered-By;
    }

    # Laravel Reverb WebSocket (клиент: wss://domain/app/...)
    location /app {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header Scheme $scheme;
        proxy_set_header SERVER_PORT $server_port;
        proxy_set_header SERVER_NAME $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_read_timeout 60s;
        proxy_pass http://127.0.0.1:8080;
    }

    # HTTP API Reverb/Pusher (server → /apps/{id}/events). Без этого broadcast даёт 404.
    location /apps {
        proxy_http_version 1.1;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://127.0.0.1:8080;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
