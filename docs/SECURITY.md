# Безопасность

## Секреты

| Артефакт | Где хранить | В git? |
|----------|-------------|--------|
| `.env` | только на сервере / локально | ❌ |
| Firebase service account JSON | `storage/app/private/...` или секрет-хранилище | ❌ |
| `APP_KEY` | `.env` | ❌ |
| Reverb / mail / AWS keys | `.env` | ❌ |

`.gitignore` уже исключает `.env`, `vendor/`, `node_modules/`, `storage/app/private/**`, `*adminsdk*.json`, `firebase-credentials.json`.

## Доступ

- Роли и permissions — [ROLES.md](ROLES.md)
- Database Viewer и raw SQL — только для Super Admin; на проде ограничьте IP/VPN при возможности
- `APP_DEBUG=false` в production — иначе утечки стектрейсов

## Сессии и HTTPS

На публичном HTTPS:

```env
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SECURE_HEADERS_HSTS=true
```

## Инциденты с credentials

Если service account Firebase или `.env` попали в публичный репозиторий:

1. Немедленно ротируйте ключи в Google Cloud / Firebase.
2. Смените `APP_KEY` только с пониманием последствий (сессии/шифрованные поля).
3. Удалите секреты из истории git (`git filter-repo` / BFG) или сделайте новый репозиторий без них.
