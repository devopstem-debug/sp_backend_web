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
    products,
    categories = [],
    filters,
    trashedCount = 0,
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const canCreate = can('create-products');
    const canEdit = can('edit-products');
    const canDelete = can('delete-products');
    const [search, setSearch] = useState(filters.search || '');
    const [category, setCategory] = useState(filters.category || '');
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
            route('products.index'),
            {
                search: search || undefined,
                category: category || undefined,
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
            category: category || undefined,
        });
    };

    const handleDelete = async (product) => {
        const confirmed = await fireConfirm(
            'Удалить товар?',
            `«${product.name}» будет перемещён в корзину.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('products.destroy', product.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить товар.'),
        });
    };

    const handleRestore = async (product) => {
        const confirmed = await fireConfirm(
            'Восстановить товар?',
            `«${product.name}» снова появится в списке.`,
            'Восстановить',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('products.restore', product.id),
            {},
            {
                preserveScroll: true,
                onError: () => fireError('Не удалось восстановить товар.'),
            },
        );
    };

    const handleForceDelete = async (product) => {
        const confirmed = await fireConfirm(
            'Удалить безвозвратно?',
            `«${product.name}» будет удалён навсегда.`,
            'Удалить навсегда',
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('products.force-delete', product.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить товар.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Товары
                </h1>
            }
        >
            <Head title="Товары" />

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
                            href={route('products.create')}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                        >
                            <PlusIcon className="h-5 w-5" aria-hidden="true" />
                            Добавить
                        </Link>
                    )}
                </div>

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <div className="grid gap-3 md:grid-cols-3 md:items-end">
                        <form onSubmit={handleSearchSubmit} className="md:col-span-2">
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
                                    placeholder="Название, штрихкод, категория…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

                        <div>
                            <label
                                htmlFor="category"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Категория
                            </label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => {
                                    setCategory(e.target.value);
                                    applyFilters({
                                        category: e.target.value || undefined,
                                    });
                                }}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Все категории</option>
                                {categories.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
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
                                        Штрихкод
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Название
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Категория
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Объём
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Упаковка
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Статус
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {products.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            {trashed
                                                ? 'Корзина пуста'
                                                : 'Товары не найдены'}
                                        </td>
                                    </tr>
                                ) : (
                                    products.data.map((product) => (
                                        <tr
                                            key={product.id}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-slate-200">
                                                {product.barcode}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-white">
                                                {product.name}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {product.category}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {product.volume_ml
                                                    ? `${product.volume_ml} мл`
                                                    : '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {product.package_type || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span
                                                    className={clsx(
                                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                        product.checked
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-amber-50 text-amber-700 ring-amber-600/20',
                                                    )}
                                                >
                                                    {product.checked
                                                        ? 'Проверен'
                                                        : 'Не проверен'}
                                                </span>
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
                                                                        product,
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
                                                                        product,
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
                                                                    'products.edit',
                                                                    product.id,
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
                                                                        product,
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

                    {products.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {products.current_page} из{' '}
                                {products.last_page}
                            </p>
                            <div className="flex gap-2">
                                {products.prev_page_url && (
                                    <Link
                                        href={products.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {products.next_page_url && (
                                    <Link
                                        href={products.next_page_url}
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
