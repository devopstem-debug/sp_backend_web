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

export function buildShelfFormData(
    shelf = null,
    selectedStoreId = null,
    selectedDepartmentId = null,
) {
    return {
        store_id: shelf?.store_id ?? selectedStoreId ?? '',
        department_id: shelf?.department_id ?? selectedDepartmentId ?? '',
        code: shelf?.code ?? '',
        name: shelf?.name ?? '',
        shelf_count: shelf?.shelf_count ?? 5,
        width_mm: shelf?.width_mm ?? 1500,
        height_mm: shelf?.height_mm ?? 1600,
        depth_mm: shelf?.depth_mm ?? 700,
    };
}

export function validateShelfForm(data) {
    const errors = {};

    if (!data.store_id) {
        errors.store_id = 'Выберите магазин.';
    }

    if (!data.department_id) {
        errors.department_id = 'Выберите отдел.';
    }

    const shelfCount = Number(data.shelf_count);
    if (
        data.shelf_count === '' ||
        data.shelf_count === null ||
        data.shelf_count === undefined
    ) {
        errors.shelf_count = 'Укажите количество этажей.';
    } else if (!Number.isInteger(shelfCount) || shelfCount < 3 || shelfCount > 7) {
        errors.shelf_count = 'Этажи: целое число от 3 до 7.';
    }

    for (const [field, label, min, max] of [
        ['width_mm', 'Ширина', 100, 10000],
        ['height_mm', 'Высота', 100, 10000],
        ['depth_mm', 'Глубина', 100, 5000],
    ]) {
        const value = Number(data[field]);
        if (
            data[field] === '' ||
            data[field] === null ||
            data[field] === undefined
        ) {
            errors[field] = `Укажите ${label.toLowerCase()}.`;
        } else if (!Number.isInteger(value) || value < min || value > max) {
            errors[field] = `${label}: целое число от ${min} до ${max}.`;
        }
    }

    return errors;
}

export default function ShelfForm({
    data,
    setData,
    errors = {},
    clientErrors = {},
    processing = false,
    stores = [],
    departments = [],
    suggestedCode = null,
    submitLabel = 'Сохранить',
    onSubmit,
    onStoreChange,
    onDepartmentChange,
    codeReadonly = true,
    levelsLocked = false,
}) {
    const err = (key) => clientErrors[key] || errors[key];

    const filteredDepartments = departments.filter(
        (department) =>
            !data.store_id || department.store_id === data.store_id,
    );

    const displayCode = suggestedCode || data.code || '';

    const handleStoreChange = (storeId) => {
        setData('store_id', storeId);
        setData('department_id', '');
        onStoreChange?.(storeId);
    };

    const handleDepartmentChange = (departmentId) => {
        setData('department_id', departmentId);
        onDepartmentChange?.(departmentId);
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="store_id"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Магазин
                        </label>
                        <select
                            id="store_id"
                            value={data.store_id}
                            onChange={(e) => handleStoreChange(e.target.value)}
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
                            htmlFor="department_id"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Отдел
                        </label>
                        <select
                            id="department_id"
                            value={data.department_id}
                            onChange={(e) =>
                                handleDepartmentChange(e.target.value)
                            }
                            className={inputClass(err('department_id'))}
                            disabled={!data.store_id}
                            required
                        >
                            <option value="">Выберите отдел</option>
                            {filteredDepartments.map((department) => (
                                <option
                                    key={department.id}
                                    value={department.id}
                                >
                                    {department.code}
                                    {department.name
                                        ? ` — ${department.name}`
                                        : ''}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('department_id')} />
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
                            value={displayCode}
                            readOnly={codeReadonly}
                            onChange={
                                codeReadonly
                                    ? undefined
                                    : (e) => setData('code', e.target.value)
                            }
                            className={`${inputClass(err('code'))} font-mono ${
                                codeReadonly ? 'bg-[#1a2740] text-slate-300' : ''
                            }`}
                            placeholder="Авто"
                        />
                        <p className="mt-1.5 text-xs text-slate-400">
                            генерируется автоматически
                        </p>
                        <FieldError message={err('code')} />
                    </div>

                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Название
                            <span className="ml-1 font-normal text-slate-400">
                                (необязательно)
                            </span>
                        </label>
                        <input
                            id="name"
                            type="text"
                            maxLength={100}
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass(err('name'))}
                            placeholder="Стеллаж у входа"
                        />
                        <FieldError message={err('name')} />
                    </div>

                    <div>
                        <label
                            htmlFor="shelf_count"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Этажи
                        </label>
                        <input
                            id="shelf_count"
                            type="number"
                            min={3}
                            max={7}
                            value={data.shelf_count}
                            onChange={(e) =>
                                setData('shelf_count', e.target.value)
                            }
                            disabled={levelsLocked}
                            className={`${inputClass(err('shelf_count'))} ${
                                levelsLocked ? 'bg-[#1a2740] text-slate-300' : ''
                            }`}
                            required
                        />
                        {levelsLocked && (
                            <p className="mt-1.5 text-xs text-amber-700">
                                На стеллаже есть размещения — этажи не будут
                                пересобраны при сохранении.
                            </p>
                        )}
                        <FieldError message={err('shelf_count')} />
                    </div>

                    <div className="sm:col-span-2 grid gap-5 sm:grid-cols-3">
                        <div>
                            <label
                                htmlFor="width_mm"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Ширина, мм
                            </label>
                            <input
                                id="width_mm"
                                type="number"
                                min={100}
                                max={10000}
                                value={data.width_mm}
                                onChange={(e) =>
                                    setData('width_mm', e.target.value)
                                }
                                className={inputClass(err('width_mm'))}
                                required
                            />
                            <FieldError message={err('width_mm')} />
                        </div>

                        <div>
                            <label
                                htmlFor="height_mm"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Высота, мм
                            </label>
                            <input
                                id="height_mm"
                                type="number"
                                min={100}
                                max={10000}
                                value={data.height_mm}
                                onChange={(e) =>
                                    setData('height_mm', e.target.value)
                                }
                                className={inputClass(err('height_mm'))}
                                required
                            />
                            <FieldError message={err('height_mm')} />
                        </div>

                        <div>
                            <label
                                htmlFor="depth_mm"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Глубина, мм
                            </label>
                            <input
                                id="depth_mm"
                                type="number"
                                min={100}
                                max={5000}
                                value={data.depth_mm}
                                onChange={(e) =>
                                    setData('depth_mm', e.target.value)
                                }
                                className={inputClass(err('depth_mm'))}
                                required
                            />
                            <FieldError message={err('depth_mm')} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Link
                    href={route('shelves.index')}
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
