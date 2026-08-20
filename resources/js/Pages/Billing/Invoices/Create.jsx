import { Head, Link, useForm } from '@inertiajs/react';
import { useEffect } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';

function currentMonth() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    return `${now.getFullYear()}-${month}`;
}

export default function Create({ tenants = [], plans = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        tenant_id: '',
        plan_id: '',
        period_month: currentMonth(),
        amount: '',
    });

    useEffect(() => {
        const plan = plans.find((item) => item.id === data.plan_id);
        if (plan) {
            setData('amount', String(plan.price_monthly ?? 0));
        }
    }, [data.plan_id]);

    const submit = (e) => {
        e.preventDefault();
        post(route('admin.invoices.store'), {
            onSuccess: () => fireSuccess('Счёт создан.'),
            onError: () => fireError('Не удалось создать счёт.'),
        });
    };

    const inputClass = (hasError) =>
        `mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${
            hasError ? 'border-red-400' : 'border-slate-700'
        }`;

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый счёт
                </h1>
            }
        >
            <Head title="Новый счёт" />

            <form
                onSubmit={submit}
                className="max-w-xl space-y-5 rounded-xl bg-[#152033] p-6 ring-1 ring-slate-800"
            >
                <div>
                    <label htmlFor="tenant_id" className="block text-sm text-slate-200">
                        Арендатор
                    </label>
                    <select
                        id="tenant_id"
                        value={data.tenant_id}
                        onChange={(e) => setData('tenant_id', e.target.value)}
                        className={inputClass(Boolean(errors.tenant_id))}
                    >
                        <option value="">Выберите…</option>
                        {tenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                                {tenant.name}
                            </option>
                        ))}
                    </select>
                    {errors.tenant_id && (
                        <p className="mt-1 text-sm text-red-500">{errors.tenant_id}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="plan_id" className="block text-sm text-slate-200">
                        Тариф
                    </label>
                    <select
                        id="plan_id"
                        value={data.plan_id}
                        onChange={(e) => setData('plan_id', e.target.value)}
                        className={inputClass(Boolean(errors.plan_id))}
                    >
                        <option value="">Выберите…</option>
                        {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} — {plan.price_monthly} BYN / мес.
                            </option>
                        ))}
                    </select>
                    {errors.plan_id && (
                        <p className="mt-1 text-sm text-red-500">{errors.plan_id}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="period_month" className="block text-sm text-slate-200">
                        Период (месяц)
                    </label>
                    <input
                        id="period_month"
                        type="month"
                        value={data.period_month}
                        onChange={(e) => setData('period_month', e.target.value)}
                        className={inputClass(Boolean(errors.period_month))}
                    />
                    {errors.period_month && (
                        <p className="mt-1 text-sm text-red-500">{errors.period_month}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="amount" className="block text-sm text-slate-200">
                        Сумма (BYN)
                    </label>
                    <input
                        id="amount"
                        type="number"
                        min={0}
                        step="0.01"
                        value={data.amount}
                        onChange={(e) => setData('amount', e.target.value)}
                        className={inputClass(Boolean(errors.amount))}
                    />
                    {errors.amount && (
                        <p className="mt-1 text-sm text-red-500">{errors.amount}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                        Подставляется из тарифа, можно изменить вручную.
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        Создать счёт
                    </button>
                    <Link
                        href={route('admin.invoices.index')}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
                    >
                        Отмена
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
