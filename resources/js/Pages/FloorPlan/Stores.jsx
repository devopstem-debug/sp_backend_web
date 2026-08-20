import { Head, Link } from '@inertiajs/react';
import { MapIcon } from '@heroicons/react/24/outline';
import AdminLayout from '@/layouts/AdminLayout';

export default function Stores({ stores = [] }) {
    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Карта зала
                </h1>
            }
        >
            <Head title="Карта зала" />

            <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                <div className="border-b border-slate-800 px-4 py-4 sm:px-6">
                    <p className="text-sm text-slate-400">
                        Выберите магазин для редактирования плана зала.
                    </p>
                </div>

                <div className="divide-y divide-slate-800">
                    {stores.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-slate-400">
                            Магазины не найдены
                        </p>
                    ) : (
                        stores.map((store) => (
                            <Link
                                key={store.id}
                                href={route('floor-plan.index', store.id)}
                                className="flex items-center justify-between gap-3 px-4 py-4 transition hover:bg-slate-800/80 sm:px-6"
                            >
                                <div>
                                    <p className="font-medium text-white">
                                        {store.name}
                                    </p>
                                    {store.city && (
                                        <p className="text-sm text-slate-400">
                                            {store.city}
                                        </p>
                                    )}
                                </div>
                                <MapIcon className="h-5 w-5 text-indigo-300" />
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
