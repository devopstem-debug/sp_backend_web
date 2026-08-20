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

export function buildDepartmentFormData(department = null, selectedStoreId = null) {
    return {
        store_id: department?.store_id ?? selectedStoreId ?? '',
        code: department?.code ?? '',
        name: department?.name ?? '',
        color: department?.color ?? '#CCCCCC',
        sort_order: department?.sort_order ?? 0,
    };
}

export function validateDepartmentForm(data) {
    const errors = {};

    if (!data.store_id) {
        errors.store_id = 'Выберите магазин.';
    }

    const code = String(data.code || '').trim().toUpperCase();
    if (!code) {
        errors.code = 'Укажите код отдела.';
    } else if (code.length > 10) {
        errors.code = 'Код не длиннее 10 символов.';
    } else if (!/^[A-Z0-9_-]+$/.test(code)) {
        errors.code = 'Код: только A-Z, 0-9, _ или -.';
    }

    if (!String(data.name || '').trim()) {
        errors.name = 'Укажите название отдела.';
    }

    const color = String(data.color || '').trim();
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
        errors.color = 'Цвет должен быть в формате #RRGGBB.';
    }

    if (
        data.sort_order !== '' &&
        data.sort_order !== null &&
        data.sort_order !== undefined
    ) {
        const order = Number(data.sort_order);
        if (!Number.isInteger(order) || order < 0) {
            errors.sort_order = 'Порядок должен быть целым числом ≥ 0.';
        }
    }

    return errors;
}

export default function DepartmentForm({
    data,
    setData,
    errors = {},
    clientErrors = {},
    processing = false,
    stores = [],
    submitLabel = 'Сохранить',
    onSubmit,
}) {
    const err = (key) => clientErrors[key] || errors[key];

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label
                            htmlFor="store_id"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Магазин
                        </label>
                        <select
                            id="store_id"
                            value={data.store_id}
                            onChange={(e) => setData('store_id', e.target.value)}
                            className={inputClass(err('store_id'))}
                            required
                        >
                            <option value="">Выберите магазин</option>
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('store_id')} />
                    </div>

                    <div>
                        <label
                            htmlFor="code"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Код
                        </label>
                        <input
                            id="code"
                            type="text"
                            maxLength={10}
                            value={data.code}
                            onChange={(e) =>
                                setData(
                                    'code',
                                    e.target.value.toUpperCase().slice(0, 10),
                                )
                            }
                            className={`${inputClass(err('code'))} font-mono uppercase`}
                            placeholder="WE"
                            required
                        />
                        <FieldError message={err('code')} />
                    </div>

                    <div>
                        <label
                            htmlFor="sort_order"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Порядок
                        </label>
                        <input
                            id="sort_order"
                            type="number"
                            min={0}
                            value={data.sort_order}
                            onChange={(e) =>
                                setData('sort_order', e.target.value)
                            }
                            className={inputClass(err('sort_order'))}
                        />
                        <FieldError message={err('sort_order')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Название
                        </label>
                        <input
                            id="name"
                            type="text"
                            maxLength={100}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass(err('name'))}
                            placeholder="Отдел напитков"
                            required
                        />
                        <FieldError message={err('name')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="color"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Цвет
                        </label>
                        <div className="mt-1 flex items-center gap-3">
                            <input
                                id="color"
                                type="color"
                                value={data.color || '#CCCCCC'}
                                onChange={(e) =>
                                    setData(
                                        'color',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                className="h-10 w-14 cursor-pointer rounded border border-slate-700 bg-[#152033] p-1"
                            />
                            <input
                                type="text"
                                value={data.color || '#CCCCCC'}
                                onChange={(e) =>
                                    setData(
                                        'color',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                className={`${inputClass(err('color'))} !mt-0 max-w-[8rem] font-mono`}
                                placeholder="#CCCCCC"
                                maxLength={7}
                            />
                            <span
                                className="inline-block h-6 w-6 rounded-full ring-1 ring-slate-800"
                                style={{
                                    backgroundColor: data.color || '#CCCCCC',
                                }}
                                aria-hidden="true"
                            />
                        </div>
                        <FieldError message={err('color')} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Link
                    href={route('departments.index')}
                    className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                >
                    Отмена
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Сохранение…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
