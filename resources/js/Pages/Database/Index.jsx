import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    CircleStackIcon,
    CommandLineIcon,
    TableCellsIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';

function formatCount(value) {
    return new Intl.NumberFormat('ru-RU').format(Number(value || 0));
}

export default function Index({
    tables = [],
    canExportSql = false,
    driver = 'pgsql',
}) {
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold leading-tight text-white">
                        База данных
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                        {canExportSql ? (
                            <a
                                href={route('database.export-sql')}
                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                title="Скачать полный дамп БД (.sql) для переноса на другой VPS"
                            >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Экспорт SQL
                            </a>
                        ) : null}
                        <Link
                            href={route('database.sql')}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                        >
                            <CommandLineIcon className="h-4 w-4" />
                            SQL-консоль
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="База данных" />

            <div className="space-y-4">
                {canExportSql ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300">
                        <p className="font-medium text-emerald-200">
                            Бэкап для переезда на другой VPS
                        </p>
                        <p className="mt-1 text-slate-400">
                            Кнопка «Экспорт SQL» скачивает полный дамп (
                            <span className="font-mono text-slate-300">
                                {driver}
                            </span>
                            ). В файл не входят{' '}
                            <code className="text-slate-300">.env</code>, файлы
                            из <code className="text-slate-300">storage/</code>{' '}
                            и Firebase credentials — скопируйте их отдельно.
                        </p>
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="border-b border-slate-800 px-4 py-4 sm:px-6">
                        <p className="text-sm text-slate-400">
                            Только чтение. Системные таблицы и секретные поля
                            скрыты.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800">
                            <thead className="bg-[#0e172b]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Таблица
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Записей
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Действие
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {tables.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={3}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            Таблицы не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    tables.map((item) => (
                                        <tr
                                            key={item.name}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-white">
                                                <div className="flex items-center gap-2">
                                                    <TableCellsIcon className="h-4 w-4 text-indigo-300" />
                                                    {item.name}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-300">
                                                {formatCount(item.count)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <Link
                                                    href={route(
                                                        'database.show',
                                                        item.name,
                                                    )}
                                                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                >
                                                    <CircleStackIcon className="h-4 w-4" />
                                                    Просмотр
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
