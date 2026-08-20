import clsx from 'clsx';

export default function ShelfLevelPicker({
    levels = [],
    value,
    onChange,
    error,
}) {
    return (
        <div>
            <p className="mb-1.5 text-sm font-medium text-slate-200">Полка</p>
            <div className="flex flex-wrap gap-2">
                {levels.map((level) => {
                    const active = level.id === value;

                    return (
                        <button
                            key={level.id}
                            type="button"
                            onClick={() => onChange(level.id)}
                            className={clsx(
                                'inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition',
                                active
                                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                                    : 'bg-[#0e172b] text-slate-200 hover:bg-slate-800',
                            )}
                            title={`Полка №${level.level_number} · ${level.height_cm} см`}
                        >
                            {level.level_number}
                        </button>
                    );
                })}
            </div>
            {levels.length === 0 && (
                <p className="mt-1 text-sm text-slate-400">Нет доступных полок</p>
            )}
            {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        </div>
    );
}
