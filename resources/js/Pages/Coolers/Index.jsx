import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowPathIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

export default function Index({
    coolers,
    stores = [],
    temperatureZones = {},
    filters,
    trashedCount = 0,
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const canCreate = can('create-coolers');
    const canEdit = can('edit-coolers');
    const canDelete = can('delete-coolers');
    const [search, setSearch] = useState(filters.search || '');
    const [storeId, setStoreId] = useState(filters.store_id || '');
    const trashed = Boolean(filters.trashed);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const applyFilters = (overrides = {}) => {
        router.get(
            route('coolers.index'),
            {
                search: search || undefined,
                store_id: storeId || undefined,
                trashed: trashed ? 1 : undefined,
                ...overrides,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        applyFilters({ search: search || undefined });
    };

    const switchTab = (toTrashed) => {
        applyFilters({
            trashed: toTrashed ? 1 : undefined,
            search: search || undefined,
            store_id: storeId || undefined,
        });
    };

    const labelOf = (cooler) => cooler.display_name || cooler.code;

    const handleDelete = async (cooler) => {
        const confirmed = await fireConfirm(
            'Удалить холодильник?',
            `«${labelOf(cooler)}» (${cooler.code}) будет перемещён в корзину.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('coolers.destroy', cooler.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить холодильник.'),
        });
    };

    const handleRestore = async (cooler) => {
        const confirmed = await fireConfirm(
            'Восстановить холодильник?',
            `«${labelOf(cooler)}» снова появится в списке.`,
            'Восстановить',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('coolers.restore', cooler.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось восстановить холодильник.'),
            },
        );
    };

    const handleForceDelete = async (cooler) => {
        const confirmed = await fireConfirm(
            'Удалить безвозвратно?',
            `«${labelOf(cooler)}» будет удалён навсегда.`,
            'Удалить навсегда',
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('coolers.force-delete', cooler.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить холодильник.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Холодильники
                </h1>
            }
        >
            <Head title="Холодильники" />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-1 rounded-lg bg-[#152033] p-1 shadow-sm ring-1 ring-slate-800">
                        <button
                            type="button"
                            onClick={() => switchTab(false)}
                            className={clsx(
                                'rounded-md px-3 py-1.5 text-sm font-medium transition',
                                !trashed
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800',
                            )}
                        >
                            Активные
                        </button>
                        {(trashedCount > 0 || trashed) && canDelete && (
                            <button
                                type="button"
                                onClick={() => switchTab(true)}
                                className={clsx(
                                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                                    trashed
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800',
                                )}
                            >
                                Корзина
                                {trashedCount > 0 && (
                                    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs">
                                        {trashedCount}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {!trashed && canCreate && (
                        <Link
                            href={route('coolers.create', {
                                store_id: storeId || undefined,
                            })}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                            <PlusIcon className="h-5 w-5" aria-hidden="true" />
                            Добавить
                        </Link>
                    )}
                </div>

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <div className="grid gap-3 md:grid-cols-3 md:items-end">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="md:col-span-2"
                        >
                            <label
                                htmlFor="search"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Поиск
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="search"
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Код или название…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

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
                                    applyFilters({
                                        store_id: e.target.value || undefined,
                                    });
                                }}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Все магазины</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                        >
                            Найти
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#1a2740]">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Код
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Название
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Магазин
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Отдел
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Зона
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Этажи
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Размер, мм
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {coolers.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            {trashed
                                                ? 'Корзина пуста'
                                                : 'Холодильники не найдены'}
                                        </td>
                                    </tr>
                                ) : (
                                    coolers.data.map((cooler) => (
                                        <tr
                                            key={cooler.id}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm font-semibold text-white">
                                                {cooler.code}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-white">
                                                {cooler.display_name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {cooler.store_name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {cooler.department_name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {cooler.temperature_zone_label ||
                                                    temperatureZones[
                                                        cooler.temperature_zone
                                                    ] ||
                                                    cooler.temperature_zone ||
                                                    '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {cooler.shelf_count}/
                                                {cooler.levels_count}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-300">
                                                {cooler.width_mm}×
                                                {cooler.height_mm}×
                                                {cooler.depth_mm}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    {trashed ? (
                                                        <>
                                                            {canDelete && (
<button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRestore(
                                                                        cooler,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-50"
                                                            >
                                                                <ArrowPathIcon className="h-4 w-4" />
                                                                <span className="hidden sm:inline">
                                                                    Восстановить
                                                                </span>
                                                            </button>
)}
                                                            {canDelete && (
<button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleForceDelete(
                                                                        cooler,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                                <span className="hidden sm:inline">
                                                                    Удалить
                                                                </span>
                                                            </button>
)}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {canEdit && (
<Link
                                                                href={route(
                                                                    'coolers.edit',
                                                                    cooler.id,
                                                                )}
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                            >
                                                                <PencilSquareIcon className="h-4 w-4" />
                                                                <span className="hidden sm:inline">
                                                                    Изменить
                                                                </span>
                                                            </Link>
)}
                                                            {canDelete && (
<button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        cooler,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <TrashIcon className="h-4 w-4" />
                                                                <span className="hidden sm:inline">
                                                                    Удалить
                                                                </span>
                                                            </button>
)}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {coolers.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {coolers.current_page} из{' '}
                                {coolers.last_page}
                            </p>
                            <div className="flex gap-2">
                                {coolers.prev_page_url && (
                                    <Link
                                        href={coolers.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {coolers.next_page_url && (
                                    <Link
                                        href={coolers.next_page_url}
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
