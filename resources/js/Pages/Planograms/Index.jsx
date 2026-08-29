import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    PencilSquareIcon,
    PlusIcon,
    PrinterIcon,
    Squares2X2Icon,
    TableCellsIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AddPlacementModal from '@/Components/Planogram/AddPlacementModal';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const selectClass =
    'rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

function formatWidthLabel(cm, meters) {
    const m = meters ?? (cm ? Math.round((Number(cm) / 100) * 100) / 100 : null);
    if (m != null && !Number.isNaN(m)) {
        return `${m} м (${Math.round(Number(cm))} см)`;
    }
    return cm ? `${Math.round(Number(cm))} см` : '—';
}

function FillBar({ percent, overflow }) {
    const capped = Math.min(100, Math.max(0, Number(percent) || 0));
    return (
        <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Заполнение</span>
                <span
                    className={clsx(
                        'font-semibold',
                        overflow ? 'text-rose-400' : percent >= 85 ? 'text-amber-300' : 'text-emerald-300',
                    )}
                >
                    {overflow
                        ? `Переполнено: ${percent}% от ширины`
                        : `${percent}%`}
                </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                    className={clsx(
                        'h-full rounded-full transition-all duration-500',
                        overflow
                            ? 'bg-rose-500'
                            : percent >= 85
                              ? 'bg-amber-400'
                              : 'bg-emerald-500',
                    )}
                    style={{ width: `${overflow ? 100 : capped}%` }}
                />
            </div>
        </div>
    );
}

function ProductCard({ placement, canDelete, onRemove }) {
    const color = placement.zone_color || '#6366f1';

    return (
        <div
            className="group relative min-w-[148px] max-w-[180px] shrink-0 rounded-lg border border-transparent bg-slate-800 p-3 shadow-sm transition duration-200 hover:border-indigo-400/50 hover:shadow-indigo-500/10"
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
        >
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                {canDelete ? (
                    <button
                        type="button"
                        onClick={() => onRemove(placement)}
                        className="rounded-md bg-slate-900/90 p-1 text-slate-300 hover:bg-rose-500/20 hover:text-rose-300"
                        title="Удалить"
                    >
                        <XMarkIcon className="h-3.5 w-3.5" />
                    </button>
                ) : null}
                <span
                    className="rounded-md bg-slate-900/90 p-1 text-slate-500"
                    title="Редактирование фейсинга — скоро"
                >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                </span>
            </div>

            <p className="pr-10 text-sm font-medium leading-snug text-white line-clamp-2">
                {placement.product_name || 'Без названия'}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">
                {placement.product_volume_ml
                    ? `${placement.product_volume_ml} мл`
                    : placement.product_package_type || '—'}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-300">
                <span>Фейс ×{placement.facings}</span>
                <span>{placement.width_mm ? `${placement.width_mm} мм` : '—'}</span>
                <span className="text-slate-500">
                    {placement.occupied_cm != null
                        ? `${placement.occupied_cm} см`
                        : ''}
                </span>
            </div>
        </div>
    );
}

function ShelfLevelCard({
    level,
    shelfWidthCm,
    canEdit,
    canDelete,
    onAdd,
    onRemove,
    index,
}) {
    const placements = level.placements || [];
    const empty = placements.length === 0;

    return (
        <section
            className={clsx(
                'planogram-level-enter rounded-xl bg-slate-900 p-4 ring-1 transition duration-300',
                level.overflow
                    ? 'ring-rose-500/50'
                    : 'ring-slate-800 hover:ring-slate-700',
            )}
            style={{ animationDelay: `${index * 60}ms` }}
        >
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                        Полка {level.level_number}
                        <span className="ml-2 font-normal normal-case text-slate-400">
                            ({Math.round(shelfWidthCm)} см)
                        </span>
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Занято {level.used_cm ?? 0} см · свободно{' '}
                        {level.free_cm ?? Math.max(0, shelfWidthCm - (level.used_cm || 0))} см
                    </p>
                </div>
                {canEdit ? (
                    <button
                        type="button"
                        onClick={() => onAdd(level.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                        <PlusIcon className="h-3.5 w-3.5" />
                        Добавить
                    </button>
                ) : null}
            </div>

            <FillBar percent={level.fill_percent ?? 0} overflow={level.overflow} />

            {level.overflow ? (
                <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300">
                    Переполнено: {level.fill_percent}% от ширины полки. Уберите
                    товар или уменьшите фейсинг.
                </p>
            ) : null}

            {empty ? (
                <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">Пусто — добавьте товар</p>
                    {canEdit ? (
                        <button
                            type="button"
                            onClick={() => onAdd(level.id)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-indigo-300 hover:bg-slate-700 hover:text-indigo-200"
                        >
                            <PlusIcon className="h-4 w-4" />
                            Добавить
                        </button>
                    ) : null}
                </div>
            ) : (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                    {placements.map((placement) => (
                        <ProductCard
                            key={placement.id}
                            placement={placement}
                            canDelete={canDelete}
                            onRemove={onRemove}
                        />
                    ))}
                    {canEdit ? (
                        <button
                            type="button"
                            onClick={() => onAdd(level.id)}
                            className="flex min-w-[120px] shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-800/40 p-3 text-xs font-medium text-slate-400 transition hover:border-indigo-400/40 hover:text-indigo-300"
                        >
                            <PlusIcon className="mb-1 h-5 w-5" />
                            Добавить
                        </button>
                    ) : null}
                </div>
            )}
        </section>
    );
}

function TableView({ shelf, canDelete, onRemove }) {
    const rows = (shelf.levels || []).flatMap((level) =>
        (level.placements || []).map((p) => ({ ...p, level_number: level.level_number })),
    );

    if (rows.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center text-sm text-slate-400">
                На этом стеллаже пока нет товаров.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl ring-1 ring-slate-800">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-800 text-sm">
                    <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                            <th className="px-3 py-2.5">Полка</th>
                            <th className="px-3 py-2.5">Товар</th>
                            <th className="px-3 py-2.5">Объём</th>
                            <th className="px-3 py-2.5">Фейс</th>
                            <th className="px-3 py-2.5">Ширина</th>
                            <th className="px-3 py-2.5">Место</th>
                            <th className="px-3 py-2.5" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {rows.map((row) => (
                            <tr key={row.id} className="text-slate-200">
                                <td className="px-3 py-2.5">{row.level_number}</td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                background: row.zone_color || '#6366f1',
                                            }}
                                        />
                                        <span className="font-medium text-white">
                                            {row.product_name}
                                        </span>
                                    </div>
                                    <p className="font-mono text-[11px] text-slate-500">
                                        {row.product_barcode}
                                    </p>
                                </td>
                                <td className="px-3 py-2.5">
                                    {row.product_volume_ml
                                        ? `${row.product_volume_ml} мл`
                                        : '—'}
                                </td>
                                <td className="px-3 py-2.5">×{row.facings}</td>
                                <td className="px-3 py-2.5">
                                    {row.width_mm ? `${row.width_mm} мм` : '—'}
                                </td>
                                <td className="px-3 py-2.5">{row.occupied_cm} см</td>
                                <td className="px-3 py-2.5 text-right">
                                    {canDelete ? (
                                        <button
                                            type="button"
                                            onClick={() => onRemove(row)}
                                            className="text-xs text-rose-300 hover:text-rose-200"
                                        >
                                            Удалить
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function Index({
    stores = [],
    tree = [],
    activeEquipment = null,
    activeShelf = null,
    filters = {},
}) {
    const shelf = activeEquipment || activeShelf;
    const { flash } = usePage().props;
    const can = useCan();
    const canEdit = can('create-planograms', 'edit-planograms');
    const canDelete = can('delete-planograms');

    const [viewMode, setViewMode] = useState('cards');
    const [modalLevelId, setModalLevelId] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const storeId = filters.store_id || stores[0]?.id || '';

    const departments = useMemo(
        () =>
            (tree || []).map((d) => ({
                id: d.id,
                name: d.name,
                code: d.code,
                color: d.color,
                shelves: d.shelves || [],
                coolers: d.coolers || [],
                stands: d.stands || [],
            })),
        [tree],
    );

    const selectedDepartmentId = useMemo(() => {
        if (shelf?.department_id) {
            return shelf.department_id;
        }
        const fromEquip = departments.find(
            (d) =>
                d.shelves.some((s) => s.id === filters.shelf_id) ||
                d.coolers.some((s) => s.id === filters.cooler_id) ||
                d.stands.some((s) => s.id === filters.stand_id),
        );
        return fromEquip?.id || departments[0]?.id || '';
    }, [shelf, departments, filters.shelf_id, filters.cooler_id, filters.stand_id]);

    const equipmentInDept = useMemo(() => {
        const dept = departments.find((d) => d.id === selectedDepartmentId);
        if (!dept) return [];
        return [
            ...(dept.shelves || []).map((item) => ({
                ...item,
                type: 'shelf',
                label: `Стеллаж · ${item.code}`,
            })),
            ...(dept.coolers || []).map((item) => ({
                ...item,
                type: 'cooler',
                label: `Холодильник · ${item.code}`,
            })),
            ...(dept.stands || []).map((item) => ({
                ...item,
                type: 'stand',
                label: `Стойка · ${item.code}`,
            })),
        ];
    }, [departments, selectedDepartmentId]);

    const selectedEquipmentKey = useMemo(() => {
        if (filters.shelf_id) return `shelf:${filters.shelf_id}`;
        if (filters.cooler_id) return `cooler:${filters.cooler_id}`;
        if (filters.stand_id) return `stand:${filters.stand_id}`;
        if (shelf?.id && shelf?.type) return `${shelf.type}:${shelf.id}`;
        return '';
    }, [filters, shelf]);

    const navigate = (params) => {
        router.get(route('planograms.index'), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ['activeEquipment', 'activeShelf', 'filters', 'tree', 'stores'],
        });
    };

    useEffect(() => {
        if (flash?.success && flash.success !== 'Товар размещён') {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    // Автовыбор первого оборудования в отделе, если ещё не выбрано.
    useEffect(() => {
        if (
            !storeId ||
            filters.shelf_id ||
            filters.cooler_id ||
            filters.stand_id ||
            equipmentInDept.length === 0
        ) {
            return;
        }
        const first = equipmentInDept[0];
        const params = { store_id: storeId };
        if (first.type === 'shelf') params.shelf_id = first.id;
        if (first.type === 'cooler') params.cooler_id = first.id;
        if (first.type === 'stand') params.stand_id = first.id;
        navigate(params);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, filters.shelf_id, filters.cooler_id, filters.stand_id, equipmentInDept]);

    const handleStoreChange = (nextStoreId) => {
        navigate({ store_id: nextStoreId || undefined });
    };

    const handleDepartmentChange = (deptId) => {
        const dept = departments.find((d) => d.id === deptId);
        const params = { store_id: storeId || undefined };
        if (dept?.shelves?.[0]) {
            params.shelf_id = dept.shelves[0].id;
        } else if (dept?.coolers?.[0]) {
            params.cooler_id = dept.coolers[0].id;
        } else if (dept?.stands?.[0]) {
            params.stand_id = dept.stands[0].id;
        }
        navigate(params);
    };

    const handleEquipmentChange = (value) => {
        const [type, id] = String(value).split(':');
        const params = { store_id: storeId || undefined };
        if (type === 'shelf') params.shelf_id = id;
        if (type === 'cooler') params.cooler_id = id;
        if (type === 'stand') params.stand_id = id;
        navigate(params);
    };

    const openAdd = (levelId = null) => {
        setModalLevelId(levelId || shelf?.levels?.[0]?.id || null);
        setShowModal(true);
    };

    const removePlacement = async (placement) => {
        const confirmed = await fireConfirm(
            'Удалить размещение?',
            `«${placement.product_name}» будет убран с полки.`,
            'Удалить',
        );
        if (!confirmed) return;

        router.delete(route('planograms.placements.destroy', placement.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось удалить размещение.'),
        });
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        if (!shelf) {
            fireError('Сначала выберите стеллаж.');
            return;
        }

        const rows = [['Полка', 'Товар', 'Штрихкод', 'Объём мл', 'Фейсинг', 'Ширина мм', 'Место см']];
        (shelf.levels || []).forEach((level) => {
            (level.placements || []).forEach((p) => {
                rows.push([
                    level.level_number,
                    p.product_name || '',
                    p.product_barcode || '',
                    p.product_volume_ml || '',
                    p.facings || '',
                    p.width_mm || '',
                    p.occupied_cm || '',
                ]);
            });
        });

        const csv = rows
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(','),
            )
            .join('\n');

        const blob = new Blob(['\uFEFF' + csv], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planogram-${shelf.code || shelf.id}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const shelfWidthCm = Number(shelf?.width_cm) || 0;

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Планограммы
                </h1>
            }
        >
            <Head title="Планограммы">
                <style>{`
                    @keyframes planogramFadeUp {
                        from { opacity: 0; transform: translateY(8px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .planogram-level-enter {
                        animation: planogramFadeUp 0.35s ease-out both;
                    }
                    @media print {
                        aside, header, .no-print { display: none !important; }
                        body { background: white !important; color: black !important; }
                    }
                `}</style>
            </Head>

            <div className="space-y-4">
                <div className="no-print flex flex-wrap items-end gap-3 rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800">
                    <label className="min-w-[160px] flex-1 text-xs text-slate-400">
                        Магазин
                        <select
                            className={clsx(selectClass, 'mt-1 w-full')}
                            value={storeId}
                            onChange={(e) => handleStoreChange(e.target.value)}
                        >
                            {stores.length === 0 ? (
                                <option value="">Нет магазинов</option>
                            ) : null}
                            {stores.map((store) => (
                                <option key={store.id} value={store.id}>
                                    {store.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="min-w-[160px] flex-1 text-xs text-slate-400">
                        Отдел
                        <select
                            className={clsx(selectClass, 'mt-1 w-full')}
                            value={selectedDepartmentId}
                            onChange={(e) => handleDepartmentChange(e.target.value)}
                            disabled={departments.length === 0}
                        >
                            {departments.length === 0 ? (
                                <option value="">Нет отделов</option>
                            ) : null}
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.code !== '—' ? `${dept.code} — ` : ''}
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="min-w-[220px] flex-[1.2] text-xs text-slate-400">
                        Оборудование
                        <select
                            className={clsx(selectClass, 'mt-1 w-full')}
                            value={selectedEquipmentKey}
                            onChange={(e) => handleEquipmentChange(e.target.value)}
                            disabled={equipmentInDept.length === 0}
                        >
                            {equipmentInDept.length === 0 ? (
                                <option value="">Нет оборудования</option>
                            ) : null}
                            {equipmentInDept.map((item) => (
                                <option
                                    key={`${item.type}:${item.id}`}
                                    value={`${item.type}:${item.id}`}
                                >
                                    {item.label}
                                    {item.width_cm
                                        ? ` · ${formatWidthLabel(item.width_cm, item.width_m)}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <div className="inline-flex rounded-lg bg-[#0e172b] p-1 ring-1 ring-slate-800">
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={clsx(
                                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                                    viewMode === 'cards'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-white',
                                )}
                            >
                                <Squares2X2Icon className="h-4 w-4" />
                                Карточки
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={clsx(
                                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium',
                                    viewMode === 'table'
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-400 hover:text-white',
                                )}
                            >
                                <TableCellsIcon className="h-4 w-4" />
                                Таблица
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Печать
                        </button>
                        <button
                            type="button"
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Экспорт
                        </button>
                    </div>
                </div>

                {!shelf ? (
                    <div className="rounded-xl border border-dashed border-slate-700 px-4 py-16 text-center text-sm text-slate-400">
                        Выберите магазин, отдел и стеллаж, чтобы увидеть полки и
                        заполнение по ширине.
                    </div>
                ) : (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#152033] px-4 py-3 ring-1 ring-slate-800">
                            <div>
                                <p className="text-sm font-semibold text-white">
                                    {shelf.code} — {shelf.name}
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Длина стеллажа:{' '}
                                    <span className="font-medium text-slate-200">
                                        {formatWidthLabel(shelf.width_cm, shelf.width_m)}
                                    </span>
                                    {shelf.department_name
                                        ? ` · ${shelf.department_name}`
                                        : ''}
                                </p>
                            </div>
                            {canEdit ? (
                                <button
                                    type="button"
                                    onClick={() => openAdd()}
                                    disabled={!shelf.levels?.length}
                                    className="no-print inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                                >
                                    <PlusIcon className="h-4 w-4" />
                                    Добавить товар
                                </button>
                            ) : null}
                        </div>

                        {viewMode === 'cards' ? (
                            <div className="space-y-4">
                                {(shelf.levels || []).map((level, index) => (
                                    <ShelfLevelCard
                                        key={level.id}
                                        level={level}
                                        shelfWidthCm={shelfWidthCm}
                                        canEdit={canEdit}
                                        canDelete={canDelete}
                                        onAdd={openAdd}
                                        onRemove={removePlacement}
                                        index={index}
                                    />
                                ))}
                                {(shelf.levels || []).length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                                        У стеллажа нет полок (уровней).
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <TableView
                                shelf={shelf}
                                canDelete={canDelete}
                                onRemove={removePlacement}
                            />
                        )}
                    </>
                )}
            </div>

            {showModal && shelf && canEdit ? (
                <AddPlacementModal
                    shelf={shelf}
                    initialLevelId={modalLevelId}
                    onClose={() => {
                        setShowModal(false);
                        setModalLevelId(null);
                    }}
                    onAdded={() => {
                        setShowModal(false);
                        setModalLevelId(null);
                    }}
                />
            ) : null}
        </AdminLayout>
    );
}
