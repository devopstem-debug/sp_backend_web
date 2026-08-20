import {
    ChevronDownIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

const TYPE_LABELS = {
    shelves: 'Стеллажи',
    coolers: 'Холодильники',
    stands: 'Стойки',
};

function matchesQuery(item, q) {
    return (
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
}

export default function Sidebar({
    stores = [],
    tree = [],
    storeId,
    activeId,
    activeType,
    searchQuery = '',
    onStoreChange,
    onOpenEquipment,
}) {
    const [collapsed, setCollapsed] = useState({});
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const filteredTree = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            return tree;
        }

        return tree
            .map((department) => ({
                ...department,
                shelves: (department.shelves || []).filter((item) =>
                    matchesQuery(item, q),
                ),
                coolers: (department.coolers || []).filter((item) =>
                    matchesQuery(item, q),
                ),
                stands: (department.stands || []).filter((item) =>
                    matchesQuery(item, q),
                ),
            }))
            .filter(
                (department) =>
                    department.shelves.length > 0 ||
                    department.coolers.length > 0 ||
                    department.stands.length > 0,
            );
    }, [tree, searchQuery]);

    const toggleDepartment = (departmentId) => {
        setCollapsed((prev) => ({
            ...prev,
            [departmentId]: !prev[departmentId],
        }));
    };

    const toggleGroup = (key) => {
        setCollapsedGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const renderGroup = (department, groupKey, items) => {
        if (!items || items.length === 0) {
            return null;
        }

        const groupId = `${department.id}:${groupKey}`;
        const closed = Boolean(collapsedGroups[groupId]);

        return (
            <div key={groupId} className="mt-1">
                <button
                    type="button"
                    onClick={() => toggleGroup(groupId)}
                    className="flex w-full items-center gap-1 rounded px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-800"
                >
                    {closed ? (
                        <ChevronRightIcon className="h-3 w-3" />
                    ) : (
                        <ChevronDownIcon className="h-3 w-3" />
                    )}
                    {TYPE_LABELS[groupKey]}
                    <span className="ml-auto">{items.length}</span>
                </button>

                {!closed && (
                    <ul className="space-y-0.5 pl-2">
                        {items.map((item) => {
                            const type = item.type || groupKey.replace(/s$/, '');
                            const active =
                                item.id === activeId && type === activeType;

                            return (
                                <li key={`${type}-${item.id}`}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenEquipment({
                                                ...item,
                                                type,
                                            })
                                        }
                                        className={clsx(
                                            'flex w-full flex-col rounded-lg px-2 py-1.5 text-left transition',
                                            active
                                                ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-200'
                                                : 'text-slate-200 hover:bg-slate-800',
                                        )}
                                    >
                                        <span className="truncate text-sm font-medium">
                                            <span className="font-mono text-xs opacity-70">
                                                {item.code}
                                            </span>{' '}
                                            {item.name}
                                        </span>
                                        <span className="text-[11px] text-slate-400">
                                            {item.levels_count} полок
                                            {item.placements_count != null &&
                                                ` · ${item.placements_count} тов.`}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        );
    };

    return (
        <div className="flex h-full w-full flex-col bg-[#152033]">
            <div className="border-b border-slate-800 p-3">
                <label
                    htmlFor="planogram-store"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                    Магазин
                </label>
                <select
                    id="planogram-store"
                    value={storeId || ''}
                    onChange={(e) => onStoreChange(e.target.value)}
                    className="block w-full rounded-lg border-slate-700 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                    {stores.length === 0 && (
                        <option value="">Нет магазинов</option>
                    )}
                    {stores.map((store) => (
                        <option key={store.id} value={store.id}>
                            {store.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {filteredTree.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-slate-400">
                        {searchQuery
                            ? 'Ничего не найдено'
                            : 'Нет оборудования в этом магазине'}
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {filteredTree.map((department) => {
                            const closed = Boolean(collapsed[department.id]);

                            return (
                                <li key={department.id}>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            toggleDepartment(department.id)
                                        }
                                        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm font-semibold text-slate-200 hover:bg-slate-800"
                                    >
                                        {closed ? (
                                            <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                        ) : (
                                            <ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400" />
                                        )}
                                        <span className="min-w-0 truncate">
                                            {department.code !== '—' && (
                                                <span className="mr-1 font-mono text-xs text-slate-400">
                                                    {department.code}
                                                </span>
                                            )}
                                            {department.name}
                                        </span>
                                    </button>

                                    {!closed && (
                                        <div className="mb-1 ml-2 border-l border-gray-100 pl-1">
                                            {renderGroup(
                                                department,
                                                'shelves',
                                                department.shelves,
                                            )}
                                            {renderGroup(
                                                department,
                                                'coolers',
                                                department.coolers,
                                            )}
                                            {renderGroup(
                                                department,
                                                'stands',
                                                department.stands,
                                            )}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
