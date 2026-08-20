import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    LockClosedIcon,
    LockOpenIcon,
    PencilSquareIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';
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
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function InfoRow({ label, children }) {
    return (
        <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-slate-400">{label}</dt>
            <dd className="text-sm text-white sm:col-span-2">{children}</dd>
        </div>
    );
}

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}

const STORE_STATUS = {
    active: 'Активен',
    repair: 'Ремонт',
    decommissioned: 'Выведен',
};

export default function Show({ tenant }) {
    const { flash } = usePage().props;
    const can = useCan();
    const canCreateStore = can('create-stores');
    const canCreateUser = can('create-users');

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const handleToggleActive = async () => {
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
                    {tenant.name}
                </h1>
            }
        >
            <Head title={tenant.name} />

            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                        href={route('tenants.index')}
                        className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        К списку арендаторов
                    </Link>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route('tenants.edit', tenant.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/15"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                            Редактировать
                        </Link>
                        <button
                            type="button"
                            onClick={handleToggleActive}
                            className={clsx(
                                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium',
                                tenant.is_active
                                    ? 'border-amber-700/40 text-amber-300 hover:bg-amber-500/10'
                                    : 'border-emerald-700/40 text-emerald-300 hover:bg-emerald-500/10',
                            )}
                        >
                            {tenant.is_active ? (
                                <LockClosedIcon className="h-4 w-4" />
                            ) : (
                                <LockOpenIcon className="h-4 w-4" />
                            )}
                            {tenant.is_active ? 'Заблокировать' : 'Разблокировать'}
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <StatCard
                        label="Магазины"
                        value={`${tenant.stores_count} / ${tenant.max_stores}`}
                    />
                    <StatCard
                        label="Пользователи"
                        value={`${tenant.users_count} / ${tenant.max_users}`}
                    />
                    <StatCard
                        label="Оплачен до"
                        value={formatDate(tenant.subscription_until)}
                    />
                </div>

                <section className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                    <h2 className="text-lg font-semibold text-white">
                        Информация
                    </h2>
                    <dl className="mt-4 space-y-4">
                        <InfoRow label="Название">{tenant.name}</InfoRow>
                        <InfoRow label="Домен">{tenant.domain || '—'}</InfoRow>
                        <InfoRow label="Тариф">
                            {tenant.plan_label || tenant.plan}
                        </InfoRow>
                        <InfoRow label="Статус">
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
                        </InfoRow>
                    </dl>
                </section>

                <section className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-white">
                            Магазины
                        </h2>
                        {canCreateStore && (
                            <Link
                                href={`${route('stores.create')}?tenant_id=${tenant.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Создать магазин
                            </Link>
                        )}
                    </div>
                    {tenant.stores.length === 0 ? (
                        <p className="text-sm text-slate-400">Магазинов пока нет.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Название
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Город
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Статус
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {tenant.stores.map((store) => (
                                        <tr key={store.id}>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-white">
                                                {store.name}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                                                {store.city || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                                                {STORE_STATUS[store.status] ||
                                                    store.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-semibold text-white">
                            Пользователи
                        </h2>
                        {canCreateUser && (
                            <Link
                                href={`${route('users.create')}?tenant_id=${tenant.id}`}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Создать пользователя
                            </Link>
                        )}
                    </div>
                    {tenant.users.length === 0 ? (
                        <p className="text-sm text-slate-400">
                            Пользователей пока нет.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-800">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Имя
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Email
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Роль
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            Статус
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {tenant.users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-white">
                                                <Link
                                                    href={route('users.show', user.id)}
                                                    className="text-indigo-300 hover:underline"
                                                >
                                                    {user.name}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                                                {user.email}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm text-slate-300">
                                                {user.role || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-sm">
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
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
