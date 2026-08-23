import { Head, Link, router, usePage } from '@inertiajs/react';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

function formatMoney(value) {
    return new Intl.NumberFormat('ru-BY', {
        style: 'currency',
        currency: 'BYN',
        maximumFractionDigits: 2,
    }).format(Number(value || 0));
}

export default function Index({
    plans = [],
    canSubscribe = false,
    currentPlanSlug = null,
    authenticated = false,
}) {
    const user = usePage().props.auth?.user;
    const [interval, setInterval] = useState('monthly');
    const [processingId, setProcessingId] = useState(null);

    const comparisonRows = useMemo(() => {
        const featureSet = new Set();
        plans.forEach((plan) => {
            (plan.features || []).forEach((feature) => featureSet.add(feature));
        });

        return [
            { key: 'price', label: 'Цена' },
            { key: 'stores', label: 'Магазины' },
            { key: 'users', label: 'Пользователи' },
            { key: 'catalog', label: 'Каталог товаров' },
            ...[...featureSet].map((feature) => ({ key: `f:${feature}`, label: feature })),
        ];
    }, [plans]);

    const selectPlan = (plan) => {
        if (!authenticated) {
            window.location.href = route('login');
            return;
        }

        if (!canSubscribe) {
            fireError('Выбрать тариф может только управляющий арендатора.');
            return;
        }

        setProcessingId(plan.id);
        router.post(
            route('billing.subscribe'),
            {
                plan_id: plan.id,
                interval,
                auto_renew: true,
            },
            {
                onSuccess: () => fireSuccess('Тариф выбран.'),
                onError: () => fireError('Не удалось выбрать тариф.'),
                onFinish: () => setProcessingId(null),
            },
        );
    };

    return (
        <>
            <Head title="Тарифы" />
            <div className="min-h-screen bg-[#0e172b] text-white">
                <header className="border-b border-slate-800">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
                        <Link href="/" className="flex items-center gap-2">
                            <ApplicationLogo className="h-8 w-auto text-white" />
                            <span className="text-sm font-semibold">Smart Planogram</span>
                        </Link>
                        <div className="flex items-center gap-3 text-sm">
                            {user ? (
                                <Link href={route('dashboard')} className="text-slate-300 hover:text-white">
                                    В панель
                                </Link>
                            ) : (
                                <Link href={route('login')} className="text-slate-300 hover:text-white">
                                    Войти
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Тарифы Smart Planogram
                        </h1>
                        <p className="mt-3 text-sm text-slate-400">
                            Выберите план под количество магазинов и пользователей.
                        </p>
                        <div className="mt-6 inline-flex rounded-lg bg-[#152033] p-1 ring-1 ring-slate-800">
                            {[
                                { value: 'monthly', label: 'Помесячно' },
                                { value: 'yearly', label: 'За год' },
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setInterval(option.value)}
                                    className={clsx(
                                        'rounded-md px-4 py-1.5 text-sm font-medium',
                                        interval === option.value
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-300 hover:text-white',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                        {plans.map((plan) => {
                            const price =
                                interval === 'yearly'
                                    ? plan.price_yearly
                                    : plan.price_monthly;
                            const current = currentPlanSlug === plan.slug;

                            return (
                                <article
                                    key={plan.id}
                                    className={clsx(
                                        'flex flex-col rounded-2xl bg-[#152033] p-6 ring-1',
                                        current
                                            ? 'ring-indigo-500'
                                            : 'ring-slate-800',
                                    )}
                                >
                                    <h2 className="text-lg font-semibold">{plan.name}</h2>
                                    <p className="mt-4 text-3xl font-semibold">
                                        {plan.is_free ? 'Бесплатно' : formatMoney(price)}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {interval === 'yearly' ? 'за год' : 'в месяц'}
                                    </p>
                                    <ul className="mt-6 space-y-2 text-sm text-slate-300">
                                        <li>До {plan.max_stores} магазинов</li>
                                        <li>До {plan.max_users} пользователей</li>
                                        <li>Общий каталог товаров (без лимита)</li>
                                        {(plan.features || []).map((feature) => (
                                            <li key={feature} className="flex gap-2">
                                                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        disabled={processingId === plan.id}
                                        onClick={() => selectPlan(plan)}
                                        className="mt-8 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                                    >
                                        {current ? 'Текущий / Выбрать' : 'Выбрать'}
                                    </button>
                                </article>
                            );
                        })}
                    </div>

                    {plans.length > 0 && (
                        <section className="mt-16 overflow-hidden rounded-2xl bg-[#152033] ring-1 ring-slate-800">
                            <h2 className="px-6 py-4 text-lg font-semibold">Сравнение</h2>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-[#1a2740] text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-medium">Параметр</th>
                                            {plans.map((plan) => (
                                                <th key={plan.id} className="px-4 py-3 text-left font-medium">
                                                    {plan.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {comparisonRows.map((row) => (
                                            <tr key={row.key}>
                                                <td className="px-4 py-3 text-slate-400">{row.label}</td>
                                                {plans.map((plan) => {
                                                    let value = '—';
                                                    if (row.key === 'price') {
                                                        value = plan.is_free
                                                            ? 'Бесплатно'
                                                            : formatMoney(
                                                                  interval === 'yearly'
                                                                      ? plan.price_yearly
                                                                      : plan.price_monthly,
                                                              );
                                                    } else if (row.key === 'stores') {
                                                        value = plan.max_stores;
                                                    } else if (row.key === 'users') {
                                                        value = plan.max_users;
                                                    } else if (row.key === 'catalog') {
                                                        value = 'Общий (без лимита)';
                                                    } else if (row.key.startsWith('f:')) {
                                                        const feature = row.key.slice(2);
                                                        value = (plan.features || []).includes(feature)
                                                            ? 'Да'
                                                            : '—';
                                                    }

                                                    return (
                                                        <td key={plan.id} className="px-4 py-3 text-white">
                                                            {value}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </main>
                <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
                    <a href="/oferta" className="text-indigo-300 hover:text-indigo-200">Оферта</a>
                    <span className="mx-2">·</span>
                    <a href="/privacy-policy" className="text-indigo-300 hover:text-indigo-200">Конфиденциальность</a>
                </footer>
            </div>
        </>
    );
}
