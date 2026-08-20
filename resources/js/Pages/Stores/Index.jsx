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

const STATUS_LABELS = {
    active: 'Активен',
    repair: 'Ремонт',
    decommissioned: 'Выведен',
};

const STATUS_COLORS = {
    active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    repair: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    decommissioned: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

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

export default function Index({ stores, filters, trashedCount = 0 }) {
    const { flash } = usePage().props;
    const can = useCan();
    const canCreate = can('create-stores');
    const canEdit = can('edit-stores');
    const canDelete = can('delete-stores');
    const canRestore = can('restore-stores');
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');
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
            route('stores.index'),
            {
                search: search || undefined,
                status: status || undefined,
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

    const handleStatusChange = (e) => {
        const next = e.target.value;
        setStatus(next);
        applyFilters({ status: next || undefined });
    };

    const switchTab = (toTrashed) => {
        applyFilters({
            trashed: toTrashed ? 1 : undefined,
            search: search || undefined,
            status: status || undefined,
        });
    };

    const handleDelete = async (store) => {
        const confirmed = await fireConfirm(
            'Удалить магазин?',
            `«${store.name}» будет перемещён в корзину.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('stores.destroy', store.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить магазин.'),
        });
    };

    const handleRestore = async (store) => {
        const confirmed = await fireConfirm(
            'Восстановить магазин?',
            `«${store.name}» снова появится в списке.`,
            'Восстановить',
        );

        if (!confirmed) {
            return;
        }

        router.post(route('stores.restore', store.id), {}, {
            preserveScroll: true,
            onError: () => fireError('Не удалось восстановить магазин.'),
        });
    };

    const handleForceDelete = async (store) => {
        const confirmed = await fireConfirm(
            'Удалить безвозвратно?',
            `«${store.name}» будет удалён навсегда. Это нельзя отменить.`,
            'Удалить навсегда',
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('stores.force-delete', store.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить магазин.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Магазины
                </h1>
            }
        >
            <Head title="Магазины" />

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
                        {(trashedCount > 0 || trashed) && (canDelete || canRestore) && (
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
                            href={route('stores.create')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                            <PlusIcon className="h-5 w-5" aria-hidden="true" />
                            Добавить
                        </Link>
                    )}
                </div>

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end">
                        <form
                            onSubmit={handleSearchSubmit}
                            className="flex-1"
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
                                    placeholder="Название, город, адрес…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

                        <div className="md:w-56">
                            <label
                                htmlFor="status"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Статус
                            </label>
                            <select
                                id="status"
                                value={status}
                                onChange={handleStatusChange}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Все статусы</option>
                                <option value="active">Активен</option>
                                <option value="repair">Ремонт</option>
                                <option value="decommissioned">
                                    Выведен
                                </option>
                            </select>
                        </div>

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
                                        Название
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Город
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Статус
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Дата создания
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {stores.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            {trashed
                                                ? 'Корзина пуста'
                                                : 'Магазины не найдены'}
                                        </td>
                                    </tr>
                                ) : (
                                    stores.data.map((store) => (
                                        <tr
                                            key={store.id}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-white">
                                                {store.name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {store.city || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span
                                                    className={clsx(
                                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                        STATUS_COLORS[
                                                            store.status
                                                        ] ||
                                                            STATUS_COLORS.decommissioned,
                                                    )}
                                                >
                                                    {STATUS_LABELS[
                                                        store.status
                                                    ] || store.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {formatDate(store.created_at)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    {trashed ? (
                                                        <>
                                                            {canRestore && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRestore(
                                                                        store,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-emerald-700 hover:bg-emerald-50"
                                                                title="Восстановить"
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
                                                                        store,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                                                                title="Удалить навсегда"
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
                                                                    'stores.edit',
                                                                    store.id,
                                                                )}
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                                title="Редактировать"
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
                                                                        store,
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                                                                title="Удалить"
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

                    {stores.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {stores.current_page} из{' '}
                                {stores.last_page}
                            </p>
                            <div className="flex gap-2">
                                {stores.prev_page_url && (
                                    <Link
                                        href={stores.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {stores.next_page_url && (
                                    <Link
                                        href={stores.next_page_url}
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
