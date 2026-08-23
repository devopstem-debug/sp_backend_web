import { Head, Link, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess, fireToast } from '@/lib/swal';
import ProductForm, {
    buildProductFormData,
    validateProductForm,
} from './ProductForm';

function StepBadge({ step, current }) {
    const done = step < current;
    const active = step === current;

    return (
        <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                done
                    ? 'bg-emerald-500 text-white'
                    : active
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400'
            }`}
        >
            {done ? '✓' : step}
        </div>
    );
}

function mapOffToForm(barcode, off) {
    return {
        ...buildProductFormData(),
        barcode,
        name: off?.name || '',
        category: off?.category || '',
        volume_ml: off?.volume_ml ?? '',
        weight_g: off?.weight_g ?? '',
        package_type: off?.package_type || '',
        checked: true,
    };
}

export default function Create() {
    const { auth } = usePage().props;
    const allowPrivate = Boolean(auth?.user?.tenant_id);

    const [step, setStep] = useState(1);
    const [barcode, setBarcode] = useState('');
    const [barcodeError, setBarcodeError] = useState('');
    const [checking, setChecking] = useState(false);
    const [existing, setExisting] = useState(null);
    const [offSuggestion, setOffSuggestion] = useState(null);
    const [showManualForm, setShowManualForm] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform, reset } =
        useForm(buildProductFormData());

    const canCheck = useMemo(() => /^\d{13}$/.test(barcode), [barcode]);

    const goBackToBarcode = () => {
        setStep(1);
        setExisting(null);
        setOffSuggestion(null);
        setShowManualForm(false);
        setClientErrors({});
        reset();
        setData(buildProductFormData());
    };

    const checkBarcode = async (event) => {
        event.preventDefault();

        const value = barcode.replace(/\D/g, '').slice(0, 13);
        setBarcode(value);
        setExisting(null);
        setOffSuggestion(null);
        setShowManualForm(false);
        setBarcodeError('');

        if (!/^\d{13}$/.test(value)) {
            setBarcodeError('Штрихкод должен состоять из 13 цифр.');
            return;
        }

        setChecking(true);

        try {
            const { data: result } = await axios.get(
                route('products.barcode-lookup'),
                { params: { barcode: value } },
            );

            if (result.exists_locally && result.local_product) {
                setExisting(result.local_product);
                fireToast('warning', 'Товар уже есть в базе');
                return;
            }

            if (result.open_food_facts) {
                setData(mapOffToForm(value, result.open_food_facts));
                setOffSuggestion(result.open_food_facts);
                setShowManualForm(false);
                fireToast('success', 'Найдено в Open Food Facts');
            } else {
                setData({ ...buildProductFormData(), barcode: value });
                setOffSuggestion(null);
                setShowManualForm(true);
                fireToast('success', 'Штрихкод свободен — заполните карточку');
            }

            setStep(2);
        } catch (error) {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.errors?.barcode?.[0] ||
                'Не удалось проверить штрихкод.';
            setBarcodeError(message);
            fireError(message);
        } finally {
            setChecking(false);
        }
    };

    const applyOffToForm = () => {
        if (!offSuggestion) {
            return;
        }

        setData(mapOffToForm(barcode, offSuggestion));
        setShowManualForm(true);
    };

    const confirmOffAndCreate = () => {
        if (!offSuggestion?.name) {
            fireError(
                'В Open Food Facts нет названия — отредактируйте карточку вручную.',
            );
            setShowManualForm(true);
            return;
        }

        const payload = mapOffToForm(barcode, offSuggestion);
        setData(payload);
        setConfirming(true);

        transform(() => ({
            ...payload,
            volume_ml: payload.volume_ml === '' ? null : payload.volume_ml,
            width_mm: null,
            height_mm: null,
            depth_mm: null,
            weight_g: payload.weight_g === '' ? null : payload.weight_g,
            package_type: payload.package_type || null,
            category: payload.category || null,
            checked: true,
        }));

        post(route('products.store'), {
            onSuccess: () => fireSuccess('Товар добавлен из Open Food Facts.'),
            onError: () => {
                fireError(
                    'Не удалось создать товар. Проверьте поля и попробуйте вручную.',
                );
                setShowManualForm(true);
            },
            onFinish: () => setConfirming(false),
        });
    };

    const submitManual = (event) => {
        event.preventDefault();

        const nextErrors = validateProductForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            volume_ml: form.volume_ml === '' ? null : form.volume_ml,
            width_mm: form.width_mm === '' ? null : form.width_mm,
            height_mm: form.height_mm === '' ? null : form.height_mm,
            depth_mm: form.depth_mm === '' ? null : form.depth_mm,
            weight_g: form.weight_g === '' ? null : form.weight_g,
            package_type: form.package_type || null,
            category: form.category || null,
        }));

        post(route('products.store'), {
            onSuccess: () => fireSuccess('Товар создан.'),
            onError: () => fireError('Не удалось создать товар.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый товар
                </h1>
            }
        >
            <Head title="Новый товар" />

            <div className="mb-6 flex flex-wrap items-center gap-3">
                <StepBadge step={1} current={step} />
                <span className="text-sm text-slate-300">Штрихкод</span>
                <div className="h-px w-8 bg-slate-700" />
                <StepBadge step={2} current={step} />
                <span className="text-sm text-slate-300">Карточка товара</span>
            </div>

            {step === 1 && (
                <form
                    onSubmit={checkBarcode}
                    className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800"
                    noValidate
                >
                    <h2 className="text-base font-semibold text-white">
                        Шаг 1. Проверка штрихкода
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Сначала проверим локальную базу. Если товара нет — поищем в
                        Open Food Facts.
                    </p>

                    <div className="mt-5 max-w-xl">
                        <label
                            htmlFor="lookup_barcode"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Штрихкод (EAN-13){' '}
                            <span className="text-red-400">*</span>
                        </label>
                        <div className="mt-1 flex flex-col gap-3 sm:flex-row">
                            <input
                                id="lookup_barcode"
                                type="text"
                                inputMode="numeric"
                                maxLength={13}
                                value={barcode}
                                autoFocus
                                onChange={(e) => {
                                    setBarcode(
                                        e.target.value
                                            .replace(/\D/g, '')
                                            .slice(0, 13),
                                    );
                                    setExisting(null);
                                    setBarcodeError('');
                                }}
                                className={`block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
                                    barcodeError
                                        ? 'border-red-400 focus:border-red-500'
                                        : 'border-slate-700 focus:border-indigo-500'
                                }`}
                                placeholder="4810014018641"
                            />
                            <button
                                type="submit"
                                disabled={checking || !canCheck}
                                className="inline-flex shrink-0 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {checking ? 'Проверка…' : 'Проверить'}
                            </button>
                        </div>
                        {barcodeError && (
                            <p className="mt-1.5 text-sm text-red-400">
                                {barcodeError}
                            </p>
                        )}
                        <p className="mt-1.5 text-xs text-slate-500">
                            Нужно ровно 13 цифр. Сейчас: {barcode.length}/13
                        </p>
                    </div>

                    {existing && (
                        <div className="mt-5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                            <p className="text-sm font-semibold text-amber-200">
                                Товар уже в базе
                            </p>
                            <p className="mt-1 text-sm text-amber-100/90">
                                {existing.name}
                                {existing.category
                                    ? ` · ${existing.category}`
                                    : ''}
                            </p>
                            <Link
                                href={existing.edit_url}
                                className="mt-3 inline-flex text-sm font-semibold text-indigo-300 underline hover:text-indigo-200"
                            >
                                Открыть редактирование →
                            </Link>
                        </div>
                    )}

                    <div className="mt-6">
                        <Link
                            href={route('products.index')}
                            className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                        >
                            К списку товаров
                        </Link>
                    </div>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-4">
                    {offSuggestion && !showManualForm && (
                        <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                                        Найдено в Open Food Facts
                                    </p>
                                    <h2 className="mt-1 text-lg font-semibold text-white">
                                        {offSuggestion.name || 'Без названия'}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-400">
                                        Штрихкод: {barcode}
                                        {offSuggestion.brand
                                            ? ` · ${offSuggestion.brand}`
                                            : ''}
                                        {offSuggestion.category
                                            ? ` · ${offSuggestion.category}`
                                            : ''}
                                        {offSuggestion.quantity
                                            ? ` · ${offSuggestion.quantity}`
                                            : ''}
                                    </p>
                                </div>
                                {offSuggestion.image_url && (
                                    <img
                                        src={offSuggestion.image_url}
                                        alt={offSuggestion.name || 'product'}
                                        className="h-24 w-24 rounded-lg bg-white/90 object-contain p-1"
                                    />
                                )}
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={confirmOffAndCreate}
                                    disabled={confirming || processing}
                                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
                                >
                                    {confirming || processing
                                        ? 'Добавление…'
                                        : 'Подтвердить и добавить'}
                                </button>
                                <button
                                    type="button"
                                    onClick={applyOffToForm}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900/40 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
                                >
                                    Редактировать перед сохранением
                                </button>
                                <button
                                    type="button"
                                    onClick={goBackToBarcode}
                                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white"
                                >
                                    ← Другой штрихкод
                                </button>
                            </div>

                            {offSuggestion.source_url && (
                                <a
                                    href={offSuggestion.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-block text-xs text-indigo-300 underline"
                                >
                                    Открыть в Open Food Facts
                                </a>
                            )}
                        </div>
                    )}

                    {(showManualForm || !offSuggestion) && (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-slate-700 bg-[#101a2b] px-4 py-3 text-sm text-slate-300">
                                Штрихкод{' '}
                                <span className="font-mono text-white">
                                    {barcode}
                                </span>{' '}
                                свободен. Обязательны только штрихкод и название.
                            </div>

                            <ProductForm
                                data={data}
                                setData={setData}
                                errors={errors}
                                clientErrors={clientErrors}
                                processing={processing}
                                submitLabel="Создать товар"
                                onSubmit={submitManual}
                                barcodeLocked
                                allowPrivate={allowPrivate}
                                footerLeft={
                                    <button
                                        type="button"
                                        onClick={goBackToBarcode}
                                        className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                                    >
                                        ← Назад к штрихкоду
                                    </button>
                                }
                            />
                        </div>
                    )}
                </div>
            )}
        </AdminLayout>
    );
}
