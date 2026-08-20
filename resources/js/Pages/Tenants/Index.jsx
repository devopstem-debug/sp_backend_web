import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    EyeIcon,
    LockClosedIcon,
    LockOpenIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
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
        }).format(new Date(value));
    } catch {
        return value;
    }
}

export default function Index({ tenants, filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || '');
    const [status, setStatus] = useState(filters.status || '');

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
            route('tenants.index'),
            {
                search: search || undefined,
                status: status || undefined,
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

    const handleToggleActive = async (tenant) => {
        const willBlock = tenant.is_active;
        const confirmed = await fireConfirm(
            willBlock ? 'Заблокировать арендатора?' : 'Разблокировать арендатора?',
            willBlock
                ? `«${tenant.name}» и его пользователи потеряют доступ.`
                : `«${tenant.name}» снова станет активным.`,
            willBlock ? 'Заблокировать' : 'Разблокировать',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('tenants.toggle-active', tenant.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось изменить статус арендатора.'),
            },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Арендаторы
                </h1>
            }
        >
            <Head title="Арендаторы" />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                        Тарифы, лимиты и доступ организаций
                    </p>
                    <Link
                        href={route('tenants.create')}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                        <PlusIcon className="h-5 w-5" aria-hidden="true" />
                        Добавить
                    </Link>
                </div>

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <div className="grid gap-3 md:grid-cols-4 md:items-end">
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
                                    placeholder="Название или домен…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

                        <div>
                            <label
                                htmlFor="status"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Статус
                            </label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    applyFilters({
                                        status: e.target.value || undefined,
                                    });
                                }}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Все статусы</option>
                                <option value="active">Активен</option>
                                <option value="blocked">Заблокирован</option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() => applyFilters()}
                                className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                            >
                                Найти
                            </button>
                        </div>
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
                                        Домен
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Тариф
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Магазинов
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Пользователей
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Оплачен до
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
                                {tenants.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            Арендаторы не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    tenants.data.map((tenant) => (
                                        <tr
                                            key={tenant.id}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-white">
                                                <Link
                                                    href={route(
                                                        'tenants.show',
                                                        tenant.id,
                                                    )}
                                                    className="text-indigo-300 hover:text-indigo-500 hover:underline"
                                                >
                                                    {tenant.name}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {tenant.domain || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {tenant.plan_label || tenant.plan}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {tenant.stores_count} / {tenant.max_stores}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {tenant.users_count} / {tenant.max_users}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {formatDate(tenant.subscription_until)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span
                                                    className={clsx(
                                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                        tenant.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-red-50 text-red-400 ring-red-600/20',
                                                    )}
                                                >
                                                    {tenant.status_label}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={route(
                                                            'tenants.show',
                                                            tenant.id,
                                                        )}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-slate-800"
                                                        title="Просмотр"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">
                                                            Просмотр
                                                        </span>
                                                    </Link>
                                                    <Link
                                                        href={route(
                                                            'tenants.edit',
                                                            tenant.id,
                                                        )}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                        title="Редактировать"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">
                                                            Изменить
                                                        </span>
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleActive(tenant)
                                                        }
                                                        className={clsx(
                                                            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5',
                                                            tenant.is_active
                                                                ? 'text-amber-700 hover:bg-amber-50'
                                                                : 'text-emerald-700 hover:bg-emerald-50',
                                                        )}
                                                        title={
                                                            tenant.is_active
                                                                ? 'Заблокировать'
                                                                : 'Разблокировать'
                                                        }
                                                    >
                                                        {tenant.is_active ? (
                                                            <LockClosedIcon className="h-4 w-4" />
                                                        ) : (
                                                            <LockOpenIcon className="h-4 w-4" />
                                                        )}
                                                        <span className="hidden lg:inline">
                                                            {tenant.is_active
                                                                ? 'Блок'
                                                                : 'Разблок'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {tenants.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {tenants.current_page} из {tenants.last_page}
                            </p>
                            <div className="flex gap-2">
                                {tenants.prev_page_url && (
                                    <Link
                                        href={tenants.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {tenants.next_page_url && (
                                    <Link
                                        href={tenants.next_page_url}
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
