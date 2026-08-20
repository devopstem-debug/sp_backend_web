# Firebase: экспорт магазинов

## Зачем

Мобильное приложение читает данные магазина из **Firebase Realtime Database**. Control Center генерирует JSON планограммы и записывает его в RTDB через Admin SDK.

Путь в базе: `stores/{storeKey}`.

## Что нужно от Firebase

1. Project ID (например `spmobile-120212`)
2. Realtime Database URL (`https://<project>-default-rtdb.firebaseio.com`)
3. Service Account JSON (Firebase Admin SDK)

**Никогда не коммитьте JSON в git.**

## Куда класть credentials

Рекомендуемый путь на сервере (совпадает с загрузкой из UI):

```text
storage/app/private/settings/global/firebase-credentials.json
```

или для конкретного tenant:

```text
storage/app/private/settings/{tenant_uuid}/firebase-credentials.json
```

Диск Laravel `local` → корень `storage/app/private`.

## Конфигурация (приоритет)

1. **Настройки → Интеграции** в UI (project id, database URL, upload JSON) — хранится в таблице `settings`
2. Fallback из `.env`:

```env
FIREBASE_PROJECT_ID=
FIREBASE_DATABASE_URL=
FIREBASE_CREDENTIALS=/absolute/path/to/firebase-credentials.json
```

`FIREBASE_CREDENTIALS` — **абсолютный** путь к файлу на машине, где крутится PHP.

## Как отправить магазин

1. Убедитесь, что интеграция «настроена» (URL + существующий credentials file).
2. Откройте **Экспорт**.
3. Выберите магазин → **Отправить в Firebase** (permission `firebase-export`).
4. Результат пишется в `sync_logs` (успех / ошибка).

Альтернатива: скачать JSON без отправки в Firebase (`generate-export` / `download-export`).

## Код

| Класс | Роль |
|-------|------|
| `App\Services\FirebaseService` | Factory + `updateStore` / `getStore` / `deleteStore` |
| `App\Services\StoreExportService` | Сборка payload магазина |
| `App\Http\Controllers\ExportController` | UI + sendToFirebase |
| `App\Services\SettingsService` | Хранение настроек интеграций |
| `App\Models\SyncLog` | Журнал синхронизаций |

Пакет: `kreait/firebase-php`.

## Типичные проблемы

| Симптом | Что проверить |
|---------|----------------|
| «Firebase не настроен» | URL пустой или файл credentials отсутствует по пути |
| Permission denied от Google | Неверный service account / другой проект |
| Файл не находится после upload | Смотрите `storage/app/private/settings/...`, не `storage/app/firebase` |
| Работает локально, не на сервере | Абсолютный путь в `.env` отличается; права на файл `chmod 600` |

## Безопасность

- Файл service account = полный доступ Admin SDK к проекту Firebase.
- Права на редактирование интеграций: `edit-integrations` (Super Admin / Программист).
- На проде предпочитайте загрузку через UI или секрет-хранилище хостинга, а не путь внутри публичного репозитория.
