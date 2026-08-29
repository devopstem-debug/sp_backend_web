import { XMarkIcon } from '@heroicons/react/24/outline';
import { useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import ProductSearch from '@/Components/Planogram/ProductSearch';
import ShelfLevelPicker from '@/Components/Planogram/ShelfLevelPicker';
import FacingsStepper from '@/Components/Planogram/FacingsStepper';
import { fireError, fireSuccess } from '@/lib/swal';

function occupiedCm(widthMm, facings) {
    const width = Number(widthMm) || 0;
    const count = Number(facings) || 0;
    return Math.round((width / 10) * count * 100) / 100;
}

function freeCm(shelf, levelId) {
    if (!shelf || !levelId) {
        return 0;
    }

    const level = shelf.levels.find((item) => item.id === levelId);
    if (!level) {
        return Number(shelf.width_cm) || 0;
    }

    // Совпадает с PlacementService::nextStartCm — место после последнего end_cm.
    const used = (level.placements || []).reduce(
        (max, placement) => Math.max(max, Number(placement.end_cm) || 0),
        0,
    );

    return Math.max(0, Math.round((Number(shelf.width_cm) - used) * 100) / 100);
}

export default function AddPlacementModal({
    shelf,
    initialLevelId = null,
    onClose,
    onAdded,
}) {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const equipmentType =
        shelf?.type === 'cooler'
            ? 'cooler'
            : shelf?.type === 'stand'
              ? 'stand'
              : 'shelf';

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            equipment_type: equipmentType,
            equipment_id: shelf?.id || '',
            product_id: '',
            level_id: initialLevelId || shelf.levels[0]?.id || '',
            shelf_level_id: initialLevelId || shelf.levels[0]?.id || '',
            facings: 1,
        });

    const space = useMemo(() => {
        const widthMm = selectedProduct?.width_mm ?? 0;
        const needed = occupiedCm(widthMm, data.facings);
        const free = freeCm(shelf, data.level_id || data.shelf_level_id);

        return {
            widthMm,
            needed,
            free,
            overflows: selectedProduct && widthMm > 0 ? needed > free : false,
            missingWidth: selectedProduct && !(Number(widthMm) > 0),
        };
    }, [selectedProduct, data.facings, data.level_id, data.shelf_level_id, shelf]);

    const selectProduct = (product) => {
        setSelectedProduct(product);
        setData('product_id', product?.id || '');
        clearErrors('product_id');
    };

    const submit = (e) => {
        e.preventDefault();

        if (!data.product_id) {
            fireError('Выберите товар.');
            return;
        }

        if (!data.level_id && !data.shelf_level_id) {
            fireError('Выберите полку.');
            return;
        }

        if (space.missingWidth) {
            fireError(
                'У товара не указана ширина (мм). Сначала заполните габариты в каталоге или через бота.',
            );
            return;
        }

        if (space.overflows) {
            fireError(
                `Нельзя превысить ширину полки (${shelf.width_cm} см). Свободно: ${space.free} см, нужно: ${space.needed} см.`,
            );
            return;
        }

        post(route('planograms.placements.store'), {
            preserveScroll: true,
            onSuccess: () => {
                fireSuccess('Товар размещён');
                reset();
                setSelectedProduct(null);
                onAdded?.();
                onClose();
            },
            onError: (formErrors) => {
                fireError(
                    formErrors.facings ||
                        formErrors.product_id ||
                        formErrors.level_id ||
                        formErrors.shelf_level_id ||
                        'Не удалось добавить товар.',
                );
            },
        });
    };

    const equipmentLabel =
        equipmentType === 'cooler'
            ? 'Холодильник'
            : equipmentType === 'stand'
              ? 'Стойка'
              : 'Стеллаж';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-[#152033] p-6 shadow-xl">
                <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                        Добавить товар
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:bg-[#0e172b] hover:text-white"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-5">
                    <ProductSearch
                        value={selectedProduct}
                        onChange={selectProduct}
                        error={errors.product_id}
                    />

                    <ShelfLevelPicker
                        levels={shelf.levels}
                        value={data.level_id || data.shelf_level_id}
                        onChange={(id) => {
                            setData('level_id', id);
                            setData('shelf_level_id', id);
                        }}
                        error={errors.level_id || errors.shelf_level_id}
                    />

                    <FacingsStepper
                        value={data.facings}
                        onChange={(next) => setData('facings', next)}
                        error={errors.facings}
                    />

                    <div className="rounded-xl border border-slate-800 bg-[#0e172b] px-3 py-2.5 text-sm text-slate-200">
                        <p>
                            {equipmentLabel}:{' '}
                            <span className="font-semibold">
                                {shelf.width_m
                                    ? `${shelf.width_m} м`
                                    : `${shelf.width_cm} см`}
                            </span>
                            <span className="text-slate-400">
                                {' '}
                                · свободно {space.free} см
                            </span>
                        </p>
                        <p>
                            Ширина товара:{' '}
                            <span className="font-semibold">
                                {selectedProduct
                                    ? `${space.widthMm || '—'} мм`
                                    : '—'}
                            </span>
                        </p>
                        <p>
                            Фейсинг:{' '}
                            <span className="font-semibold">{data.facings}</span>
                        </p>
                        <p>
                            Занимаемое место:{' '}
                            <span
                                className={
                                    space.overflows
                                        ? 'font-semibold text-rose-400'
                                        : 'font-semibold'
                                }
                            >
                                {selectedProduct && space.widthMm
                                    ? `${space.needed} см`
                                    : '—'}
                            </span>
                        </p>
                        {space.missingWidth ? (
                            <p className="mt-1 text-xs text-amber-300">
                            Нет ширины у товара — сначала укажите ширину (мм)
                            в каталоге или через бота.
                            </p>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-400">
                            Формула: (ширина мм ÷ 10) × фейсинг ≤ длина стеллажа
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={
                            processing ||
                            !data.product_id ||
                            !data.shelf_level_id ||
                            space.overflows ||
                            space.missingWidth
                        }
                        className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? 'Добавление…' : 'Добавить'}
                    </button>
                </form>
            </div>
        </div>
    );
}
