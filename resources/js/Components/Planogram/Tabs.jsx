import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Tabs({
    tabs = [],
    activeId,
    searchQuery,
    onSearchChange,
    onSelect,
    onClose,
}) {
    return (
        <div className="flex min-w-0 items-center gap-2 border-b border-slate-800 bg-[#152033] px-2 py-1.5 sm:px-3">
            <div className="relative w-36 shrink-0 sm:w-48">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Поиск стеллажа…"
                    className="block w-full rounded-lg border-slate-700 py-1.5 pl-8 pr-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5">
                {tabs.length === 0 ? (
                    <p className="px-2 text-sm text-slate-400">
                        Выберите стеллаж слева
                    </p>
                ) : (
                    tabs.map((tab) => {
                        const active = tab.id === activeId;

                        return (
                            <div
                                key={tab.id}
                                className={clsx(
                                    'group flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-sm transition',
                                    active
                                        ? 'border-indigo-300 bg-indigo-500/15 text-indigo-300'
                                        : 'border-slate-800 bg-[#1a2740] text-slate-200 hover:bg-[#0e172b]',
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={() => onSelect(tab.id)}
                                    className="max-w-[10rem] truncate font-medium"
                                    title={`${tab.code} — ${tab.name}`}
                                >
                                    <span className="font-mono text-xs opacity-70">
                                        {tab.code}
                                    </span>{' '}
                                    {tab.name}
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose(tab.id);
                                    }}
                                    className={clsx(
                                        'rounded p-0.5 text-slate-400 hover:bg-[#152033] hover:text-white',
                                        active && 'hover:bg-indigo-100',
                                    )}
                                    aria-label={`Закрыть ${tab.code}`}
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
