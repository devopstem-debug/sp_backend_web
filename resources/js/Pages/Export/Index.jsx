import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess, fireToast } from '@/lib/swal';
import clsx from 'clsx';

function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (value < 1024) {
        return `${value} B`;
    }
    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function formatRelative(value) {
    if (!value) {
        return 'ещё не было';
    }

    const date = new Date(value);
    const diffSec = Math.round((Date.now() - date.getTime()) / 1000);

    if (Number.isNaN(diffSec)) {
        return formatDate(value);
    }

    if (diffSec < 60) {
        return 'только что';
    }

    if (diffSec < 3600) {
        const minutes = Math.floor(diffSec / 60);

        return `${minutes} мин. назад`;
    }

    if (diffSec < 86400) {
        const hours = Math.floor(diffSec / 3600);

        return `${hours} ч. назад`;
    }

    return formatDate(value);
}

function statusLabel(status) {
    if (status === 'success') {
        return 'успешно';
    }
    if (status === 'failed') {
        return 'ошибка';
    }
    if (status === 'skipped') {
        return 'пропущено';
    }

    return status || '—';
}

export default function Index({
    stores = [],
    firebaseConfigured = false,
    recentSyncs = [],
    latestByStore = {},
    autoSyncEnabled = true,
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const [storeId, setStoreId] = useState(stores[0]?.id || '');
    const [jsonPreview, setJsonPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [syncLogs, setSyncLogs] = useState(recentSyncs);
    const [latestMap, setLatestMap] = useState(latestByStore);
    const [configured, setConfigured] = useState(firebaseConfigured);
    const seenSyncIds = useRef(new Set(recentSyncs.map((item) => item.id)));

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const selectedStore = useMemo(
        () => stores.find((store) => store.id === storeId) || null,
        [stores, storeId],
    );

    const latestForStore = storeId ? latestMap[storeId] || null : null;

    useEffect(() => {
        if (!autoSyncEnabled || !can('view-export')) {
            return undefined;
        }

        let cancelled = false;

        const poll = async () => {
            try {
                const params = storeId ? { store_id: storeId } : {};
                const response = await axios.get('/api/v1/sync/status', { params });
                if (cancelled) {
                    return;
                }

                const data = response.data || {};
                setConfigured(Boolean(data.firebase_configured));

                if (Array.isArray(data.recent)) {
                    setSyncLogs(data.recent);

                    data.recent.forEach((log) => {
                        if (!log?.id || seenSyncIds.current.has(log.id)) {
                            return;
                        }

                        seenSyncIds.current.add(log.id);

                        if (log.status === 'success') {
                            fireToast(
                                'success',
                                `Синхронизация: ${log.store_name || log.store_key || 'магазин'}`,
                            );
                        } else if (log.status === 'failed') {
                            fireToast(
                                'error',
                                log.error_message ||
                                    log.message ||
                                    'Ошибка синхронизации Firebase',
                            );
                        }
                    });
                }

                if (data.latest?.store_id) {
                    setLatestMap((prev) => ({
                        ...prev,
                        [data.latest.store_id]: data.latest,
                    }));
                }
            } catch {
                // polling failures are silent
            }
        };

        poll();
        const timer = window.setInterval(poll, 30000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [autoSyncEnabled, can, storeId]);

    const generate = async () => {
        if (!storeId) {
            fireError('Выберите магазин.');
            return;
        }

        setLoading(true);

        try {
            const response = await axios.get(`/api/v1/export/${storeId}`);
            setJsonPreview(JSON.stringify(response.data, null, 2));
            setGeneratedAt(response.data?.metadata?.updatedAt || null);
            fireSuccess('JSON сгенерирован.');
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.store_id?.[0] ||
                'Не удалось сгенерировать экспорт.';
            fireError(message);
        } finally {
            setLoading(false);
        }
    };

    const download = () => {
        if (!storeId) {
            fireError('Выберите магазин.');
            return;
        }

        window.location.href = route('export.download', storeId);
    };

    const syncNow = () => {
        if (!storeId) {
            fireError('Выберите магазин.');
            return;
        }

        if (!configured) {
            fireError(
                'Firebase не настроен. Откройте Настройки → Интеграции и укажите Database URL + credentials JSON.',
            );
            return;
        }

        setSending(true);

        router.post(
            route('export.firebase', storeId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    fireToast('success', 'Синхронизация выполнена');
                },
                onError: (errors) => {
                    fireError(
                        errors.firebase ||
                            errors.store_id ||
                            'Не удалось синхронизировать с Firebase.',
                    );
                },
                onFinish: () => setSending(false),
            },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Экспорт
                </h1>
            }
        >
            <Head title="Экспорт" />

            <div className="space-y-4">
                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-400">
                            Автосинхронизация с Firebase при изменении магазинов,
                            оборудования и планограмм. Очередь:{' '}
                            <code className="text-slate-300">php artisan queue:work</code>
                        </p>
                        <span
                            className={clsx(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                                configured
                                    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
                            )}
                        >
                            Firebase: {configured ? 'настроен' : 'не настроен'}
                        </span>
                    </div>

                    <div className="mb-4 rounded-lg border border-slate-700/80 bg-[#0e172b] px-3 py-3 text-sm text-slate-300">
                        <div className="flex flex-wrap items-center gap-2">
                            <ArrowPathIcon className="h-4 w-4 text-cyan-400" />
                            <span className="font-medium text-slate-100">
                                Последняя синхронизация:
                            </span>
                            <span>
                                {latestForStore
                                    ? `${formatRelative(latestForStore.synced_at)}`
                                    : 'ещё не было'}
                            </span>
                            {latestForStore?.status === 'success' && (
                                <span className="text-emerald-300">✅</span>
                            )}
                            {latestForStore?.status === 'failed' && (
                                <span className="text-red-300">❌</span>
                            )}
                            {latestForStore?.status && (
                                <span className="text-xs text-slate-500">
                                    ({statusLabel(latestForStore.status)}
                                    {latestForStore.json_size
                                        ? `, ${formatBytes(latestForStore.json_size)}`
                                        : ''}
                                    )
                                </span>
                            )}
                        </div>
                        {latestForStore?.error_message && (
                            <p className="mt-1 text-xs text-red-300">
                                {latestForStore.error_message}
                            </p>
                        )}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                            <label
                                htmlFor="store_id"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Магазин
                            </label>
                            <select
                                id="store_id"
                                value={storeId}
                                onChange={(e) => {
                                    setStoreId(e.target.value);
                                    setJsonPreview('');
                                    setGeneratedAt(null);
                                }}
                                className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Выберите магазин</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                            {selectedStore?.key && (
                                <p className="mt-1.5 text-xs text-slate-400">
                                    store_key:{' '}
                                    <span className="font-mono">
                                        {selectedStore.key}
                                    </span>
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {can('generate-export') && (
                                <button
                                    type="button"
                                    onClick={generate}
                                    disabled={loading || !storeId}
                                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <DocumentTextIcon className="h-4 w-4" />
                                    {loading ? 'Генерация…' : 'Сгенерировать'}
                                </button>
                            )}

                            {can('download-export') && (
                                <button
                                    type="button"
                                    onClick={download}
                                    disabled={!storeId}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-semibold text-slate-200 shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                    Скачать JSON
                                </button>
                            )}

                            {can('firebase-export') && (
                                <button
                                    type="button"
                                    onClick={syncNow}
                                    disabled={sending || !storeId}
                                    title={
                                        configured
                                            ? 'Принудительная синхронизация сейчас'
                                            : 'Сначала настройте Firebase в Интеграциях'
                                    }
                                    className={clsx(
                                        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60',
                                        configured
                                            ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                                            : 'border border-slate-700 bg-[#1a2740] text-slate-300 hover:bg-slate-800',
                                    )}
                                >
                                    <CloudArrowUpIcon className="h-4 w-4" />
                                    {sending
                                        ? 'Синхронизация…'
                                        : 'Синхронизировать сейчас'}
                                </button>
                            )}
                        </div>
                    </div>

                    {!configured && (
                        <p className="mt-3 text-sm text-amber-300/90">
                            Чтобы синхронизировать данные, заполните Project ID,
                            Database URL и загрузите service account JSON в{' '}
                            <Link
                                href="/settings?tab=integrations"
                                className="underline hover:text-amber-200"
                            >
                                Настройки → Интеграции
                            </Link>
                            .
                        </p>
                    )}

                    {generatedAt && (
                        <div className="mt-3 text-xs text-slate-400">
                            updatedAt preview: {generatedAt}
                        </div>
                    )}
                </div>

                {syncLogs.length > 0 && (
                    <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                        <div className="border-b border-slate-800 px-4 py-3 sm:px-6">
                            <h2 className="text-sm font-semibold text-white">
                                Последние синхронизации
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead className="bg-[#0e172b]">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                                            Магазин
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                                            Статус
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                                            Размер
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-slate-400">
                                            Время
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {syncLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-4 py-2 text-sm text-slate-200">
                                                <div>{log.store_name || '—'}</div>
                                                <div className="font-mono text-xs text-slate-500">
                                                    {log.store_key}
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                <span
                                                    className={clsx(
                                                        'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                                        log.status === 'success'
                                                            ? 'bg-emerald-500/15 text-emerald-300'
                                                            : log.status ===
                                                                'skipped'
                                                              ? 'bg-amber-500/15 text-amber-300'
                                                              : 'bg-red-500/15 text-red-300',
                                                    )}
                                                >
                                                    {statusLabel(log.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-300">
                                                {formatBytes(log.json_size)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-400">
                                                <div>
                                                    {formatRelative(log.synced_at)}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {formatDate(log.synced_at)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <h2 className="text-sm font-semibold text-white">
                            Предпросмотр JSON
                        </h2>
                        <span className="text-xs text-slate-400">
                            {jsonPreview
                                ? `${jsonPreview.length.toLocaleString('ru-RU')} символов`
                                : 'Сначала сгенерируйте экспорт'}
                        </span>
                    </div>
                    <textarea
                        readOnly
                        value={jsonPreview}
                        placeholder="Здесь появится JSON после генерации…"
                        className="block h-[28rem] w-full resize-y rounded-xl border-slate-700 bg-[#0e172b] font-mono text-xs leading-5 text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
