import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function FacingsStepper({
    value = 1,
    onChange,
    min = 1,
    max = 20,
    error,
}) {
    const current = Number(value) || min;

    const setValue = (next) => {
        const clamped = Math.min(max, Math.max(min, next));
        onChange(clamped);
    };

    return (
        <div>
            <p className="mb-1.5 text-sm font-medium text-slate-200">Фейсинг</p>
            <div className="inline-flex items-center rounded-xl border border-slate-800 bg-[#1a2740] p-1">
                <button
                    type="button"
                    onClick={() => setValue(current - 1)}
                    disabled={current <= min}
                    className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition',
                        current <= min
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-[#152033] hover:shadow-sm',
                    )}
                    aria-label="Уменьшить"
                >
                    <MinusIcon className="h-4 w-4" />
                </button>
                <span className="min-w-10 text-center text-base font-semibold tabular-nums text-white">
                    {current}
                </span>
                <button
                    type="button"
                    onClick={() => setValue(current + 1)}
                    disabled={current >= max}
                    className={clsx(
                        'flex h-9 w-9 items-center justify-center rounded-lg text-slate-200 transition',
                        current >= max
                            ? 'cursor-not-allowed opacity-40'
                            : 'hover:bg-[#152033] hover:shadow-sm',
                    )}
                    aria-label="Увеличить"
                >
                    <PlusIcon className="h-4 w-4" />
                </button>
            </div>
            {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        </div>
    );
}
