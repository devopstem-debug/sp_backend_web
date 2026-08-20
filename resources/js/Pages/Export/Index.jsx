import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    CloudArrowUpIcon,
    DocumentTextIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess } from '@/lib/swal';
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

export default function Index({
    stores = [],
    firebaseConfigured = false,
    recentSyncs = [],
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const [storeId, setStoreId] = useState(stores[0]?.id || '');
    const [jsonPreview, setJsonPreview] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [lastFirebaseStatus, setLastFirebaseStatus] = useState(null);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
            setLastFirebaseStatus('success');
        }
        if (flash?.error) {
            fireError(flash.error);
            setLastFirebaseStatus('error');
        }
    }, [flash]);

    const selectedStore = useMemo(
        () => stores.find((store) => store.id === storeId) || null,
        [stores, storeId],
    );

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

    const sendFirebase = () => {
        if (!storeId) {
            fireError('Выберите магазин.');
            return;
        }

        if (!firebaseConfigured) {
            fireError(
                'Firebase не настроен. Откройте Настройки → Интеграции и укажите Database URL + credentials JSON.',
            );
            return;
        }

        setSending(true);
        setLastFirebaseStatus('pending');

        router.post(
            route('export.firebase', storeId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setLastFirebaseStatus('success');
                },
                onError: (errors) => {
                    setLastFirebaseStatus('error');
                    fireError(
                        errors.firebase ||
                            errors.store_id ||
                            'Не удалось отправить данные в Firebase.',
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
                            Генерация JSON для C++ движка и синхронизация с Firebase
                            Realtime Database.
                        </p>
                        <span
                            className={clsx(
                                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                                firebaseConfigured
                                    ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                                    : 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
                            )}
                        >
                            Firebase:{' '}
                            {firebaseConfigured ? 'настроен' : 'не настроен'}
                        </span>
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
                                    setLastFirebaseStatus(null);
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
                                    onClick={sendFirebase}
                                    disabled={sending || !storeId}
                                    title={
                                        firebaseConfigured
                                            ? 'Отправить JSON в Realtime Database'
                                            : 'Сначала настройте Firebase в Интеграциях'
                                    }
                                    className={clsx(
                                        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-60',
                                        firebaseConfigured
                                            ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                                            : 'border border-slate-700 bg-[#1a2740] text-slate-300 hover:bg-slate-800',
                                    )}
                                >
                                    <CloudArrowUpIcon className="h-4 w-4" />
                                    {sending
                                        ? 'Отправка…'
                                        : 'Отправить в Firebase'}
                                </button>
                            )}
                        </div>
                    </div>

                    {!firebaseConfigured && (
                        <p className="mt-3 text-sm text-amber-300/90">
                            Чтобы отправлять данные, заполните Project ID, Database
                            URL и загрузите service account JSON в{' '}
                            <Link
                                href="/settings?tab=integrations"
                                className="underline hover:text-amber-200"
                            >
                                Настройки → Интеграции
                            </Link>
                            .
                        </p>
                    )}

                    {(generatedAt || lastFirebaseStatus) && (
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                            {generatedAt && <span>updatedAt: {generatedAt}</span>}
                            {lastFirebaseStatus === 'pending' && (
                                <span className="text-cyan-300">
                                    Firebase: отправка…
                                </span>
                            )}
                            {lastFirebaseStatus === 'success' && (
                                <span className="text-emerald-300">
                                    Firebase: успешно
                                </span>
                            )}
                            {lastFirebaseStatus === 'error' && (
                                <span className="text-red-300">
                                    Firebase: ошибка
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {recentSyncs.length > 0 && (
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
                                    {recentSyncs.map((log) => (
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
                                                            : 'bg-red-500/15 text-red-300',
                                                    )}
                                                >
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-300">
                                                {formatBytes(log.json_size)}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-slate-400">
                                                {formatDate(log.synced_at)}
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
