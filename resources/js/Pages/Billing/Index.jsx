import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
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
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

const PAYMENT_STATUS = {
    pending: 'Ожидает оплаты',
    awaiting_confirmation: 'На проверке',
    paid: 'Оплачен',
    rejected: 'Отклонён',
};

const SUB_STATUS = {
    pending: 'Ожидает оплаты',
    active: 'Активна',
    past_due: 'Просрочена',
    expired: 'Истекла',
    cancelled: 'Отменена',
};

export default function Index({
    tenant,
    subscription,
    pending_payment: pendingPayment,
    bank_account: bankAccount,
    payments = [],
    plans = [],
    canManage = false,
    focus = null,
}) {
    const { flash } = usePage().props;
    const [interval, setInterval] = useState(subscription?.billing_interval || 'monthly');
    const confirmForm = useForm({
        payment_id: pendingPayment?.id || '',
        transaction_id: pendingPayment?.transaction_id || '',
    });

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        if (focus === 'bank') {
            document.getElementById('bank-details')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [focus]);

    const subscribe = (planId) => {
        router.post(
            route('billing.subscribe'),
            { plan_id: planId, interval, auto_renew: true },
            {
                onError: () => fireError('Не удалось выбрать тариф.'),
            },
        );
    };

    const confirmPayment = (e) => {
        e.preventDefault();
        confirmForm.post(route('billing.confirm-payment'), {
            preserveScroll: true,
            onError: () => fireError('Не удалось отправить подтверждение.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Оплата
                </h1>
            }
        >
            <Head title="Оплата" />

            <div className="space-y-6">
                {!tenant?.has_active_subscription && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                        Подписка неактивна. Выберите тариф и оплатите по реквизитам.
                    </div>
                )}

                <section className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-xl bg-[#152033] p-5 ring-1 ring-slate-800 lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white">Текущий план</h2>
                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-slate-400">Тариф</dt>
                                <dd className="text-white">{tenant?.plan_label || '—'}</dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Статус подписки</dt>
                                <dd className="text-white">
                                    {subscription
                                        ? SUB_STATUS[subscription.status] || subscription.status
                                        : 'Нет подписки'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Действует до</dt>
                                <dd className="text-white">
                                    {formatDate(subscription?.ends_at || tenant?.subscription_until)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-slate-400">Лимиты</dt>
                                <dd className="text-white">
                                    {tenant?.max_stores} маг. · {tenant?.max_users} польз. · {tenant?.max_products} тов.
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div id="bank-details" className="rounded-xl bg-[#152033] p-5 ring-1 ring-slate-800">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Реквизиты</h2>
                            <Link
                                href={route('billing.bank-details')}
                                className="text-xs text-indigo-300 hover:underline"
                            >
                                Открыть
                            </Link>
                        </div>
                        {bankAccount ? (
                            <dl className="mt-4 space-y-2 text-sm">
                                <div>
                                    <dt className="text-slate-400">Получатель</dt>
                                    <dd className="text-white">{bankAccount.account_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-400">Банк</dt>
                                    <dd className="text-white">{bankAccount.bank_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-400">IBAN</dt>
                                    <dd className="break-all text-white">{bankAccount.iban}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-400">УНП</dt>
                                    <dd className="text-white">{bankAccount.unp}</dd>
                                </div>
                                <div>
                                    <dt className="text-slate-400">Назначение</dt>
                                    <dd className="text-white">{bankAccount.payment_purpose || '—'}</dd>
                                </div>
                            </dl>
                        ) : (
                            <p className="mt-3 text-sm text-slate-400">
                                Реквизиты ещё не заданы. Обратитесь к Super Admin.
                            </p>
                        )}
                    </div>
                </section>

                {canManage && pendingPayment && pendingPayment.status !== 'paid' && (
                    <section className="rounded-xl bg-[#152033] p-5 ring-1 ring-slate-800">
                        <h2 className="text-lg font-semibold text-white">Подтверждение оплаты</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            К оплате {formatMoney(pendingPayment.amount, pendingPayment.currency)}
                            {pendingPayment.plan_name ? ` — ${pendingPayment.plan_name}` : ''}.
                            После перевода нажмите «Я оплатил».
                        </p>
                        <form onSubmit={confirmPayment} className="mt-4 flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                placeholder="Номер платежа / назначения (необязательно)"
                                value={confirmForm.data.transaction_id}
                                onChange={(e) =>
                                    confirmForm.setData('transaction_id', e.target.value)
                                }
                                className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={confirmForm.processing || pendingPayment.status === 'awaiting_confirmation'}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                                {pendingPayment.status === 'awaiting_confirmation'
                                    ? 'Ожидает проверки'
                                    : 'Я оплатил'}
                            </button>
                        </form>
                    </section>
                )}

                {canManage && (
                    <section className="rounded-xl bg-[#152033] p-5 ring-1 ring-slate-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <h2 className="text-lg font-semibold text-white">Сменить тариф</h2>
                            <div className="inline-flex rounded-lg bg-[#0e172b] p-1">
                                {[
                                    { value: 'monthly', label: 'Месяц' },
                                    { value: 'yearly', label: 'Год' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setInterval(option.value)}
                                        className={clsx(
                                            'rounded-md px-3 py-1 text-xs font-medium',
                                            interval === option.value
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-slate-300',
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className="rounded-xl bg-[#0e172b] p-4 ring-1 ring-slate-800"
                                >
                                    <p className="font-semibold text-white">{plan.name}</p>
                                    <p className="mt-1 text-sm text-slate-300">
                                        {plan.is_free
                                            ? 'Бесплатно'
                                            : formatMoney(
                                                  interval === 'yearly'
                                                      ? plan.price_yearly
                                                      : plan.price_monthly,
                                              )}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => subscribe(plan.id)}
                                        className="mt-3 w-full rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
                                    >
                                        Выбрать
                                    </button>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            Публичный каталог:{' '}
                            <Link href={route('plans.index')} className="text-indigo-300 hover:underline">
                                /plans
                            </Link>
                        </p>
                    </section>
                )}

                <section className="overflow-hidden rounded-xl bg-[#152033] ring-1 ring-slate-800">
                    <h2 className="px-5 py-4 text-lg font-semibold text-white">
                        История платежей
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-[#1a2740] text-xs uppercase text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 text-left">Дата</th>
                                    <th className="px-4 py-3 text-left">Тариф</th>
                                    <th className="px-4 py-3 text-left">Сумма</th>
                                    <th className="px-4 py-3 text-left">Метод</th>
                                    <th className="px-4 py-3 text-left">Статус</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                            Платежей пока нет
                                        </td>
                                    </tr>
                                ) : (
                                    payments.map((payment) => (
                                        <tr key={payment.id}>
                                            <td className="px-4 py-3 text-slate-300">
                                                {formatDate(payment.paid_at || payment.created_at)}
                                            </td>
                                            <td className="px-4 py-3 text-white">
                                                {payment.plan_name || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {formatMoney(payment.amount, payment.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {payment.payment_method === 'bank_transfer'
                                                    ? 'Банковский перевод'
                                                    : payment.payment_method}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300">
                                                {PAYMENT_STATUS[payment.status] || payment.status}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
