import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    LockClosedIcon,
    LockOpenIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireConfirm, fireError, fireSuccess, fireToast } from '@/lib/swal';
import clsx from 'clsx';

const TABS = [
    { id: 'profile', label: 'Профиль' },
    { id: 'logins', label: 'Входы' },
    { id: 'actions', label: 'Действия' },
    { id: 'comments', label: 'Комментарии' },
];

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

function truncate(value, max = 64) {
    const text = String(value || '');
    if (text.length <= max) {
        return text || '—';
    }
    return `${text.slice(0, max)}…`;
}

function InfoRow({ label, children }) {
    return (
        <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-400">{label}</dt>
            <dd className="text-sm text-white sm:col-span-2">{children}</dd>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}

function FirebaseStatusBadge({ status }) {
    const normalized = status || 'pending';

    const styles = {
        synced: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        error: 'bg-red-50 text-red-700 ring-red-600/20',
    };

    const labels = {
        synced: '✅ synced',
        pending: '⏳ pending',
        error: '❌ error',
    };

    return (
        <span
            className={clsx(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                styles[normalized] || styles.pending,
            )}
        >
            {labels[normalized] || labels.pending}
        </span>
    );
}

export default function Show({
    user,
    loginLogs = [],
    activities = [],
    comments = [],
    stats = {},
    firebaseConfigured = false,
}) {
    const page = usePage();
    const { flash } = page.props;
    const pageUrl = page.url;
    const can = useCan();
    const canEdit = can('edit-users');
    const canBlock = can('block-users');

    const initialTab = useMemo(() => {
        if (flash?.tab && TABS.some((tab) => tab.id === flash.tab)) {
            return flash.tab;
        }

        try {
            const params = new URLSearchParams(
                pageUrl.includes('?') ? pageUrl.split('?')[1] : '',
            );
            const tab = params.get('tab');
            if (tab && TABS.some((item) => item.id === tab)) {
                return tab;
            }
        } catch {
            // ignore
        }

        return 'profile';
    }, [flash?.tab, pageUrl]);

    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
        if (flash?.warning) {
            fireToast('warning', flash.warning);
        }
    }, [flash]);

    const commentForm = useForm({ comment: '' });

    const setTab = (tabId) => {
        setActiveTab(tabId);
        const nextUrl = `${route('users.show', user.id)}?tab=${tabId}`;
        window.history.replaceState({}, '', nextUrl);
    };

    const handleToggleActive = async () => {
        const willBlock = user.is_active;
        const confirmed = await fireConfirm(
            willBlock ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?',
            willBlock
                ? `«${user.name}» не сможет войти в систему.`
                : `«${user.name}» снова получит доступ.`,
            willBlock ? 'Заблокировать' : 'Разблокировать',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('users.toggle-active', user.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось изменить статус пользователя.'),
            },
        );
    };

    const submitComment = (e) => {
        e.preventDefault();

        if (!String(commentForm.data.comment || '').trim()) {
            fireError('Введите комментарий.');
            return;
        }

        commentForm.post(route('users.comments.store', user.id), {
            preserveScroll: true,
            onSuccess: () => {
                commentForm.reset('comment');
                setTab('comments');
            },
            onError: () => fireError('Не удалось добавить комментарий.'),
        });
    };

    const handleSyncFirebase = async () => {
        const confirmed = await fireConfirm(
            'Синхронизировать с Firebase?',
            'Данные пользователя будут отправлены в Firebase Auth и RTDB.',
            'Синхронизировать',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('users.sync-firebase', user.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось синхронизировать пользователя с Firebase.'),
            },
        );
    };

    const handleDeleteFromFirebase = async () => {
        const confirmed = await fireConfirm(
            'Удалить из Firebase?',
            'Аккаунт будет удалён из Firebase Auth и RTDB. Локальная запись сохранится.',
            'Удалить из Firebase',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('users.delete-firebase', user.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось удалить пользователя из Firebase.'),
            },
        );
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-xl font-semibold leading-tight text-white">
                            {user.name}
                        </h1>
                        <p className="mt-0.5 text-sm text-slate-400">
                            {user.email}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('users.index')}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-[#152033] px-3 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                            К списку
                        </Link>
                        {canEdit && (
                        <Link
                            href={route('users.edit', user.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                            Изменить
                        </Link>
                        )}
                        {canBlock && (
                        <button
                            type="button"
                            onClick={handleToggleActive}
                            className={clsx(
                                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold shadow-sm',
                                user.is_active
                                    ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                            )}
                        >
                            {user.is_active ? (
                                <>
                                    <LockClosedIcon className="h-4 w-4" />
                                    Заблокировать
                                </>
                            ) : (
                                <>
                                    <LockOpenIcon className="h-4 w-4" />
                                    Разблокировать
                                </>
                            )}
                        </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={user.name} />

            <div className="space-y-4">
                {user.firebase_status === 'error' ? (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                        <p>
                            Синхронизация с Firebase завершилась с ошибкой.
                            Проверьте настройки интеграции или повторите
                            отправку.
                        </p>
                        {canEdit ? (
                            <button
                                type="button"
                                onClick={handleSyncFirebase}
                                className="mt-3 rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-500/30"
                            >
                                Повторить синхронизацию
                            </button>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex gap-1 overflow-x-auto rounded-lg bg-[#152033] p-1 shadow-sm ring-1 ring-slate-800">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setTab(tab.id)}
                            className={clsx(
                                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800',
                            )}
                        >
                            {tab.label}
                            {tab.id === 'comments' && comments.length > 0 && (
                                <span
                                    className={clsx(
                                        'ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs',
                                        activeTab === tab.id
                                            ? 'bg-white/20'
                                            : 'bg-[#0e172b] text-slate-300',
                                    )}
                                >
                                    {comments.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === 'profile' && (
                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <StatCard
                                label="Всего входов"
                                value={stats.logins_total ?? 0}
                            />
                            <StatCard
                                label="Действий"
                                value={stats.actions_total ?? 0}
                            />
                            <StatCard
                                label="Активных сессий"
                                value={stats.sessions_active ?? 0}
                            />
                        </div>

                        <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                            <h2 className="mb-4 text-base font-semibold text-white">
                                Данные пользователя
                            </h2>
                            <dl className="space-y-4">
                                <InfoRow label="Имя">{user.name || '—'}</InfoRow>
                                <InfoRow label="Email">
                                    {user.email || '—'}
                                </InfoRow>
                                <InfoRow label="Телефон">
                                    {user.phone || '—'}
                                </InfoRow>
                                <InfoRow label="Роль">
                                    {user.role || '—'}
                                </InfoRow>
                                <InfoRow label="Отдел">
                                    {user.department_name || '—'}
                                </InfoRow>
                                <InfoRow label="Арендатор">
                                    {user.tenant_name || '—'}
                                    {user.tenant_domain
                                        ? ` (${user.tenant_domain})`
                                        : ''}
                                </InfoRow>
                                <InfoRow label="Статус">
                                    <span
                                        className={clsx(
                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                            user.is_active
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                : 'bg-red-50 text-red-400 ring-red-600/20',
                                        )}
                                    >
                                        {user.is_active
                                            ? 'Активен'
                                            : 'Заблокирован'}
                                    </span>
                                </InfoRow>
                                <InfoRow label="Часовой пояс">
                                    {user.timezone || '—'}
                                </InfoRow>
                                <InfoRow label="Язык">
                                    {user.locale === 'en'
                                        ? 'English'
                                        : user.locale === 'ru'
                                          ? 'Русский'
                                          : user.locale || '—'}
                                </InfoRow>
                                <InfoRow label="Последний вход">
                                    {formatDate(user.last_login_at)}
                                </InfoRow>
                                <InfoRow label="Создан">
                                    {formatDate(user.created_at)}
                                </InfoRow>
                            </dl>
                        </div>

                        <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h2 className="text-base font-semibold text-white">
                                        Firebase интеграция
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        {firebaseConfigured
                                            ? 'Firebase настроен для арендатора.'
                                            : 'Firebase не настроен — синхронизация недоступна.'}
                                    </p>
                                </div>
                                {canEdit && firebaseConfigured ? (
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSyncFirebase}
                                            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                                        >
                                            Синхронизировать сейчас
                                        </button>
                                        {user.firebase_uid ? (
                                            <button
                                                type="button"
                                                onClick={handleDeleteFromFirebase}
                                                className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                                            >
                                                Удалить из Firebase
                                            </button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                            <dl className="space-y-4">
                                <InfoRow label="Firebase UID">
                                    <span className="font-mono text-sm">
                                        {user.firebase_uid || '—'}
                                    </span>
                                </InfoRow>
                                <InfoRow label="Статус">
                                    <FirebaseStatusBadge
                                        status={user.firebase_status}
                                    />
                                </InfoRow>
                                <InfoRow label="Последняя синхронизация">
                                    {formatDate(user.firebase_synced_at)}
                                </InfoRow>
                            </dl>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <StatCard
                                label="Успешных входов"
                                value={stats.logins_success ?? 0}
                            />
                            <StatCard
                                label="Неудачных входов"
                                value={stats.logins_failed ?? 0}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'logins' && (
                    <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-[#1a2740]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            IP
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Статус
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            User-Agent
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Дата
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                    {loginLogs.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-10 text-center text-sm text-slate-400"
                                            >
                                                Записей о входах нет
                                            </td>
                                        </tr>
                                    ) : (
                                        loginLogs.map((log) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-slate-800/80"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-white">
                                                    {log.ip_address || '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                    <span
                                                        className={clsx(
                                                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                            log.status ===
                                                            'success'
                                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                                : 'bg-red-50 text-red-400 ring-red-600/20',
                                                        )}
                                                    >
                                                        {log.status ===
                                                        'success'
                                                            ? 'Успех'
                                                            : 'Ошибка'}
                                                    </span>
                                                </td>
                                                <td
                                                    className="max-w-md truncate px-4 py-3 text-sm text-slate-300"
                                                    title={log.user_agent || ''}
                                                >
                                                    {truncate(
                                                        log.user_agent,
                                                        80,
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                    {formatDate(
                                                        log.created_at,
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'actions' && (
                    <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-[#1a2740]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Описание
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Событие
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Объект
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Дата
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                    {activities.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-4 py-10 text-center text-sm text-slate-400"
                                            >
                                                Действий пока нет
                                            </td>
                                        </tr>
                                    ) : (
                                        activities.map((activity) => (
                                            <tr
                                                key={activity.id}
                                                className="hover:bg-slate-800/80"
                                            >
                                                <td className="px-4 py-3 text-sm text-white">
                                                    {activity.description ||
                                                        '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                    {activity.event || '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                    {activity.subject_type ||
                                                        '—'}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                    {formatDate(
                                                        activity.created_at,
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'comments' && (
                    <div className="space-y-4">
                        {canEdit && (
                        <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                            <h2 className="mb-3 text-base font-semibold text-white">
                                Добавить комментарий
                            </h2>
                            <form onSubmit={submitComment} className="space-y-3">
                                <textarea
                                    rows={4}
                                    value={commentForm.data.comment}
                                    onChange={(e) =>
                                        commentForm.setData(
                                            'comment',
                                            e.target.value,
                                        )
                                    }
                                    className="block w-full rounded-lg border border-slate-700 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                    placeholder="Заметка о пользователе…"
                                    maxLength={5000}
                                />
                                {commentForm.errors.comment && (
                                    <p className="text-sm text-red-600">
                                        {commentForm.errors.comment}
                                    </p>
                                )}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={commentForm.processing}
                                        className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {commentForm.processing
                                            ? 'Отправка…'
                                            : 'Отправить'}
                                    </button>
                                </div>
                            </form>
                        </div>
                        )}

                        <div className="space-y-3">
                            {comments.length === 0 ? (
                                <div className="rounded-xl bg-[#152033] px-4 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-800">
                                    Комментариев пока нет
                                </div>
                            ) : (
                                comments.map((item) => (
                                    <div
                                        key={item.id}
                                        className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800"
                                    >
                                        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                            <p className="text-sm font-medium text-white">
                                                {item.author_name ||
                                                    'Неизвестный автор'}
                                                {item.author_email && (
                                                    <span className="ml-2 font-normal text-slate-400">
                                                        {item.author_email}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {formatDate(item.created_at)}
                                            </p>
                                        </div>
                                        <p className="whitespace-pre-wrap text-sm text-slate-200">
                                            {item.comment}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
