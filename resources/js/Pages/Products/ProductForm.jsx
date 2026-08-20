import { Link } from '@inertiajs/react';

const PACKAGE_TYPES = [
    'Бутылка',
    'Банка',
    'ПЭТ',
    'Пакет',
    'Коробка',
    'Другое',
];

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

export function buildProductFormData(product = null) {
    return {
        barcode: product?.barcode ?? '',
        name: product?.name ?? '',
        category: product?.category ?? '',
        volume_ml: product?.volume_ml ?? '',
        package_type: product?.package_type ?? '',
        width_mm: product?.width_mm ?? '',
        height_mm: product?.height_mm ?? '',
        depth_mm: product?.depth_mm ?? '',
        weight_g: product?.weight_g ?? '',
        checked: Boolean(product?.checked),
    };
}

export function validateProductForm(data) {
    const errors = {};

    const barcode = String(data.barcode || '').trim();
    if (!barcode) {
        errors.barcode = 'Укажите штрихкод.';
    } else if (!/^\d{13}$/.test(barcode)) {
        errors.barcode = 'Штрихкод должен состоять из 13 цифр.';
    }

    if (!String(data.name || '').trim()) {
        errors.name = 'Укажите название товара.';
    }

    if (!String(data.category || '').trim()) {
        errors.category = 'Укажите категорию.';
    }

    for (const field of [
        'volume_ml',
        'width_mm',
        'height_mm',
        'depth_mm',
        'weight_g',
    ]) {
        if (data[field] === '' || data[field] === null || data[field] === undefined) {
            continue;
        }

        const value = Number(data[field]);
        if (!Number.isInteger(value) || value < 0) {
            errors[field] = 'Значение должно быть целым числом ≥ 0.';
        }
    }

    return errors;
}

export default function ProductForm({
    data,
    setData,
    errors = {},
    clientErrors = {},
    processing = false,
    submitLabel = 'Сохранить',
    onSubmit,
}) {
    const err = (key) => clientErrors[key] || errors[key];

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="barcode"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Штрихкод (EAN-13)
                        </label>
                        <input
                            id="barcode"
                            type="text"
                            inputMode="numeric"
                            maxLength={13}
                            value={data.barcode}
                            onChange={(e) =>
                                setData(
                                    'barcode',
                                    e.target.value.replace(/\D/g, '').slice(0, 13),
                                )
                            }
                            className={inputClass(err('barcode'))}
                            placeholder="4810014018641"
                            required
                        />
                        <FieldError message={err('barcode')} />
                    </div>

                    <div>
                        <label
                            htmlFor="category"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Категория
                        </label>
                        <input
                            id="category"
                            type="text"
                            value={data.category}
                            onChange={(e) => setData('category', e.target.value)}
                            className={inputClass(err('category'))}
                            placeholder="Квас Белорусский"
                            required
                        />
                        <FieldError message={err('category')} />
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
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass(err('name'))}
                            placeholder="Квас Старажытны Бачкавы темный 1.4 л"
                            required
                        />
                        <FieldError message={err('name')} />
                    </div>

                    <div>
                        <label
                            htmlFor="volume_ml"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Объём (мл)
                        </label>
                        <input
                            id="volume_ml"
                            type="number"
                            min={0}
                            value={data.volume_ml}
                            onChange={(e) =>
                                setData('volume_ml', e.target.value)
                            }
                            className={inputClass(err('volume_ml'))}
                            placeholder="1400"
                        />
                        <FieldError message={err('volume_ml')} />
                    </div>

                    <div>
                        <label
                            htmlFor="package_type"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Тип упаковки
                        </label>
                        <select
                            id="package_type"
                            value={data.package_type}
                            onChange={(e) =>
                                setData('package_type', e.target.value)
                            }
                            className={inputClass(err('package_type'))}
                        >
                            <option value="">Не указан</option>
                            {PACKAGE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('package_type')} />
                    </div>

                    <div>
                        <label
                            htmlFor="width_mm"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Ширина (мм)
                        </label>
                        <input
                            id="width_mm"
                            type="number"
                            min={0}
                            value={data.width_mm}
                            onChange={(e) =>
                                setData('width_mm', e.target.value)
                            }
                            className={inputClass(err('width_mm'))}
                        />
                        <FieldError message={err('width_mm')} />
                    </div>

                    <div>
                        <label
                            htmlFor="height_mm"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Высота (мм)
                        </label>
                        <input
                            id="height_mm"
                            type="number"
                            min={0}
                            value={data.height_mm}
                            onChange={(e) =>
                                setData('height_mm', e.target.value)
                            }
                            className={inputClass(err('height_mm'))}
                        />
                        <FieldError message={err('height_mm')} />
                    </div>

                    <div>
                        <label
                            htmlFor="depth_mm"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Глубина (мм)
                        </label>
                        <input
                            id="depth_mm"
                            type="number"
                            min={0}
                            value={data.depth_mm}
                            onChange={(e) =>
                                setData('depth_mm', e.target.value)
                            }
                            className={inputClass(err('depth_mm'))}
                        />
                        <FieldError message={err('depth_mm')} />
                    </div>

                    <div>
                        <label
                            htmlFor="weight_g"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Вес (г)
                        </label>
                        <input
                            id="weight_g"
                            type="number"
                            min={0}
                            value={data.weight_g}
                            onChange={(e) =>
                                setData('weight_g', e.target.value)
                            }
                            className={inputClass(err('weight_g'))}
                        />
                        <FieldError message={err('weight_g')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="inline-flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={Boolean(data.checked)}
                                onChange={(e) =>
                                    setData('checked', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-slate-200">
                                Проверен (checked)
                            </span>
                        </label>
                        <FieldError message={err('checked')} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Link
                    href={route('products.index')}
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
