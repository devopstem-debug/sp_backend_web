import { Head, Link } from '@inertiajs/react';
import {
    MapIcon,
    PencilSquareIcon,
    PlusIcon,
    WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/layouts/AdminLayout';

export default function Stores({
    stores = [],
    canCreateStore = false,
    canManagePlan = false,
}) {
    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold leading-tight text-white">
                        Карта зала
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        {canManagePlan ? (
                            <Link
                                href={route('floor-plan.create')}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                            >
                                <WrenchScrewdriverIcon className="h-4 w-4" />
                                Настроить зал
                            </Link>
                        ) : null}
                        {canCreateStore ? (
                            <Link
                                href={route('stores.create')}
                                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Создать новый магазин
                            </Link>
                        ) : null}
                    </div>
                </div>
            }
        >
            <Head title="Карта зала" />

            <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                <div className="border-b border-slate-800 px-4 py-4 sm:px-6">
                    <p className="text-sm text-slate-400">
                        Сначала настройте размеры зала и вход, затем редактируйте
                        карту в полноэкранном редакторе.
                    </p>
                </div>

                <div className="divide-y divide-slate-800">
                    {stores.length === 0 ? (
                        <div className="px-4 py-10 text-center sm:px-6">
                            <p className="text-sm text-slate-400">
                                Магазины не найдены
                            </p>
                        </div>
                    ) : (
                        stores.map((store) => (
                            <div
                                key={store.id}
                                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                                        <MapIcon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-white">
                                            {store.name}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                            {store.city || '—'}
                                            {store.has_layout
                                                ? ` · ${store.width_meters}×${store.height_meters} м`
                                                : ' · карта не настроена'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {canManagePlan && !store.has_layout ? (
                                        <Link
                                            href={`${route('floor-plan.create')}?store_id=${store.id}`}
                                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                        >
                                            Настроить зал
                                        </Link>
                                    ) : null}
                                    <Link
                                        href={
                                            store.has_layout
                                                ? route('floor-plan.edit', store.id)
                                                : `${route('floor-plan.create')}?store_id=${store.id}`
                                        }
                                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                                    >
                                        <PencilSquareIcon className="h-4 w-4" />
                                        {store.has_layout
                                            ? 'Редактировать'
                                            : 'Создать карту'}
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
