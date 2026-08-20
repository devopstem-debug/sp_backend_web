import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    EyeIcon,
    LockClosedIcon,
    LockOpenIcon,
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

export default function Index({
    users,
    filters = {},
    roles = [],
    tenants = [],
    canManageTenants = false,
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const canCreate = can('create-users');
    const canEdit = can('edit-users');
    const canBlock = can('block-users');
    const canDelete = can('delete-users');
    const [search, setSearch] = useState(filters.search || '');
    const [role, setRole] = useState(filters.role || '');
    const [status, setStatus] = useState(filters.status || '');
    const [tenantId, setTenantId] = useState(filters.tenant_id || '');

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
            route('users.index'),
            {
                search: search || undefined,
                role: role || undefined,
                status: status || undefined,
                tenant_id: canManageTenants
                    ? tenantId || undefined
                    : undefined,
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

    const handleDelete = async (user) => {
        const confirmed = await fireConfirm(
            'Удалить пользователя?',
            `«${user.name}» (${user.email}) будет удалён.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('users.destroy', user.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить пользователя.'),
        });
    };

    const handleToggleActive = async (user) => {
        const willBlock = user.is_active;
        const confirmed = await fireConfirm(
            willBlock ? 'Заблокировать пользователя?' : 'Разблокировать пользователя?',
            willBlock
                ? `«${user.name}» не сможет войти в систему.`
                : `«${user.name}» снова получит доступ.`,
            willBlock ? 'Заблокировать' : 'Разблокировать',
        );

        if (!confirmed) {
            return;
        }

        router.post(
            route('users.toggle-active', user.id),
            {},
            {
                preserveScroll: true,
                onError: () =>
                    fireError('Не удалось изменить статус пользователя.'),
            },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Пользователи
                </h1>
            }
        >
            <Head title="Пользователи" />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                        Управление учётными записями и доступом
                    </p>
                    {canCreate && (
                    <Link
                        href={route('users.create')}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                    >
                        <PlusIcon className="h-5 w-5" aria-hidden="true" />
                        Добавить
                    </Link>
                    )}
                </div>

                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <div
                        className={clsx(
                            'grid gap-3 md:items-end',
                            canManageTenants
                                ? 'md:grid-cols-5'
                                : 'md:grid-cols-4',
                        )}
                    >
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
                                    placeholder="Имя, email, телефон…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        </form>

                        <div>
                            <label
                                htmlFor="role"
                                className="mb-1 block text-sm font-medium text-slate-200"
                            >
                                Роль
                            </label>
                            <select
                                id="role"
                                value={role}
                                onChange={(e) => {
                                    setRole(e.target.value);
                                    applyFilters({
                                        role: e.target.value || undefined,
                                    });
                                }}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="">Все роли</option>
                                {roles.map((item) => (
                                    <option
                                        key={item.value}
                                        value={item.value}
                                    >
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                        </div>

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

                        {canManageTenants && (
                            <div>
                                <label
                                    htmlFor="tenant_id"
                                    className="mb-1 block text-sm font-medium text-slate-200"
                                >
                                    Арендатор
                                </label>
                                <select
                                    id="tenant_id"
                                    value={tenantId}
                                    onChange={(e) => {
                                        setTenantId(e.target.value);
                                        applyFilters({
                                            tenant_id:
                                                e.target.value || undefined,
                                        });
                                    }}
                                    className="block w-full rounded-lg border-slate-700 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">Все арендаторы</option>
                                    {tenants.map((tenant) => (
                                        <option
                                            key={tenant.id}
                                            value={tenant.id}
                                        >
                                            {tenant.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
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
                                        Имя
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Роль
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Арендатор
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Статус
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Последний вход
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                                        Действия
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={7}
                                            className="px-4 py-10 text-center text-sm text-slate-400"
                                        >
                                            Пользователи не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-slate-800/80"
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-white">
                                                <Link
                                                    href={route(
                                                        'users.show',
                                                        user.id,
                                                    )}
                                                    className="text-indigo-300 hover:text-indigo-500 hover:underline"
                                                >
                                                    {user.name || '—'}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {user.email || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {user.role || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {user.tenant_name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                <span
                                                    className={clsx(
                                                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                                                        user.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-red-50 text-red-400 ring-red-600/20',
                                                    )}
                                                >
                                                    {user.is_active
                                                        ? 'Активен'
                                                        : 'Заблокирован'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300">
                                                {formatDate(user.last_login_at)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={route(
                                                            'users.show',
                                                            user.id,
                                                        )}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-slate-800"
                                                        title="Просмотр"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">
                                                            Просмотр
                                                        </span>
                                                    </Link>
                                                    {canEdit && (
                                                    <Link
                                                        href={route(
                                                            'users.edit',
                                                            user.id,
                                                        )}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                        title="Редактировать"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">
                                                            Изменить
                                                        </span>
                                                    </Link>
                                                    )}
                                                    {canBlock && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleToggleActive(
                                                                user,
                                                            )
                                                        }
                                                        className={clsx(
                                                            'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5',
                                                            user.is_active
                                                                ? 'text-amber-700 hover:bg-amber-50'
                                                                : 'text-emerald-700 hover:bg-emerald-50',
                                                        )}
                                                        title={
                                                            user.is_active
                                                                ? 'Заблокировать'
                                                                : 'Разблокировать'
                                                        }
                                                    >
                                                        {user.is_active ? (
                                                            <LockClosedIcon className="h-4 w-4" />
                                                        ) : (
                                                            <LockOpenIcon className="h-4 w-4" />
                                                        )}
                                                        <span className="hidden lg:inline">
                                                            {user.is_active
                                                                ? 'Блок'
                                                                : 'Разблок'}
                                                        </span>
                                                    </button>
                                                    )}
                                                    {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDelete(user)
                                                        }
                                                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/10"
                                                        title="Удалить"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">
                                                            Удалить
                                                        </span>
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {users.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                            <p className="text-sm text-slate-400">
                                Стр. {users.current_page} из {users.last_page}
                            </p>
                            <div className="flex gap-2">
                                {users.prev_page_url && (
                                    <Link
                                        href={users.prev_page_url}
                                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                        preserveScroll
                                    >
                                        Назад
                                    </Link>
                                )}
                                {users.next_page_url && (
                                    <Link
                                        href={users.next_page_url}
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
