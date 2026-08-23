import { Link } from '@inertiajs/react';
import { useMemo } from 'react';

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-red-600">{message}</p>;
}

function inputClass(hasError) {
    return `mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        hasError
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500'
    }`;
}

export function buildTenantFormData(tenant = null, plans = []) {
    const defaultPlan = tenant?.plan || plans[0]?.value || 'basic';

    return {
        name: tenant?.name ?? '',
        domain: tenant?.domain ?? '',
        plan: defaultPlan,
    };
}

export function validateTenantForm(data) {
    const errors = {};

    if (!String(data.name || '').trim()) {
        errors.name = 'Укажите название.';
    }

    if (!String(data.domain || '').trim()) {
        errors.domain = 'Укажите домен.';
    }

    if (!String(data.plan || '').trim()) {
        errors.plan = 'Выберите тариф.';
    }

    return errors;
}

export default function TenantForm({
    data,
    setData,
    errors,
    clientErrors = {},
    processing,
    plans = [],
    submitLabel,
    onSubmit,
    cancelHref,
}) {
    const fieldError = (name) => errors?.[name] || clientErrors?.[name];

    const selectedPlan = useMemo(
        () => plans.find((plan) => plan.value === data.plan) ?? null,
        [plans, data.plan],
    );

    return (
        <form
            onSubmit={onSubmit}
            className="max-w-2xl space-y-6 rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800"
        >
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                    Название
                </label>
                <input
                    id="name"
                    type="text"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className={inputClass(Boolean(fieldError('name')))}
                    autoComplete="organization"
                />
                <FieldError message={fieldError('name')} />
            </div>

            <div>
                <label htmlFor="domain" className="block text-sm font-medium text-slate-200">
                    Домен
                </label>
                <input
                    id="domain"
                    type="text"
                    value={data.domain}
                    onChange={(e) => setData('domain', e.target.value)}
                    placeholder="example.com"
                    className={inputClass(Boolean(fieldError('domain')))}
                    autoComplete="off"
                />
                <FieldError message={fieldError('domain')} />
            </div>

            <div>
                <label htmlFor="plan" className="block text-sm font-medium text-slate-200">
                    Тариф
                </label>
                <select
                    id="plan"
                    value={data.plan}
                    onChange={(e) => setData('plan', e.target.value)}
                    className={inputClass(Boolean(fieldError('plan')))}
                >
                    {plans.map((plan) => (
                        <option key={plan.value} value={plan.value}>
                            {plan.label}
                        </option>
                    ))}
                </select>
                <FieldError message={fieldError('plan')} />
            </div>

            {selectedPlan ? (
                <div className="rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Условия тарифа
                    </p>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs text-slate-500">Магазины</dt>
                            <dd className="mt-0.5 text-sm font-medium text-white">
                                {selectedPlan.max_stores}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-xs text-slate-500">Пользователи</dt>
                            <dd className="mt-0.5 text-sm font-medium text-white">
                                {selectedPlan.max_users}
                            </dd>
                        </div>
                    </dl>
                    <p className="mt-3 text-xs text-slate-500">
                        Каталог товаров общий для всех арендаторов и не ограничивается
                        тарифом. Лимиты магазинов/пользователей и срок подписки берутся
                        из тарифа автоматически.
                    </p>
                </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-60"
                >
                    {submitLabel}
                </button>
                <Link
                    href={cancelHref}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                >
                    Отмена
                </Link>
            </div>
        </form>
    );
}
