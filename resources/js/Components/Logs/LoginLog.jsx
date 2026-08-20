import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import clsx from 'clsx';

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
            second: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function StatusBadge({ status }) {
    const success = status === 'success';

    return (
        <span
            className={clsx(
                'inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1',
                success
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-red-50 text-red-400 ring-red-600/20',
            )}
        >
            {success ? 'Успешно' : 'Неудачно'}
        </span>
    );
}

export default function LoginLog({ logs, filters = {}, users = [] }) {
    const [userId, setUserId] = useState(filters.user_id || '');
    const [status, setStatus] = useState(filters.status || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');

    const applyFilters = (overrides = {}) => {
        router.get(
            route('logs.index'),
            {
                tab: 'logins',
                user_id: userId || undefined,
                status: status || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <div className="space-y-4">
            <div className="grid gap-3 rounded-xl bg-[#1a2740] p-4 ring-1 ring-slate-800 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Пользователь
                    </label>
                    <select
                        value={userId}
                        onChange={(e) => {
                            setUserId(e.target.value);
                            applyFilters({
                                user_id: e.target.value || undefined,
                            });
                        }}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Все</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Статус
                    </label>
                    <select
                        value={status}
                        onChange={(e) => {
                            setStatus(e.target.value);
                            applyFilters({
                                status: e.target.value || undefined,
                            });
                        }}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Все</option>
                        <option value="success">Успешно</option>
                        <option value="failed">Неудачно</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Дата с
                    </label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Дата по
                    </label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={() => applyFilters()}
                        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        Применить
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#1a2740]">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Пользователь
                                </th>
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
                                    Время
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {!logs?.data?.length ? (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="px-4 py-10 text-center text-sm text-slate-400"
                                    >
                                        Логов входа нет
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-800">
                                        <td className="px-4 py-3 text-sm">
                                            <div className="font-medium text-white">
                                                {row.user_name}
                                            </div>
                                            {row.user_email && (
                                                <div className="text-xs text-slate-400">
                                                    {row.user_email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-200">
                                            {row.ip_address || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td className="max-w-xs truncate px-4 py-3 text-xs text-slate-400">
                                            {row.user_agent || '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                            {formatDate(row.created_at)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {logs?.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                        <p className="text-sm text-slate-400">
                            Стр. {logs.current_page} из {logs.last_page}
                        </p>
                        <div className="flex gap-2">
                            {logs.prev_page_url && (
                                <Link
                                    href={logs.prev_page_url}
                                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                    preserveScroll
                                >
                                    Назад
                                </Link>
                            )}
                            {logs.next_page_url && (
                                <Link
                                    href={logs.next_page_url}
                                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                    preserveScroll
                                >
                                    Далее
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
