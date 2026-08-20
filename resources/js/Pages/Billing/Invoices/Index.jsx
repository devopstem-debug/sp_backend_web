import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    CheckIcon,
    EnvelopeIcon,
    MagnifyingGlassIcon,
    PlusIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

function formatMoney(value, currency = 'BYN') {
    return new Intl.NumberFormat('ru-BY', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}

function formatDate(value) {
    if (!value) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat('ru-RU').format(new Date(value));
    } catch {
        return value;
    }
}

export default function Index({ invoices, filters = {} }) {
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
            route('admin.invoices.index'),
            {
                search: search || undefined,
                status: status || undefined,
                ...overrides,
            },
            { preserveState: true, replace: true },
        );
    };

    const markPaid = async (invoice) => {
        const confirmed = await fireConfirm(
            'Подтвердить оплату?',
            `Счёт ${invoice.invoice_number} будет отмечен как оплаченный, подписка активируется.`,
            'Подтвердить',
        );

        if (!confirmed) {
            return;
        }

        router.post(route('admin.invoices.mark-paid', invoice.id), {}, { preserveScroll: true });
    };

    const sendEmail = async (invoice) => {
        const confirmed = await fireConfirm(
            'Отправить счёт?',
            `Письмо со счётом ${invoice.invoice_number} уйдёт пользователям арендатора.`,
            'Отправить',
        );

        if (!confirmed) {
            return;
        }

        router.post(route('admin.invoices.send', invoice.id), {}, { preserveScroll: true });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Счета
                </h1>
            }
        >
            <Head title="Счета" />

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-400">
                        Выставление и подтверждение счетов арендаторам
                    </p>
                    <Link
                        href={route('admin.invoices.create')}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Создать
                    </Link>
                </div>

                <div className="rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800">
                    <div className="grid gap-3 md:grid-cols-4 md:items-end">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                applyFilters({ search: search || undefined });
                            }}
                            className="md:col-span-2"
                        >
                            <label htmlFor="search" className="mb-1 block text-sm text-slate-200">
                                Поиск
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="search"
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Номер или арендатор…"
                                    className="block w-full rounded-lg border-slate-700 py-2 pl-10 pr-3 text-sm"
                                />
                            </div>
                        </form>
                        <div>
                            <label htmlFor="status" className="mb-1 block text-sm text-slate-200">
                                Статус
                            </label>
                            <select
                                id="status"
                                value={status}
                                onChange={(e) => {
                                    setStatus(e.target.value);
                                    applyFilters({ status: e.target.value || undefined });
                                }}
                                className="block w-full rounded-lg border-slate-700 py-2 text-sm"
                            >
                                <option value="">Все</option>
                                <option value="draft">Черновик</option>
                                <option value="sent">Отправлен</option>
                                <option value="paid">Оплачен</option>
                                <option value="cancelled">Отменён</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl bg-[#152033] ring-1 ring-slate-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[#1a2740] text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 text-left">Номер</th>
                                    <th className="px-4 py-3 text-left">Арендатор</th>
                                    <th className="px-4 py-3 text-left">Тариф</th>
                                    <th className="px-4 py-3 text-left">Период</th>
                                    <th className="px-4 py-3 text-left">Сумма</th>
                                    <th className="px-4 py-3 text-left">Статус</th>
                                    <th className="px-4 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {invoices.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                                            Счета не найдены
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.data.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-slate-800/80">
                                            <td className="whitespace-nowrap px-4 py-3 font-medium text-white">
                                                {invoice.invoice_number}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {invoice.tenant_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {invoice.plan_name || '—'}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                                {formatDate(invoice.period_start)} — {formatDate(invoice.period_end)}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                                                {formatMoney(invoice.amount, invoice.currency)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={clsx(
                                                        'rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset',
                                                        invoice.status === 'paid'
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : invoice.status === 'sent'
                                                              ? 'bg-sky-50 text-sky-700 ring-sky-600/20'
                                                              : invoice.status === 'cancelled'
                                                                ? 'bg-red-50 text-red-400 ring-red-600/20'
                                                                : 'bg-slate-800 text-slate-300 ring-slate-600/40',
                                                    )}
                                                >
                                                    {invoice.status_label}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <a
                                                        href={route('admin.invoices.pdf', invoice.id)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-200 hover:bg-slate-800"
                                                        title="Скачать PDF"
                                                    >
                                                        <ArrowDownTrayIcon className="h-4 w-4" />
                                                        <span className="hidden lg:inline">PDF</span>
                                                    </a>
                                                    {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => markPaid(invoice)}
                                                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-emerald-300 hover:bg-emerald-500/10"
                                                            title="Подтвердить"
                                                        >
                                                            <CheckIcon className="h-4 w-4" />
                                                            <span className="hidden lg:inline">Подтвердить</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => sendEmail(invoice)}
                                                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                        title="Отправить"
                                                    >
                                                        <EnvelopeIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {invoices.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
                            <span>
                                Стр. {invoices.current_page} из {invoices.last_page}
                            </span>
                            <div className="flex gap-2">
                                {invoices.prev_page_url && (
                                    <Link href={invoices.prev_page_url} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200" preserveScroll>
                                        Назад
                                    </Link>
                                )}
                                {invoices.next_page_url && (
                                    <Link href={invoices.next_page_url} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200" preserveScroll>
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
