import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    PencilSquareIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

export default function Index({ documents = [] }) {
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const publish = async (document) => {
        const confirmed = await fireConfirm(
            'Опубликовать документ?',
            `«${document.title}» станет публичной версией. Предыдущая активная редакция будет снята.`,
            'Опубликовать',
        );

        if (!confirmed) {
            return;
        }

        router.post(route('admin.legal.publish', document.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Юридические документы
                </h1>
            }
        >
            <Head title="Документы" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400">
                        Оферта и политика конфиденциальности
                    </p>
                    <Link
                        href={route('admin.legal.create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Создать
                    </Link>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#152033] ring-1 ring-slate-800">
                    <table className="min-w-full text-sm">
                        <thead className="bg-[#1a2740] text-xs uppercase text-slate-400">
                            <tr>
                                <th className="px-4 py-3 text-left">Тип</th>
                                <th className="px-4 py-3 text-left">Название</th>
                                <th className="px-4 py-3 text-left">Версия</th>
                                <th className="px-4 py-3 text-left">Статус</th>
                                <th className="px-4 py-3 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {documents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                                        Документов нет
                                    </td>
                                </tr>
                            ) : (
                                documents.map((document) => (
                                    <tr key={document.id}>
                                        <td className="px-4 py-3 text-slate-300">{document.type_label}</td>
                                        <td className="px-4 py-3 text-white">{document.title}</td>
                                        <td className="px-4 py-3 text-slate-300">v{document.version}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={clsx(
                                                    'rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset',
                                                    document.is_active
                                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                        : 'bg-slate-800 text-slate-300 ring-slate-600/40',
                                                )}
                                            >
                                                {document.is_active ? 'Опубликован' : 'Черновик'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <a
                                                    href={route('admin.legal.pdf', document.id)}
                                                    className="inline-flex items-center gap-1 text-slate-200 hover:text-white"
                                                >
                                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                                    PDF
                                                </a>
                                                <Link
                                                    href={route('admin.legal.edit', document.id)}
                                                    className="inline-flex items-center gap-1 text-indigo-300"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                    Изменить
                                                </Link>
                                                {!document.is_active && (
                                                    <button
                                                        type="button"
                                                        onClick={() => publish(document)}
                                                        className="text-emerald-300"
                                                    >
                                                        Опубликовать
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
            </div>
        </AdminLayout>
    );
}
