import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import clsx from 'clsx';

function formatCell(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

export default function Show({
    table,
    columns = [],
    records = { data: [] },
    filters = {},
}) {
    const [search, setSearch] = useState(filters.search || '');

    const applyFilters = (overrides = {}) => {
        router.get(
            route('database.show', table),
            {
                search: search || undefined,
                sort: filters.sort || undefined,
                direction: filters.direction || undefined,
                ...overrides,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        applyFilters({ search: search || undefined, page: 1 });
    };

    const toggleSort = (column) => {
        const isCurrent = filters.sort === column;
        const direction =
            isCurrent && filters.direction === 'asc' ? 'desc' : 'asc';

        applyFilters({
            sort: column,
            direction,
            search: search || undefined,
            page: 1,
        });
    };

    const sortIcon = (column) => {
        if (filters.sort !== column) {
            return null;
        }

        return filters.direction === 'desc' ? (
            <ChevronDownIcon className="h-3.5 w-3.5" />
        ) : (
            <ChevronUpIcon className="h-3.5 w-3.5" />
        );
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={route('database.index')}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Назад
                    </Link>
                    <h1 className="text-xl font-semibold leading-tight text-white">
                        {table}
                    </h1>
                </div>
            }
        >
            <Head title={`Таблица ${table}`} />

            <div className="space-y-4">
                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="border-b border-slate-800 p-4 sm:p-6">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex flex-col gap-3 sm:flex-row sm:items-center"
                        >
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) =>
                                        setSearch(event.target.value)
                                    }
                                    placeholder="Поиск по текстовым полям..."
                                    className="w-full rounded-lg border border-slate-700 bg-[#0e172b] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                            >
                                Найти
                            </button>
                        </form>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800">
                            <thead className="bg-[#0e172b]">
                                <tr>
                                    {columns.map((column) => (
                                        <th
                                            key={column}
                                            className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleSort(column)}
                                                className={clsx(
                                                    'inline-flex items-center gap-1 hover:text-white',
                                                    filters.sort === column &&
                                                        'text-indigo-300',
                                                )}
                                            >
                                                {column}
                                                {sortIcon(column)}
                                            </button>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {records.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={Math.max(columns.length, 1)}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            Записи не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    records.data.map((row, index) => (
                                        <tr
                                            key={index}
                                            className="hover:bg-slate-800/80"
                                        >
                                            {columns.map((column) => (
                                                <td
                                                    key={column}
                                                    className="max-w-xs truncate whitespace-nowrap px-3 py-2 text-sm text-slate-300"
                                                    title={formatCell(row[column])}
                                                >
                                                    {formatCell(row[column])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {records.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {records.current_page} из {records.last_page}{' '}
                                · всего {records.total}
                            </p>
                            <div className="flex gap-2">
                                {records.prev_page_url && (
                                    <Link
                                        href={records.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {records.next_page_url && (
                                    <Link
                                        href={records.next_page_url}
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
        </AdminLayout>
    );
}
