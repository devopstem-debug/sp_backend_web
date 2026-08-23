import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { PencilSquareIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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

const emptyBank = {
    account_name: '',
    bank_name: '',
    iban: '',
    unp: '',
    payment_purpose: 'Оплата тарифа {plan} ({interval}), УНП {unp}',
    is_default: false,
};

export default function Index({
    plans = [],
    bankAccounts = [],
    pendingPayments = [],
}) {
    const { flash } = usePage().props;
    const [editingBank, setEditingBank] = useState(null);

    const bankForm = useForm(emptyBank);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const startEditBank = (account) => {
        setEditingBank(account.id);
        bankForm.setData({
            account_name: account.account_name,
            bank_name: account.bank_name,
            iban: account.iban,
            unp: account.unp,
            payment_purpose: account.payment_purpose || '',
            is_default: account.is_default,
        });
    };

    const submitBank = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                bankForm.reset();
                setEditingBank(null);
                bankForm.setData(emptyBank);
            },
            onError: () => fireError('Не удалось сохранить реквизиты.'),
        };

        if (editingBank) {
            bankForm.put(route('admin.bank-accounts.update', editingBank), options);
            return;
        }

        bankForm.post(route('admin.bank-accounts.store'), options);
    };

    const deletePlan = async (plan) => {
        const confirmed = await fireConfirm(
            'Удалить тариф?',
            `«${plan.name}» будет скрыт. Подписки сохранятся.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('admin.plans.destroy', plan.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить тариф.'),
        });
    };

    const deleteBank = async (account) => {
        const confirmed = await fireConfirm('Удалить реквизиты?', account.account_name);

        if (!confirmed) {
            return;
        }

        router.delete(route('admin.bank-accounts.destroy', account.id), {
            preserveScroll: true,
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Тарифы
                </h1>
            }
        >
            <Head title="Тарифы" />

            <div className="space-y-8">
                <section className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="flex items-center justify-between px-4 py-4">
                        <h2 className="text-lg font-semibold text-white">Каталог тарифов</h2>
                        <Link
                            href={route('admin.plans.create')}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Создать
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-sm">
                            <thead className="bg-[#1a2740] text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 text-left">Название</th>
                                    <th className="px-4 py-3 text-left">Slug</th>
                                    <th className="px-4 py-3 text-left">Месяц / год</th>
                                    <th className="px-4 py-3 text-left">Лимиты</th>
                                    <th className="px-4 py-3 text-left">Статус</th>
                                    <th className="px-4 py-3 text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {plans.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                            Тарифы ещё не созданы
                                        </td>
                                    </tr>
                                ) : (
                                    plans.map((plan) => (
                                        <tr key={plan.id} className="hover:bg-slate-800/80">
                                            <td className="px-4 py-3 font-medium text-white">
                                                {plan.name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">{plan.slug}</td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {formatMoney(plan.price_monthly)} / {formatMoney(plan.price_yearly)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {plan.max_stores} маг. · {plan.max_users} польз.
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={clsx(
                                                        'rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset',
                                                        plan.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                                            : 'bg-red-50 text-red-400 ring-red-600/20',
                                                    )}
                                                >
                                                    {plan.is_active ? 'Активен' : 'Скрыт'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link
                                                        href={route('admin.plans.edit', plan.id)}
                                                        className="rounded-lg px-2 py-1.5 text-indigo-300 hover:bg-indigo-500/15"
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => deletePlan(plan)}
                                                        className="rounded-lg px-2 py-1.5 text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <h2 className="text-lg font-semibold text-white">Ожидают подтверждения</h2>
                    {pendingPayments.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-400">Новых заявок нет.</p>
                    ) : (
                        <div className="mt-4 overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="text-xs uppercase text-slate-400">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Арендатор</th>
                                        <th className="px-3 py-2 text-left">Тариф</th>
                                        <th className="px-3 py-2 text-left">Сумма</th>
                                        <th className="px-3 py-2 text-left">Транзакция</th>
                                        <th className="px-3 py-2 text-right"> </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {pendingPayments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-3 py-2 text-white">
                                                {payment.tenant_name}
                                            </td>
                                            <td className="px-3 py-2 text-slate-300">
                                                {payment.plan_name || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-slate-300">
                                                {formatMoney(payment.amount, payment.currency)}
                                            </td>
                                            <td className="px-3 py-2 text-slate-300">
                                                {payment.transaction_id || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.post(
                                                            route('admin.payments.approve', payment.id),
                                                            {},
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="mr-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                                                >
                                                    Подтвердить
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        router.post(
                                                            route('admin.payments.reject', payment.id),
                                                            {},
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-300"
                                                >
                                                    Отклонить
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                    <h2 className="text-lg font-semibold text-white">Банковские реквизиты</h2>
                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-3 py-2 text-left">Счёт</th>
                                    <th className="px-3 py-2 text-left">Банк</th>
                                    <th className="px-3 py-2 text-left">IBAN</th>
                                    <th className="px-3 py-2 text-left">УНП</th>
                                    <th className="px-3 py-2 text-right"> </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {bankAccounts.map((account) => (
                                    <tr key={account.id}>
                                        <td className="px-3 py-2 text-white">
                                            {account.account_name}
                                            {account.is_default && (
                                                <span className="ml-2 text-xs text-indigo-300">по умолчанию</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-slate-300">{account.bank_name}</td>
                                        <td className="px-3 py-2 text-slate-300">{account.iban}</td>
                                        <td className="px-3 py-2 text-slate-300">{account.unp}</td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => startEditBank(account)}
                                                className="mr-2 text-indigo-300"
                                            >
                                                Изменить
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => deleteBank(account)}
                                                className="text-red-400"
                                            >
                                                Удалить
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <form onSubmit={submitBank} className="mt-6 grid gap-3 md:grid-cols-2">
                        <input
                            placeholder="Получатель"
                            value={bankForm.data.account_name}
                            onChange={(e) => bankForm.setData('account_name', e.target.value)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                        />
                        <input
                            placeholder="Банк"
                            value={bankForm.data.bank_name}
                            onChange={(e) => bankForm.setData('bank_name', e.target.value)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                        />
                        <input
                            placeholder="IBAN"
                            value={bankForm.data.iban}
                            onChange={(e) => bankForm.setData('iban', e.target.value)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                        />
                        <input
                            placeholder="УНП"
                            value={bankForm.data.unp}
                            onChange={(e) => bankForm.setData('unp', e.target.value)}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                        />
                        <input
                            placeholder="Назначение платежа"
                            value={bankForm.data.payment_purpose}
                            onChange={(e) => bankForm.setData('payment_purpose', e.target.value)}
                            className="md:col-span-2 rounded-lg border border-slate-700 px-3 py-2 text-sm"
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                checked={Boolean(bankForm.data.is_default)}
                                onChange={(e) => bankForm.setData('is_default', e.target.checked)}
                            />
                            Счёт по умолчанию
                        </label>
                        <div className="flex justify-end gap-2 md:col-span-2">
                            {editingBank && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingBank(null);
                                        bankForm.setData(emptyBank);
                                    }}
                                    className="rounded-lg border border-slate-700 px-3 py-2 text-sm"
                                >
                                    Сброс
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={bankForm.processing}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
                            >
                                {editingBank ? 'Обновить реквизиты' : 'Добавить реквизиты'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </AdminLayout>
    );
}
