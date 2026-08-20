import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Link, router } from '@inertiajs/react';
import { Fragment, useState } from 'react';

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

function ChangesDetails({ changes }) {
    const attributes = changes?.attributes || {};
    const old = changes?.old || {};
    const keys = Array.from(
        new Set([...Object.keys(attributes), ...Object.keys(old)]),
    );

    if (keys.length === 0) {
        return (
            <p className="px-4 py-3 text-sm text-slate-400">
                Нет деталей изменений
            </p>
        );
    }

    return (
        <div className="overflow-x-auto px-4 py-3">
            <table className="min-w-full text-sm">
                <thead>
                    <tr className="text-left text-xs uppercase text-slate-400">
                        <th className="py-1 pr-4">Поле</th>
                        <th className="py-1 pr-4">Было</th>
                        <th className="py-1">Стало</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {keys.map((key) => (
                        <tr key={key}>
                            <td className="py-1.5 pr-4 font-mono text-xs text-slate-200">
                                {key}
                            </td>
                            <td className="py-1.5 pr-4 text-slate-400">
                                {formatValue(old[key])}
                            </td>
                            <td className="py-1.5 text-white">
                                {formatValue(attributes[key])}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function formatValue(value) {
    if (value === undefined || value === null) {
        return '—';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return String(value);
}

export default function AuditLog({
    logs,
    filters = {},
    users = [],
    events = [],
}) {
    const [userId, setUserId] = useState(filters.user_id || '');
    const [event, setEvent] = useState(filters.event || '');
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    const [expanded, setExpanded] = useState({});

    const applyFilters = (overrides = {}) => {
        router.get(
            route('logs.index'),
            {
                tab: 'audit',
                user_id: userId || undefined,
                event: event || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const toggleRow = (id) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
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
                            applyFilters({ user_id: e.target.value || undefined });
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
                        Действие
                    </label>
                    <select
                        value={event}
                        onChange={(e) => {
                            setEvent(e.target.value);
                            applyFilters({ event: e.target.value || undefined });
                        }}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Все</option>
                        {events.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
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
                                <th className="w-10 px-3 py-3" />
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Пользователь
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Действие
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                    Сущность
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
                                        Записей аудита нет
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((row) => {
                                    const open = Boolean(expanded[row.id]);

                                    return (
                                        <Fragment key={row.id}>
                                            <tr className="hover:bg-slate-800">
                                                <td className="px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggleRow(row.id)
                                                        }
                                                        className="rounded p-1 text-slate-400 hover:bg-[#0e172b] hover:text-white"
                                                    >
                                                        {open ? (
                                                            <ChevronDownIcon className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRightIcon className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-white">
                                                        {row.causer_name}
                                                    </div>
                                                    {row.causer_email && (
                                                        <div className="text-xs text-slate-400">
                                                            {row.causer_email}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    <span className="inline-flex rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                                                        {row.event_label}
                                                    </span>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {row.description}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-200">
                                                    {row.subject_type || '—'}
                                                    {row.subject_id && (
                                                        <span className="ml-1 font-mono text-xs text-slate-400">
                                                            #
                                                            {String(
                                                                row.subject_id,
                                                            ).slice(0, 8)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                    {formatDate(row.created_at)}
                                                </td>
                                            </tr>
                                            {open && (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="bg-[#0e172b]"
                                                    >
                                                        <ChangesDetails
                                                            changes={row.changes}
                                                        />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
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
