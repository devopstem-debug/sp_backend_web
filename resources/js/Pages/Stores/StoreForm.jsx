import { Link } from '@inertiajs/react';
import { MapPinIcon } from '@heroicons/react/24/outline';
import LocationMapPicker from '@/Components/Maps/LocationMapPicker';

const STATUS_OPTIONS = [
    { value: 'active', label: 'Активен', tone: 'emerald' },
    { value: 'repair', label: 'Ремонт', tone: 'amber' },
    { value: 'decommissioned', label: 'Выведен', tone: 'slate' },
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-red-400">{message}</p>;
}

function inputClass(hasError) {
    return `mt-1.5 block w-full rounded-lg border bg-[#0e172b] px-3 py-2.5 text-sm text-slate-100 shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        hasError
            ? 'border-red-400/70 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500'
    }`;
}

function statusButtonClass(active, tone) {
    const tones = {
        emerald: active
            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200 ring-emerald-500/30'
            : 'border-slate-700 text-slate-400 hover:border-emerald-500/30 hover:text-emerald-200',
        amber: active
            ? 'border-amber-500/50 bg-amber-500/15 text-amber-200 ring-amber-500/30'
            : 'border-slate-700 text-slate-400 hover:border-amber-500/30 hover:text-amber-200',
        slate: active
            ? 'border-slate-500/50 bg-slate-500/15 text-slate-200 ring-slate-500/30'
            : 'border-slate-700 text-slate-400 hover:border-slate-500/40 hover:text-slate-200',
    };

    return `rounded-lg border px-3 py-2 text-sm font-medium transition ring-1 ring-inset ${
        tones[tone] || tones.slate
    }`;
}

export function buildStoreFormData(store = null, defaults = {}) {
    return {
        name: store?.name ?? '',
        address: store?.address ?? '',
        city: store?.city ?? '',
        latitude: store?.latitude ?? '',
        longitude: store?.longitude ?? '',
        status: store?.status ?? 'active',
        tenant_id: store?.tenant_id ?? defaults.tenant_id ?? '',
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

    if (!String(data.address || '').trim()) {
        errors.address = 'Укажите адрес магазина.';
    }

    if (
        data.latitude === '' ||
        data.latitude === null ||
        data.longitude === '' ||
        data.longitude === null
    ) {
        errors.location =
            'Укажите точку на карте: найдите адрес или кликните по карте.';
    } else {
        const lat = Number(data.latitude);
        if (Number.isNaN(lat) || lat < -90 || lat > 90) {
            errors.latitude = 'Широта должна быть от -90 до 90.';
        }

        const lng = Number(data.longitude);
        if (Number.isNaN(lng) || lng < -180 || lng > 180) {
            errors.longitude = 'Долгота должна быть от -180 до 180.';
        }
    }

    return errors;
}

function SidebarFields({ data, setData, err, tenants }) {
    return (
        <>
            {tenants.length > 0 && (
                <div>
                    <label
                        htmlFor="tenant_id"
                        className="block text-sm font-medium text-slate-200"
                    >
                        Арендатор
                    </label>
                    <select
                        id="tenant_id"
                        value={data.tenant_id}
                        onChange={(e) => setData('tenant_id', e.target.value)}
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

            <div>
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

            <div>
                <span className="block text-sm font-medium text-slate-200">
                    Статус
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                    {STATUS_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setData('status', option.value)}
                            className={statusButtonClass(
                                data.status === option.value,
                                option.tone,
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <FieldError message={err('status')} />
            </div>
        </>
    );
}

function FormActions({ processing, submitLabel }) {
    return (
        <>
            <Link
                href={route('stores.index')}
                className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
            >
                Отмена
            </Link>
            <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <MapPinIcon className="h-4 w-4" />
                {processing ? 'Сохранение…' : submitLabel}
            </button>
        </>
    );
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

    const mapErrors = {
        address: err('address'),
        city: err('city'),
        location: err('location') || err('latitude') || err('longitude'),
    };

    const handleMapChange = (patch) => {
        Object.entries(patch).forEach(([key, value]) => {
            setData(key, value);
        });
    };

    return (
        <form
            onSubmit={onSubmit}
            className="flex h-full min-h-0 flex-col overflow-hidden lg:flex-row"
            noValidate
        >
            <aside className="flex w-full shrink-0 flex-col border-b border-slate-800 bg-[#152033] lg:w-[min(100%,400px)] lg:border-b-0 lg:border-r">
                <div className="sidebar-scroll max-h-[38vh] flex-1 space-y-5 overflow-y-auto p-5 lg:max-h-none">
                    <SidebarFields
                        data={data}
                        setData={setData}
                        err={err}
                        tenants={tenants}
                    />
                </div>
                <div className="hidden shrink-0 items-center justify-end gap-3 border-t border-slate-800 p-4 lg:flex">
                    <FormActions
                        processing={processing}
                        submitLabel={submitLabel}
                    />
                </div>
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <LocationMapPicker
                    fillHeight
                    latitude={data.latitude}
                    longitude={data.longitude}
                    address={data.address}
                    city={data.city}
                    errors={mapErrors}
                    onChange={handleMapChange}
                />
            </div>

            <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-800 bg-[#152033] p-4 lg:hidden">
                <FormActions processing={processing} submitLabel={submitLabel} />
            </div>
        </form>
    );
}
