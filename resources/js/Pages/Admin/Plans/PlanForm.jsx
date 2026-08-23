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

export function buildPlanFormData(plan = null) {
    return {
        name: plan?.name ?? '',
        slug: plan?.slug ?? '',
        price_monthly: plan?.price_monthly ?? 0,
        price_yearly: plan?.price_yearly ?? 0,
        max_stores: plan?.max_stores ?? 5,
        max_users: plan?.max_users ?? 20,
        max_products: plan?.max_products ?? 500,
        features_text: (plan?.features || []).join('\n'),
        is_active: plan?.is_active ?? true,
        sort_order: plan?.sort_order ?? 0,
    };
}

export function toPlanPayload(form) {
    return {
        name: form.name,
        slug: form.slug || null,
        price_monthly: Number(form.price_monthly),
        price_yearly: Number(form.price_yearly),
        max_stores: Number(form.max_stores),
        max_users: Number(form.max_users),
        max_products: Number(form.max_products),
        features: String(form.features_text || '')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        is_active: Boolean(form.is_active),
        sort_order: Number(form.sort_order || 0),
    };
}

export default function PlanForm({
    data,
    setData,
    errors,
    processing,
    submitLabel,
    onSubmit,
    cancelHref,
}) {
    return (
        <form
            onSubmit={onSubmit}
            className="max-w-2xl space-y-5 rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800"
        >
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                    Название
                </label>
                <input
                    id="name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    className={inputClass(Boolean(errors.name))}
                />
                <FieldError message={errors.name} />
            </div>

            <div>
                <label htmlFor="slug" className="block text-sm font-medium text-slate-200">
                    Slug
                </label>
                <input
                    id="slug"
                    value={data.slug}
                    onChange={(e) => setData('slug', e.target.value)}
                    placeholder="basic"
                    className={inputClass(Boolean(errors.slug))}
                />
                <FieldError message={errors.slug} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="price_monthly" className="block text-sm font-medium text-slate-200">
                        Цена / месяц (BYN)
                    </label>
                    <input
                        id="price_monthly"
                        type="number"
                        min={0}
                        step="0.01"
                        value={data.price_monthly}
                        onChange={(e) => setData('price_monthly', e.target.value)}
                        className={inputClass(Boolean(errors.price_monthly))}
                    />
                    <FieldError message={errors.price_monthly} />
                </div>
                <div>
                    <label htmlFor="price_yearly" className="block text-sm font-medium text-slate-200">
                        Цена / год (BYN)
                    </label>
                    <input
                        id="price_yearly"
                        type="number"
                        min={0}
                        step="0.01"
                        value={data.price_yearly}
                        onChange={(e) => setData('price_yearly', e.target.value)}
                        className={inputClass(Boolean(errors.price_yearly))}
                    />
                    <FieldError message={errors.price_yearly} />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div>
                    <label htmlFor="max_stores" className="block text-sm font-medium text-slate-200">
                        Max магазинов
                    </label>
                    <input
                        id="max_stores"
                        type="number"
                        min={1}
                        value={data.max_stores}
                        onChange={(e) => setData('max_stores', e.target.value)}
                        className={inputClass(Boolean(errors.max_stores))}
                    />
                    <FieldError message={errors.max_stores} />
                </div>
                <div>
                    <label htmlFor="max_users" className="block text-sm font-medium text-slate-200">
                        Max пользователей
                    </label>
                    <input
                        id="max_users"
                        type="number"
                        min={1}
                        value={data.max_users}
                        onChange={(e) => setData('max_users', e.target.value)}
                        className={inputClass(Boolean(errors.max_users))}
                    />
                    <FieldError message={errors.max_users} />
                </div>
                <div>
                    <label htmlFor="max_products" className="block text-sm font-medium text-slate-200">
                        Max товаров{' '}
                        <span className="font-normal text-slate-500">(не используется)</span>
                    </label>
                    <input
                        id="max_products"
                        type="number"
                        min={1}
                        value={data.max_products}
                        onChange={(e) => setData('max_products', e.target.value)}
                        className={inputClass(Boolean(errors.max_products))}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        Каталог товаров общий. Поле сохраняется для совместимости, лимит не
                        применяется.
                    </p>
                    <FieldError message={errors.max_products} />
                </div>
            </div>

            <div>
                <label htmlFor="features_text" className="block text-sm font-medium text-slate-200">
                    Возможности (по одной на строку)
                </label>
                <textarea
                    id="features_text"
                    rows={5}
                    value={data.features_text}
                    onChange={(e) => setData('features_text', e.target.value)}
                    className={inputClass(Boolean(errors.features))}
                />
                <FieldError message={errors.features} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="sort_order" className="block text-sm font-medium text-slate-200">
                        Порядок
                    </label>
                    <input
                        id="sort_order"
                        type="number"
                        min={0}
                        value={data.sort_order}
                        onChange={(e) => setData('sort_order', e.target.value)}
                        className={inputClass(Boolean(errors.sort_order))}
                    />
                    <FieldError message={errors.sort_order} />
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm text-slate-200">
                    <input
                        type="checkbox"
                        checked={Boolean(data.is_active)}
                        onChange={(e) => setData('is_active', e.target.checked)}
                    />
                    Активен
                </label>
            </div>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                >
                    {submitLabel}
                </button>
                <Link
                    href={cancelHref}
                    className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                    Отмена
                </Link>
            </div>
        </form>
    );
}
