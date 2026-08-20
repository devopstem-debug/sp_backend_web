import { Link } from '@inertiajs/react';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Активен' },
    { value: 'repair', label: 'Ремонт' },
    { value: 'decommissioned', label: 'Выведен' },
];

const DEFAULT_WORKING_HOURS = `{
  "mon": "09:00-21:00",
  "tue": "09:00-21:00",
  "wed": "09:00-21:00",
  "thu": "09:00-21:00",
  "fri": "09:00-21:00",
  "sat": "10:00-20:00",
  "sun": "10:00-18:00"
}`;

const DEFAULT_CONTACT_INFO = `{
  "phone": "",
  "email": ""
}`;

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

export function buildStoreFormData(store = null, defaults = {}) {
    return {
        name: store?.name ?? '',
        address: store?.address ?? '',
        city: store?.city ?? '',
        latitude: store?.latitude ?? '',
        longitude: store?.longitude ?? '',
        radius_meters: store?.radius_meters ?? 100,
        area_sqm: store?.area_sqm ?? '',
        status: store?.status ?? 'active',
        tenant_id: store?.tenant_id ?? defaults.tenant_id ?? '',
        working_hours_json: store?.working_hours
            ? JSON.stringify(store.working_hours, null, 2)
            : DEFAULT_WORKING_HOURS,
        contact_info_json: store?.contact_info
            ? JSON.stringify(store.contact_info, null, 2)
            : DEFAULT_CONTACT_INFO,
    };
}

export function validateStoreForm(data) {
    const errors = {};

    if (!String(data.name || '').trim()) {
        errors.name = 'Укажите название магазина.';
    }

    if (!data.status) {
        errors.status = 'Выберите статус.';
    }

    if (data.latitude !== '' && data.latitude !== null) {
        const lat = Number(data.latitude);
        if (Number.isNaN(lat) || lat < -90 || lat > 90) {
            errors.latitude = 'Широта должна быть от -90 до 90.';
        }
    }

    if (data.longitude !== '' && data.longitude !== null) {
        const lng = Number(data.longitude);
        if (Number.isNaN(lng) || lng < -180 || lng > 180) {
            errors.longitude = 'Долгота должна быть от -180 до 180.';
        }
    }

    if (data.radius_meters !== '' && data.radius_meters !== null) {
        const radius = Number(data.radius_meters);
        if (!Number.isInteger(radius) || radius < 1) {
            errors.radius_meters = 'Радиус должен быть целым числом ≥ 1.';
        }
    }

    if (data.area_sqm !== '' && data.area_sqm !== null) {
        const area = Number(data.area_sqm);
        if (Number.isNaN(area) || area < 0) {
            errors.area_sqm = 'Площадь должна быть числом ≥ 0.';
        }
    }

    for (const field of ['working_hours_json', 'contact_info_json']) {
        const raw = String(data[field] || '').trim();
        if (!raw) {
            continue;
        }

        try {
            const parsed = JSON.parse(raw);
            if (parsed === null || typeof parsed !== 'object') {
                errors[field] = 'JSON должен быть объектом или массивом.';
            }
        } catch {
            errors[field] = 'Некорректный JSON.';
        }
    }

    return errors;
}

export default function StoreForm({
    data,
    setData,
    errors = {},
    clientErrors = {},
    processing = false,
    tenants = [],
    submitLabel = 'Сохранить',
    onSubmit,
}) {
    const err = (key) => clientErrors[key] || errors[key];

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                <div className="grid gap-5 sm:grid-cols-2">
                    {tenants.length > 0 && (
                        <div className="sm:col-span-2">
                            <label
                                htmlFor="tenant_id"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Арендатор
                            </label>
                            <select
                                id="tenant_id"
                                value={data.tenant_id}
                                onChange={(e) =>
                                    setData('tenant_id', e.target.value)
                                }
                                className={inputClass(err('tenant_id'))}
                            >
                                <option value="">Выберите арендатора</option>
                                {tenants.map((tenant) => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </option>
                                ))}
                            </select>
                            <FieldError message={err('tenant_id')} />
                        </div>
                    )}

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
                            placeholder="ТЦ Центральный"
                            required
                        />
                        <FieldError message={err('name')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="address"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Адрес
                        </label>
                        <textarea
                            id="address"
                            rows={2}
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                            className={inputClass(err('address'))}
                            placeholder="ул. Примерная, 1"
                        />
                        <FieldError message={err('address')} />
                    </div>

                    <div>
                        <label
                            htmlFor="city"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Город
                        </label>
                        <input
                            id="city"
                            type="text"
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            className={inputClass(err('city'))}
                        />
                        <FieldError message={err('city')} />
                    </div>

                    <div>
                        <label
                            htmlFor="status"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Статус
                        </label>
                        <select
                            id="status"
                            value={data.status}
                            onChange={(e) => setData('status', e.target.value)}
                            className={inputClass(err('status'))}
                            required
                        >
                            {STATUS_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('status')} />
                    </div>

                    <div>
                        <label
                            htmlFor="latitude"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Широта
                        </label>
                        <input
                            id="latitude"
                            type="number"
                            step="any"
                            value={data.latitude}
                            onChange={(e) =>
                                setData('latitude', e.target.value)
                            }
                            className={inputClass(err('latitude'))}
                        />
                        <FieldError message={err('latitude')} />
                    </div>

                    <div>
                        <label
                            htmlFor="longitude"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Долгота
                        </label>
                        <input
                            id="longitude"
                            type="number"
                            step="any"
                            value={data.longitude}
                            onChange={(e) =>
                                setData('longitude', e.target.value)
                            }
                            className={inputClass(err('longitude'))}
                        />
                        <FieldError message={err('longitude')} />
                    </div>

                    <div>
                        <label
                            htmlFor="radius_meters"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Радиус (м)
                        </label>
                        <input
                            id="radius_meters"
                            type="number"
                            min={1}
                            value={data.radius_meters}
                            onChange={(e) =>
                                setData('radius_meters', e.target.value)
                            }
                            className={inputClass(err('radius_meters'))}
                        />
                        <FieldError message={err('radius_meters')} />
                    </div>

                    <div>
                        <label
                            htmlFor="area_sqm"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Площадь (м²)
                        </label>
                        <input
                            id="area_sqm"
                            type="number"
                            min={0}
                            step="0.01"
                            value={data.area_sqm}
                            onChange={(e) =>
                                setData('area_sqm', e.target.value)
                            }
                            className={inputClass(err('area_sqm'))}
                        />
                        <FieldError message={err('area_sqm')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="working_hours_json"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Режим работы (JSON)
                        </label>
                        <textarea
                            id="working_hours_json"
                            rows={8}
                            value={data.working_hours_json}
                            onChange={(e) =>
                                setData('working_hours_json', e.target.value)
                            }
                            className={`${inputClass(err('working_hours_json'))} font-mono text-xs`}
                            spellCheck={false}
                        />
                        <FieldError message={err('working_hours_json')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label
                            htmlFor="contact_info_json"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Контакты (JSON)
                        </label>
                        <textarea
                            id="contact_info_json"
                            rows={5}
                            value={data.contact_info_json}
                            onChange={(e) =>
                                setData('contact_info_json', e.target.value)
                            }
                            className={`${inputClass(err('contact_info_json'))} font-mono text-xs`}
                            spellCheck={false}
                        />
                        <FieldError message={err('contact_info_json')} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Link
                    href={route('stores.index')}
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
