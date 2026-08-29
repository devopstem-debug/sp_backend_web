import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    MapIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import HallBoundaryMap, {
    measurePolygon,
} from '@/Components/Maps/HallBoundaryMap';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const inputClass =
    'mt-1 block w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

const STEPS = [
    { id: 1, title: 'Поиск' },
    { id: 2, title: 'Карта' },
    { id: 3, title: 'Границы' },
    { id: 4, title: 'Размеры' },
    { id: 5, title: 'Сохранить' },
];

function clampEntrance(width, height, side, offset, entranceWidth) {
    const wall = ['north', 'south'].includes(side) ? width : height;
    const ew = round1(
        Math.min(Math.max(0.5, Number(entranceWidth) || 2), Math.max(0.5, wall)),
    );
    const off = round1(
        Math.min(Math.max(0, Number(offset) || 0), Math.max(0, wall - ew)),
    );
    return { entrance_width_m: ew, entrance_offset_m: off };
}

/** Округление до 1 знака (103.07 → 103.1), иначе input step=0.1 блокирует submit. */
function round1(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 10) / 10;
}

function isOneDecimal(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return false;
    return Math.abs(n * 10 - Math.round(n * 10)) < 1e-8;
}

export default function Create({ stores = [], sides = {}, defaults = {} }) {
    const { flash } = usePage().props;
    const [step, setStep] = useState(1);
    const [addressQuery, setAddressQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [layer, setLayer] = useState('osm');
    const [mapMode, setMapMode] = useState('view'); // view | draw | edit
    const [vertices, setVertices] = useState([]);
    const [center, setCenter] = useState([53.9023, 27.5619]);
    const [zoom, setZoom] = useState(16);
    const [recenterToken, setRecenterToken] = useState(0);
    const [searchMarker, setSearchMarker] = useState(null);
    const [geoAddress, setGeoAddress] = useState('');

    const selectedStore = useMemo(
        () => stores.find((s) => s.id === defaults.store_id) || stores[0],
        [stores, defaults.store_id],
    );

    const { data, setData, processing, errors, setError, clearErrors } = useForm({
        store_id: defaults.store_id || selectedStore?.id || '',
        width_meters: defaults.width_meters ?? 20,
        height_meters: defaults.height_meters ?? 15,
        entrance_side: defaults.entrance_side || 'south',
        entrance_offset_m: defaults.entrance_offset_m ?? 0,
        entrance_width_m: defaults.entrance_width_m ?? 2,
        has_cash_registers: defaults.has_cash_registers ?? true,
        cash_side: defaults.cash_side || 'south',
        cash_count: defaults.cash_count ?? 3,
        grid_size_cm: defaults.grid_size_cm ?? 50,
        replace_existing: true,
        geo_address: '',
        geo_center_lat: null,
        geo_center_lng: null,
        area_sqm_geo: null,
        bearing_degrees: 0,
        geo_polygon: [],
    });

    const [saving, setSaving] = useState(false);
    /** Максимальный шаг, до которого уже дошли (1–5). Дальше — закрыто. */
    const [furthestStep, setFurthestStep] = useState(1);

    const advanceTo = (next) => {
        setStep(next);
        setFurthestStep((prev) => Math.max(prev, next));
    };

    const goToStep = (id) => {
        if (id > furthestStep) {
            fireError('Сначала завершите предыдущий шаг.');
            return;
        }
        setStep(id);
        if (id === 1) {
            setMapMode('view');
        } else if (id === 2) {
            setMapMode(vertices.length >= 3 ? 'edit' : 'view');
        } else if (id === 3) {
            setMapMode(vertices.length >= 3 ? 'edit' : 'draw');
        } else if (id >= 4) {
            setMapMode(vertices.length >= 3 ? 'edit' : 'view');
        }
    };

    useEffect(() => {
        if (flash?.success) fireSuccess(flash.success);
        if (flash?.error) fireError(flash.error);
    }, [flash]);

    useEffect(() => {
        if (!selectedStore) return;
        const parts = [selectedStore.city, selectedStore.address]
            .filter(Boolean)
            .join(', ');
        if (parts) {
            setAddressQuery((q) => q || parts);
        }
        if (selectedStore.latitude && selectedStore.longitude) {
            const lat = Number(selectedStore.latitude);
            const lng = Number(selectedStore.longitude);
            setCenter([lat, lng]);
            setSearchMarker({ lat, lng });
            setZoom(18);
            setRecenterToken((t) => t + 1);
            setData('geo_center_lat', lat);
            setData('geo_center_lng', lng);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (step < 4 || vertices.length < 3) return;
        const m = measurePolygon(vertices);
        const w = round1(Math.min(500, Math.max(5, m.width_meters)));
        const h = round1(Math.min(500, Math.max(5, m.height_meters)));
        const entrance = clampEntrance(
            w,
            h,
            data.entrance_side,
            data.entrance_offset_m,
            data.entrance_width_m,
        );
        setData('width_meters', w);
        setData('height_meters', h);
        setData('area_sqm_geo', round1(m.area_sqm));
        setData('bearing_degrees', m.bearing_degrees);
        setData('geo_polygon', vertices);
        setData('entrance_width_m', entrance.entrance_width_m);
        setData('entrance_offset_m', entrance.entrance_offset_m);
        if (m.center) {
            setData('geo_center_lat', m.center.lat);
            setData('geo_center_lng', m.center.lng);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vertices, step]);

    const metrics = useMemo(() => measurePolygon(vertices), [vertices]);

    const runGeocode = async () => {
        const q = addressQuery.trim();
        if (!q) {
            fireError('Укажите адрес для поиска.');
            return;
        }
        setSearching(true);
        setSuggestions([]);
        try {
            const { data: payload } = await axios.get(route('stores.geocode'), {
                params: { address: q, limit: 6 },
            });
            const results = payload?.results || [];
            if (results.length === 0) {
                fireError('Адрес не найден. Уточните запрос.');
                return;
            }
            setSuggestions(results);
            applySearchResult(results[0]);
            advanceTo(2);
        } catch (e) {
            fireError(
                e?.response?.data?.message ||
                    'Не удалось выполнить геокодирование.',
            );
        } finally {
            setSearching(false);
        }
    };

    const applySearchResult = (item) => {
        const lat = Number(item.latitude);
        const lng = Number(item.longitude);
        setCenter([lat, lng]);
        setSearchMarker({ lat, lng });
        setZoom(18);
        setRecenterToken((t) => t + 1);
        setGeoAddress(item.display_name || addressQuery);
        setData('geo_address', item.display_name || addressQuery);
        setData('geo_center_lat', lat);
        setData('geo_center_lng', lng);
    };

    const startDrawing = () => {
        setVertices([]);
        setMapMode('draw');
        setStep(3);
        setFurthestStep(3);
    };

    const finishDrawing = () => {
        if (vertices.length < 3) {
            fireError('Нужно минимум 3 угла здания.');
            return;
        }
        if (vertices.length > 50) {
            fireError('Максимум 50 углов.');
            return;
        }
        applyMetricsToForm(vertices);
        setMapMode('edit');
        advanceTo(4);
    };

    const applyMetricsToForm = (poly) => {
        const m = measurePolygon(poly);
        let w = m.width_meters;
        let h = m.height_meters;
        if (w < 5 || h < 5) {
            fireError(
                `Слишком маленький контур (${w}×${h} м). Минимум 5×5 м.`,
            );
        }
        w = round1(Math.min(500, Math.max(5, w)));
        h = round1(Math.min(500, Math.max(5, h)));
        const entrance = clampEntrance(
            w,
            h,
            data.entrance_side,
            data.entrance_offset_m,
            data.entrance_width_m,
        );
        setData('width_meters', w);
        setData('height_meters', h);
        setData('area_sqm_geo', round1(m.area_sqm));
        setData('bearing_degrees', m.bearing_degrees);
        setData('geo_center_lat', m.center?.lat ?? data.geo_center_lat);
        setData('geo_center_lng', m.center?.lng ?? data.geo_center_lng);
        setData('geo_address', geoAddress || data.geo_address);
        setData('geo_polygon', poly);
        setData('entrance_width_m', entrance.entrance_width_m);
        setData('entrance_offset_m', entrance.entrance_offset_m);
    };

    const onAddVertex = (point) => {
        setVertices((prev) => {
            if (prev.length >= 50) {
                fireError('Максимум 50 углов.');
                return prev;
            }
            return [...prev, point];
        });
    };

    const onMoveVertex = (index, point) => {
        setVertices((prev) => {
            const next = [...prev];
            next[index] = point;
            return next;
        });
    };

    const confirmSizes = () => {
        applyMetricsToForm(vertices);
        setMapMode('edit');
        advanceTo(5);
    };

    const wallLength = ['north', 'south'].includes(data.entrance_side)
        ? Number(data.width_meters) || 0
        : Number(data.height_meters) || 0;

    const saveBlockers = useMemo(() => {
        const issues = [];
        if (step < 5) {
            issues.push('Сначала завершите шаги 1–4');
            return issues;
        }
        if (!data.store_id) issues.push('Выберите магазин');
        if (vertices.length < 3) issues.push('Нужно минимум 3 угла на карте');
        if (stores.length === 0) issues.push('Нет доступных магазинов');

        const width = Number(data.width_meters);
        const height = Number(data.height_meters);
        if (!Number.isFinite(width) || width < 5 || width > 500) {
            issues.push('Ширина: от 5 до 500 м');
        } else if (!isOneDecimal(width)) {
            issues.push('Ширина: одно число после точки (например 103.1)');
        }
        if (!Number.isFinite(height) || height < 5 || height > 500) {
            issues.push('Длина: от 5 до 500 м');
        } else if (!isOneDecimal(height)) {
            issues.push('Длина: одно число после точки (например 103.1)');
        }

        const entranceW = Number(data.entrance_width_m);
        const entranceO = Number(data.entrance_offset_m);
        if (!Number.isFinite(entranceW) || entranceW < 0.5 || entranceW > 50) {
            issues.push('Ширина входа: от 0.5 до 50 м');
        } else if (!isOneDecimal(entranceW)) {
            issues.push('Ширина входа: одно число после точки');
        }
        if (!Number.isFinite(entranceO) || entranceO < 0) {
            issues.push('Отступ входа некорректный');
        } else if (!isOneDecimal(entranceO)) {
            issues.push('Отступ входа: одно число после точки');
        } else if (entranceO + entranceW > wallLength + 0.05) {
            issues.push('Вход не помещается на выбранной стороне');
        }

        if (!data.entrance_side) issues.push('Укажите сторону входа');

        if (data.has_cash_registers) {
            if (!data.cash_side) issues.push('Укажите сторону касс');
            const count = Number(data.cash_count);
            if (!Number.isInteger(count) || count < 1 || count > 40) {
                issues.push('Количество касс: от 1 до 40');
            }
        }

        return issues;
    }, [
        step,
        data.store_id,
        data.width_meters,
        data.height_meters,
        data.entrance_side,
        data.entrance_offset_m,
        data.entrance_width_m,
        data.has_cash_registers,
        data.cash_side,
        data.cash_count,
        vertices.length,
        stores.length,
        wallLength,
    ]);

    const canSave = saveBlockers.length === 0;

    const submit = (e) => {
        e.preventDefault();
        if (!canSave) {
            fireError(saveBlockers[0] || 'Заполните параметры зала.');
            return;
        }

        const width = round1(data.width_meters);
        const height = round1(data.height_meters);
        const entrance = clampEntrance(
            width,
            height,
            data.entrance_side,
            data.entrance_offset_m,
            data.entrance_width_m,
        );

        const payload = {
            store_id: data.store_id,
            width_meters: width,
            height_meters: height,
            entrance_side: data.entrance_side,
            entrance_offset_m: entrance.entrance_offset_m,
            entrance_width_m: entrance.entrance_width_m,
            has_cash_registers: Boolean(data.has_cash_registers),
            cash_side: data.has_cash_registers ? data.cash_side : null,
            cash_count: data.has_cash_registers
                ? Number(data.cash_count) || 1
                : null,
            grid_size_cm: Number(data.grid_size_cm) || 50,
            replace_existing: true,
            geo_address: geoAddress || data.geo_address || null,
            geo_center_lat: metrics.center?.lat ?? data.geo_center_lat,
            geo_center_lng: metrics.center?.lng ?? data.geo_center_lng,
            area_sqm_geo: round1(metrics.area_sqm),
            bearing_degrees: 0,
            geo_polygon: vertices.map((v) => ({
                lat: Number(v.lat),
                lng: Number(v.lng),
            })),
        };

        clearErrors();
        setSaving(true);
        router.post(route('floor-plan.setup'), payload, {
            preserveScroll: true,
            onError: (errs) => {
                setError(errs || {});
                const messages = Object.values(errs || {})
                    .flat()
                    .filter(Boolean);
                fireError(
                    messages[0] ||
                        'Не удалось сохранить. Проверьте поля формы.',
                );
            },
            onFinish: () => setSaving(false),
            onSuccess: () => {
                fireSuccess('Зал сохранён, открываем редактор…');
            },
        });
    };

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href={route('floor-plan.stores')}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold leading-tight text-white">
                            Настройка зала по карте
                        </h1>
                        <p className="text-xs text-slate-400">
                            Super Admin / Network Manager · Nominatim + Leaflet
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Настройка зала по карте" />

            <div className="mb-4 flex flex-wrap gap-2">
                {STEPS.map((item) => {
                    const locked = item.id > furthestStep;
                    const done = item.id < step && item.id <= furthestStep;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            disabled={locked}
                            onClick={() => goToStep(item.id)}
                            title={
                                locked
                                    ? 'Сначала завершите предыдущий шаг'
                                    : undefined
                            }
                            className={clsx(
                                'rounded-full px-3 py-1 text-xs font-medium transition',
                                step === item.id
                                    ? 'bg-indigo-600 text-white'
                                    : locked
                                      ? 'cursor-not-allowed bg-slate-900/80 text-slate-600 ring-1 ring-slate-800'
                                      : done
                                        ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                            )}
                        >
                            {item.id}. {item.title}
                        </button>
                    );
                })}
            </div>
            <p className="mb-4 text-xs text-slate-500">
                Шаг {step} из {STEPS.length}
                {furthestStep < STEPS.length
                    ? ' — следующие шаги откроются после текущего'
                    : ''}
            </p>

            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
                <div className="space-y-4">
                    {step === 1 ? (
                        <div className="rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800 sm:p-5">
                            <h2 className="text-sm font-semibold text-white">
                                Шаг 1 — Поиск магазина
                            </h2>
                            <p className="mt-1 text-xs text-slate-400">
                                Например: «Минск, Проспект Победителей, 12»
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <input
                                    className={inputClass + ' !mt-0 flex-1'}
                                    value={addressQuery}
                                    onChange={(e) =>
                                        setAddressQuery(e.target.value)
                                    }
                                    placeholder="Адрес здания"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            runGeocode();
                                        }
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={runGeocode}
                                    disabled={searching}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                                >
                                    {searching ? (
                                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <MagnifyingGlassIcon className="h-4 w-4" />
                                    )}
                                    Найти
                                </button>
                            </div>
                            {suggestions.length > 1 ? (
                                <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
                                    {suggestions.map((item, idx) => (
                                        <li key={`${item.latitude}-${idx}`}>
                                            <button
                                                type="button"
                                                className="w-full rounded-lg px-3 py-2 text-left text-slate-300 hover:bg-slate-800"
                                                onClick={() => {
                                                    applySearchResult(item);
                                                    advanceTo(2);
                                                }}
                                            >
                                                {item.display_name}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ) : null}

                    {step >= 2 ? (
                        <div className="rounded-xl bg-[#152033] p-3 ring-1 ring-slate-800 sm:p-4">
                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        {step === 2 && 'Шаг 2 — Карта'}
                                        {step === 3 &&
                                            'Шаг 3 — Рисование границ'}
                                        {step === 4 &&
                                            'Шаг 4 — Размеры и север'}
                                        {step === 5 &&
                                            'Шаг 5 — Правка углов'}
                                    </h2>
                                    <p className="text-xs text-slate-400">
                                        {mapMode === 'draw'
                                            ? `Клики по углам · ${vertices.length}/50`
                                            : mapMode === 'edit'
                                              ? 'Перетаскивайте углы полигона'
                                              : 'Выберите слой и начните рисовать'}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <div className="inline-flex rounded-lg bg-[#0e172b] p-1 ring-1 ring-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => setLayer('osm')}
                                            className={clsx(
                                                'rounded-md px-2.5 py-1 text-xs',
                                                layer === 'osm'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400',
                                            )}
                                        >
                                            OSM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLayer('satellite')}
                                            className={clsx(
                                                'rounded-md px-2.5 py-1 text-xs',
                                                layer === 'satellite'
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-slate-400',
                                            )}
                                        >
                                            Спутник
                                        </button>
                                    </div>
                                    {step === 2 && mapMode !== 'draw' ? (
                                        <button
                                            type="button"
                                            onClick={startDrawing}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                        >
                                            <PencilSquareIcon className="h-4 w-4" />
                                            Нарисовать границы
                                        </button>
                                    ) : null}
                                    {step === 3 && mapMode === 'draw' ? (
                                        <button
                                            type="button"
                                            onClick={finishDrawing}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                                        >
                                            <CheckIcon className="h-4 w-4" />
                                            Завершить
                                        </button>
                                    ) : null}
                                    {step === 3 && mapMode !== 'draw' ? (
                                        <button
                                            type="button"
                                            onClick={startDrawing}
                                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                                        >
                                            <PencilSquareIcon className="h-4 w-4" />
                                            Нарисовать заново
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            <HallBoundaryMap
                                center={center}
                                zoom={zoom}
                                recenterToken={recenterToken}
                                layer={layer}
                                mode={mapMode}
                                searchMarker={searchMarker}
                                vertices={vertices}
                                onAddVertex={onAddVertex}
                                onMoveVertex={onMoveVertex}
                                heightClass="h-[480px]"
                            />

                            {step === 4 ? (
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#0e172b] px-3 py-3 text-sm text-slate-300">
                                    <div>
                                        <p>
                                            Ширина (X):{' '}
                                            <span className="font-semibold text-white">
                                                {metrics.width_meters} м
                                            </span>
                                        </p>
                                        <p>
                                            Длина (Y, север ↑):{' '}
                                            <span className="font-semibold text-white">
                                                {metrics.height_meters} м
                                            </span>
                                        </p>
                                        <p>
                                            Площадь:{' '}
                                            <span className="font-semibold text-white">
                                                {metrics.area_sqm} м²
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={confirmSizes}
                                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                                    >
                                        Подтвердить
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-sm text-slate-500">
                            <div className="text-center">
                                <MapIcon className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                Найдите адрес, чтобы открыть карту
                            </div>
                        </div>
                    )}
                </div>

                <aside className="space-y-4">
                    <form
                        onSubmit={submit}
                        noValidate
                        className={clsx(
                            'rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800',
                            step < 5 && 'opacity-70',
                        )}
                    >
                        <h3 className="text-sm font-semibold text-white">
                            Параметры зала
                        </h3>
                        {step < 5 ? (
                            <p className="mt-2 rounded-lg bg-[#0e172b] px-3 py-2 text-xs text-amber-200/90 ring-1 ring-amber-500/30">
                                Форма откроется на шаге 5. Сейчас: шаг {step} —
                                {
                                    {
                                        1: 'найдите адрес',
                                        2: 'откройте карту и нарисуйте границы',
                                        3: 'отметьте углы здания и нажмите «Завершить»',
                                        4: 'проверьте размеры и нажмите «Подтвердить»',
                                    }[step]
                                }
                                .
                            </p>
                        ) : (
                            <p className="mt-1 text-xs text-slate-400">
                                Проверьте параметры и сохраните зал.
                            </p>
                        )}

                        <fieldset
                            disabled={step < 5}
                            className="min-w-0 disabled:pointer-events-none"
                        >
                        <label className="mt-3 block text-xs text-slate-400">
                            Магазин
                            <select
                                className={inputClass}
                                value={data.store_id}
                                onChange={(e) =>
                                    setData('store_id', e.target.value)
                                }
                                required
                            >
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                            {errors.store_id ? (
                                <p className="mt-1 text-rose-400">
                                    {errors.store_id}
                                </p>
                            ) : null}
                        </label>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <label className="block text-xs text-slate-400">
                                Ширина, м
                                <input
                                    type="number"
                                    min={5}
                                    max={500}
                                    step="0.1"
                                    className={inputClass}
                                    value={data.width_meters}
                                    onChange={(e) =>
                                        setData('width_meters', e.target.value)
                                    }
                                    onBlur={(e) =>
                                        setData(
                                            'width_meters',
                                            round1(e.target.value),
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-xs text-slate-400">
                                Длина, м
                                <input
                                    type="number"
                                    min={5}
                                    max={500}
                                    step="0.1"
                                    className={inputClass}
                                    value={data.height_meters}
                                    onChange={(e) =>
                                        setData('height_meters', e.target.value)
                                    }
                                    onBlur={(e) =>
                                        setData(
                                            'height_meters',
                                            round1(e.target.value),
                                        )
                                    }
                                />
                            </label>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Значения с карты округляются до 0.1 м (например
                            103.1).
                        </p>

                        <p className="mt-2 text-[11px] text-slate-500">
                            Север карты = вверх. Начало координат зала — юго-запад
                            (0,0). Углов: {vertices.length}
                            {metrics.area_sqm
                                ? ` · ${metrics.area_sqm} м²`
                                : ''}
                        </p>
                        {errors.geo_polygon ? (
                            <p className="mt-1 text-sm text-rose-400">
                                {errors.geo_polygon}
                            </p>
                        ) : null}

                        <div className="mt-3 grid gap-2">
                            <label className="block text-xs text-slate-400">
                                Сторона входа
                                <select
                                    className={inputClass}
                                    value={data.entrance_side}
                                    onChange={(e) =>
                                        setData('entrance_side', e.target.value)
                                    }
                                >
                                    {Object.entries(sides).map(([v, label]) => (
                                        <option key={v} value={v}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-xs text-slate-400">
                                Отступ входа, м
                                <input
                                    type="number"
                                    min={0}
                                    max={wallLength}
                                    step="0.1"
                                    className={inputClass}
                                    value={data.entrance_offset_m}
                                    onChange={(e) =>
                                        setData(
                                            'entrance_offset_m',
                                            e.target.value,
                                        )
                                    }
                                    onBlur={(e) =>
                                        setData(
                                            'entrance_offset_m',
                                            round1(e.target.value),
                                        )
                                    }
                                />
                            </label>
                            <label className="block text-xs text-slate-400">
                                Ширина входа, м
                                <input
                                    type="number"
                                    min={0.5}
                                    max={50}
                                    step="0.1"
                                    className={inputClass}
                                    value={data.entrance_width_m}
                                    onChange={(e) =>
                                        setData(
                                            'entrance_width_m',
                                            e.target.value,
                                        )
                                    }
                                    onBlur={(e) =>
                                        setData(
                                            'entrance_width_m',
                                            round1(e.target.value),
                                        )
                                    }
                                />
                            </label>
                        </div>

                        <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                className="rounded border-slate-600 bg-slate-900 text-indigo-500"
                                checked={!!data.has_cash_registers}
                                onChange={(e) =>
                                    setData(
                                        'has_cash_registers',
                                        e.target.checked,
                                    )
                                }
                            />
                            Кассы
                        </label>

                        {data.has_cash_registers ? (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                                <label className="block text-xs text-slate-400">
                                    Сторона
                                    <select
                                        className={inputClass}
                                        value={data.cash_side}
                                        onChange={(e) =>
                                            setData('cash_side', e.target.value)
                                        }
                                    >
                                        {Object.entries(sides).map(
                                            ([v, label]) => (
                                                <option key={v} value={v}>
                                                    {label}
                                                </option>
                                            ),
                                        )}
                                    </select>
                                </label>
                                <label className="block text-xs text-slate-400">
                                    Кол-во
                                    <input
                                        type="number"
                                        min={1}
                                        max={40}
                                        className={inputClass}
                                        value={data.cash_count}
                                        onChange={(e) =>
                                            setData('cash_count', e.target.value)
                                        }
                                    />
                                </label>
                            </div>
                        ) : null}

                        {step === 5 && saveBlockers.length > 0 ? (
                            <ul className="mt-3 space-y-1 rounded-lg bg-rose-950/40 px-3 py-2 text-xs text-rose-300 ring-1 ring-rose-500/30">
                                {saveBlockers.map((msg) => (
                                    <li key={msg}>{msg}</li>
                                ))}
                            </ul>
                        ) : null}

                        {Object.keys(errors).length > 0 ? (
                            <ul className="mt-3 space-y-1 text-xs text-rose-400">
                                {Object.entries(errors).map(([key, msg]) => (
                                    <li key={key}>
                                        {typeof msg === 'string'
                                            ? msg
                                            : String(msg)}
                                    </li>
                                ))}
                            </ul>
                        ) : null}

                        <button
                            type="submit"
                            disabled={!canSave || processing || saving}
                            className={clsx(
                                'mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition',
                                canSave && !processing && !saving
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                                    : 'cursor-not-allowed bg-slate-800 text-slate-500 ring-1 ring-slate-700',
                            )}
                        >
                            {processing || saving
                                ? 'Сохранение…'
                                : canSave
                                  ? 'Сохранить и открыть редактор'
                                  : 'Сохранение недоступно'}
                        </button>
                        </fieldset>
                    </form>
                </aside>
            </div>
        </AdminLayout>
    );
}
