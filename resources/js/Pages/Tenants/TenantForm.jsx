import { Link } from '@inertiajs/react';

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

export function buildTenantFormData(tenant = null) {
    return {
        name: tenant?.name ?? '',
        domain: tenant?.domain ?? '',
        plan: tenant?.plan ?? 'basic',
        max_stores: tenant?.max_stores ?? 5,
        max_users: tenant?.max_users ?? 20,
        subscription_until: tenant?.subscription_until ?? '',
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

    const maxStores = Number(data.max_stores);
    if (!Number.isInteger(maxStores) || maxStores < 1) {
        errors.max_stores = 'Укажите лимит магазинов.';
    }

    const maxUsers = Number(data.max_users);
    if (!Number.isInteger(maxUsers) || maxUsers < 1) {
        errors.max_users = 'Укажите лимит пользователей.';
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

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label
                        htmlFor="max_stores"
                        className="block text-sm font-medium text-slate-200"
                    >
                        Max магазинов
                    </label>
                    <input
                        id="max_stores"
                        type="number"
                        min={1}
                        value={data.max_stores}
                        onChange={(e) => setData('max_stores', e.target.value)}
                        className={inputClass(Boolean(fieldError('max_stores')))}
                    />
                    <FieldError message={fieldError('max_stores')} />
                </div>

                <div>
                    <label
                        htmlFor="max_users"
                        className="block text-sm font-medium text-slate-200"
                    >
                        Max пользователей
                    </label>
                    <input
                        id="max_users"
                        type="number"
                        min={1}
                        value={data.max_users}
                        onChange={(e) => setData('max_users', e.target.value)}
                        className={inputClass(Boolean(fieldError('max_users')))}
                    />
                    <FieldError message={fieldError('max_users')} />
                </div>
            </div>

            <div>
                <label
                    htmlFor="subscription_until"
                    className="block text-sm font-medium text-slate-200"
                >
                    Срок подписки
                </label>
                <input
                    id="subscription_until"
                    type="date"
                    value={data.subscription_until || ''}
                    onChange={(e) => setData('subscription_until', e.target.value)}
                    className={inputClass(Boolean(fieldError('subscription_until')))}
                />
                <FieldError message={fieldError('subscription_until')} />
            </div>

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
