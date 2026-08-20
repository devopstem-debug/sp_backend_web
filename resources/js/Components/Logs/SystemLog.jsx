import { MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/outline';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { fireConfirm, fireError } from '@/lib/swal';
import clsx from 'clsx';

function LevelBadge({ level }) {
    const tone =
        level === 'ERROR' || level === 'CRITICAL' || level === 'ALERT' || level === 'EMERGENCY'
            ? 'bg-red-50 text-red-400 ring-red-600/20'
            : level === 'WARNING'
              ? 'bg-amber-50 text-amber-800 ring-amber-600/20'
              : level === 'INFO' || level === 'NOTICE'
                ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
                : 'bg-slate-100 text-slate-200 ring-slate-500/20';

    return (
        <span
            className={clsx(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide ring-1',
                tone,
            )}
        >
            {level}
        </span>
    );
}

function entryTone(level) {
    if (['ERROR', 'CRITICAL', 'ALERT', 'EMERGENCY'].includes(level)) {
        return 'border-l-red-500 bg-red-50/40';
    }
    if (level === 'WARNING') {
        return 'border-l-amber-400 bg-amber-50/40';
    }
    if (['INFO', 'NOTICE'].includes(level)) {
        return 'border-l-sky-400 bg-sky-50/30';
    }
    return 'border-l-slate-300 bg-[#152033]';
}

export default function SystemLog({
    systemLogs,
    filters = {},
    levels = [],
}) {
    const [level, setLevel] = useState(filters.level || '');
    const [search, setSearch] = useState(filters.search || '');
    const [expanded, setExpanded] = useState({});

    const entries = systemLogs?.entries || [];

    const applyFilters = (overrides = {}) => {
        router.get(
            route('logs.index'),
            {
                tab: 'system',
                level: level || undefined,
                search: search || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const handleClear = async () => {
        const confirmed = await fireConfirm(
            'Очистить системный лог?',
            'Файл storage/logs/laravel.log будет очищен. Это действие нельзя отменить.',
            'Очистить',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('logs.system.clear'),
            {},
            {
                preserveScroll: true,
                onError: () => fireError('Не удалось очистить лог.'),
            },
        );
    };

    const sizeLabel = useMemo(() => {
        const size = systemLogs?.size || 0;
        if (size < 1024) {
            return `${size} B`;
        }
        if (size < 1024 * 1024) {
            return `${(size / 1024).toFixed(1)} KB`;
        }
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }, [systemLogs?.size]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-xl bg-[#1a2740] p-4 ring-1 ring-slate-800 lg:flex-row lg:items-end">
                <div className="w-full lg:w-40">
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Уровень
                    </label>
                    <select
                        value={level}
                        onChange={(e) => {
                            setLevel(e.target.value);
                            applyFilters({ level: e.target.value || undefined });
                        }}
                        className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        <option value="">Все</option>
                        {levels.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="min-w-0 flex-1">
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                        Поиск
                    </label>
                    <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    applyFilters({ search: search || undefined });
                                }
                            }}
                            placeholder="Текст ошибки…"
                            className="block w-full rounded-lg border-slate-700 py-2 pl-9 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => applyFilters()}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                    Найти
                </button>

                <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-[#152033] px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/10"
                >
                    <TrashIcon className="h-4 w-4" />
                    Очистить лог
                </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>
                    Файл: {systemLogs?.path || 'storage/logs/laravel.log'} · размер{' '}
                    {sizeLabel}
                </span>
                <span>Показано записей: {systemLogs?.total ?? 0} (макс. 200)</span>
            </div>

            <div className="space-y-2">
                {entries.length === 0 ? (
                    <div className="rounded-xl bg-[#152033] px-4 py-10 text-center text-sm text-slate-400 shadow-sm ring-1 ring-slate-800">
                        {systemLogs?.exists
                            ? 'Подходящих записей нет'
                            : 'Файл лога пока пуст или не создан'}
                    </div>
                ) : (
                    entries.map((entry) => {
                        const open = Boolean(expanded[entry.id]);
                        const preview =
                            entry.message.length > 180
                                ? `${entry.message.slice(0, 180)}…`
                                : entry.message;

                        return (
                            <button
                                key={entry.id}
                                type="button"
                                onClick={() =>
                                    setExpanded((prev) => ({
                                        ...prev,
                                        [entry.id]: !prev[entry.id],
                                    }))
                                }
                                className={clsx(
                                    'block w-full rounded-xl border border-slate-800 border-l-4 p-3 text-left shadow-sm transition hover:shadow',
                                    entryTone(entry.level),
                                )}
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    <LevelBadge level={entry.level} />
                                    <span className="font-mono text-xs text-slate-400">
                                        {entry.datetime || '—'}
                                    </span>
                                </div>
                                <pre
                                    className={clsx(
                                        'mt-2 whitespace-pre-wrap break-words font-mono text-xs text-white',
                                        !open && 'line-clamp-3',
                                    )}
                                >
                                    {open ? entry.raw : preview}
                                </pre>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}
