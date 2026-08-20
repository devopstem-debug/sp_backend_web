import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeftIcon, PlayIcon } from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError } from '@/lib/swal';

function formatCell(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

export default function Sql({
    query = '',
    result = { columns: [], rows: [], row_count: 0 },
}) {
    const { flash, errors } = usePage().props;
    const form = useForm({
        query: query || 'SELECT * FROM tenants LIMIT 20',
    });

    useEffect(() => {
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const submit = (event) => {
        event.preventDefault();

        form.post(route('database.sql.execute'), {
            preserveScroll: true,
        });
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
                        SQL-консоль
                    </h1>
                </div>
            }
        >
            <Head title="SQL-консоль" />

            <div className="space-y-4">
                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="border-b border-slate-800 px-4 py-4 sm:px-6">
                        <p className="text-sm text-slate-400">
                            Только SELECT. Изменения данных запрещены. Секретные поля
                            маскируются автоматически.
                        </p>
                    </div>

                    <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
                        <div>
                            <label
                                htmlFor="query"
                                className="mb-2 block text-sm font-medium text-slate-300"
                            >
                                SQL-запрос
                            </label>
                            <textarea
                                id="query"
                                rows={8}
                                value={form.data.query}
                                onChange={(event) =>
                                    form.setData('query', event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 font-mono text-sm text-emerald-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                spellCheck={false}
                            />
                            {(errors?.query || form.errors.query) && (
                                <p className="mt-2 text-sm text-red-400">
                                    {errors?.query || form.errors.query}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            <PlayIcon className="h-4 w-4" />
                            {form.processing ? 'Выполнение...' : 'Выполнить'}
                        </button>
                    </form>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="border-b border-slate-800 px-4 py-3 sm:px-6">
                        <p className="text-sm text-slate-400">
                            Результат: {result.row_count} строк
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        {result.columns.length === 0 ? (
                            <p className="px-4 py-10 text-center text-sm text-slate-400">
                                Нет данных для отображения
                            </p>
                        ) : (
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead className="bg-[#0e172b]">
                                    <tr>
                                        {result.columns.map((column) => (
                                            <th
                                                key={column}
                                                className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                                            >
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                    {result.rows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={result.columns.length}
                                                className="px-4 py-10 text-center text-sm text-slate-400"
                                            >
                                                Запрос не вернул строк
                                            </td>
                                        </tr>
                                    ) : (
                                        result.rows.map((row, index) => (
                                            <tr
                                                key={index}
                                                className="hover:bg-slate-800/80"
                                            >
                                                {result.columns.map((column) => (
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
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
