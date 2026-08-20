import { Head, router, usePage } from '@inertiajs/react';
import {
    Bars3Icon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AddPlacementModal from '@/Components/Planogram/AddPlacementModal';
import Sidebar from '@/Components/Planogram/Sidebar';
import Tabs from '@/Components/Planogram/Tabs';
import ShelfView from '@/Components/Planogram/ShelfView';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const TABS_STORAGE_KEY = 'planogram.hybrid.tabs.v2';

function tabKey(type, id) {
    return `${type}:${id}`;
}

function equipmentQuery(type, id) {
    if (!id) {
        return {};
    }

    if (type === 'cooler') {
        return { cooler_id: id };
    }
    if (type === 'stand') {
        return { stand_id: id };
    }

    return { shelf_id: id };
}

function readStoredSession(storeId) {
    if (!storeId || typeof window === 'undefined') {
        return { tabs: [], activeKey: null };
    }

    try {
        const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
        if (!raw) {
            return { tabs: [], activeKey: null };
        }
        const parsed = JSON.parse(raw);
        const session = parsed?.[storeId];
        if (!session || !Array.isArray(session.tabs)) {
            return { tabs: [], activeKey: null };
        }

        return {
            tabs: session.tabs,
            activeKey: session.activeKey || (session.tabs[0]
                ? tabKey(session.tabs[0].type || 'shelf', session.tabs[0].id)
                : null),
        };
    } catch {
        return { tabs: [], activeKey: null };
    }
}

function writeStoredSession(storeId, tabs, activeKey) {
    if (!storeId || typeof window === 'undefined') {
        return;
    }

    try {
        const raw = window.localStorage.getItem(TABS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed[storeId] = { tabs, activeKey };
        window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(parsed));
    } catch {
        // ignore
    }
}

function toTab(equipment) {
    return {
        id: equipment.id,
        type: equipment.type || 'shelf',
        code: equipment.code,
        name: equipment.name,
        key: tabKey(equipment.type || 'shelf', equipment.id),
    };
}

export default function Index({
    stores = [],
    tree = [],
    activeEquipment = null,
    activeShelf = null,
    filters = {},
}) {
    const equipmentFromServer = activeEquipment || activeShelf;
    const { flash } = usePage().props;
    const can = useCan();
    const canEditPlanogram = can('create-planograms', 'edit-planograms');
    const canDeletePlanogram = can('delete-planograms');
    const storeId = filters.store_id || '';

    const initialSession = useMemo(
        () => readStoredSession(filters.store_id || ''),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const [tabs, setTabs] = useState(() => {
        if (!equipmentFromServer) {
            return initialSession.tabs;
        }
        const next = toTab(equipmentFromServer);
        if (initialSession.tabs.some((tab) => tab.key === next.key)) {
            return initialSession.tabs;
        }
        return [...initialSession.tabs, next];
    });

    const [activeKey, setActiveKey] = useState(() => {
        if (equipmentFromServer) {
            return tabKey(equipmentFromServer.type || 'shelf', equipmentFromServer.id);
        }
        return initialSession.activeKey;
    });

    const [cache, setCache] = useState(() => {
        if (!equipmentFromServer) {
            return {};
        }
        const key = tabKey(equipmentFromServer.type || 'shelf', equipmentFromServer.id);
        return { [key]: equipmentFromServer };
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [navOpen, setNavOpen] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const current = activeKey ? cache[activeKey] || null : null;
    const isShelf = current?.type === 'shelf' || (!current?.type && current);

    useEffect(() => {
        if (flash?.success && flash.success !== 'Товар размещён') {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    useEffect(() => {
        if (!equipmentFromServer) {
            return;
        }

        const key = tabKey(equipmentFromServer.type || 'shelf', equipmentFromServer.id);
        setCache((prev) => ({ ...prev, [key]: equipmentFromServer }));
        setTabs((prev) => {
            if (prev.some((tab) => tab.key === key)) {
                return prev;
            }
            return [...prev, toTab(equipmentFromServer)];
        });
        setActiveKey(key);
    }, [equipmentFromServer]);

    useEffect(() => {
        writeStoredSession(storeId, tabs, activeKey);
    }, [storeId, tabs, activeKey]);

    const loadEquipment = (type, id, nextStoreId = storeId) => {
        router.get(
            route('planograms.index'),
            {
                store_id: nextStoreId || undefined,
                ...equipmentQuery(type, id),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['activeEquipment', 'activeShelf', 'filters', 'tree', 'stores'],
            },
        );
    };

    const handleStoreChange = (nextStoreId) => {
        const session = readStoredSession(nextStoreId);
        setTabs(session.tabs);
        setActiveKey(session.activeKey);
        setSearchQuery('');
        setNavOpen(false);
        setCache({});

        const activeTab = session.tabs.find((tab) => tab.key === session.activeKey);

        router.get(
            route('planograms.index'),
            {
                store_id: nextStoreId || undefined,
                ...(activeTab
                    ? equipmentQuery(activeTab.type || 'shelf', activeTab.id)
                    : {}),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['activeEquipment', 'activeShelf', 'filters', 'tree', 'stores'],
            },
        );
    };

    const openEquipment = (item) => {
        const type = item.type || 'shelf';
        const key = tabKey(type, item.id);

        setTabs((prev) => {
            if (prev.some((tab) => tab.key === key)) {
                return prev;
            }
            return [...prev, toTab({ ...item, type })];
        });
        setActiveKey(key);
        setNavOpen(false);

        if (!cache[key]) {
            loadEquipment(type, item.id);
            return;
        }

        router.get(
            route('planograms.index'),
            {
                store_id: storeId || undefined,
                ...equipmentQuery(type, item.id),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['filters'],
            },
        );
    };

    const selectTab = (tabId) => {
        const tab = tabs.find((item) => item.id === tabId || item.key === tabId);
        if (!tab) {
            return;
        }

        const type = tab.type || 'shelf';
        const key = tab.key || tabKey(type, tab.id);
        setActiveKey(key);

        if (!cache[key]) {
            loadEquipment(type, tab.id);
            return;
        }

        router.get(
            route('planograms.index'),
            {
                store_id: storeId || undefined,
                ...equipmentQuery(type, tab.id),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['filters'],
            },
        );
    };

    const closeTab = (tabId) => {
        const closing = tabs.find((item) => item.id === tabId || item.key === tabId);
        if (!closing) {
            return;
        }

        const closingKey = closing.key || tabKey(closing.type || 'shelf', closing.id);
        const remaining = tabs.filter(
            (tab) => (tab.key || tabKey(tab.type || 'shelf', tab.id)) !== closingKey,
        );
        setTabs(remaining);
        setCache((prev) => {
            const next = { ...prev };
            delete next[closingKey];
            return next;
        });

        if (activeKey !== closingKey) {
            return;
        }

        const nextActive = remaining[remaining.length - 1] || null;
        const nextKey = nextActive
            ? nextActive.key || tabKey(nextActive.type || 'shelf', nextActive.id)
            : null;
        setActiveKey(nextKey);

        if (nextActive) {
            loadEquipment(nextActive.type || 'shelf', nextActive.id);
        } else {
            loadEquipment(null, null);
        }
    };

    const handlePlacementAdded = () => {
        if (!current || current.type !== 'shelf') {
            return;
        }
        setCache((prev) => {
            const next = { ...prev };
            delete next[tabKey('shelf', current.id)];
            return next;
        });
        loadEquipment('shelf', current.id);
    };

    const removePlacement = async (placement) => {
        if (!current || current.type !== 'shelf') {
            return;
        }

        const confirmed = await fireConfirm(
            'Удалить размещение?',
            `«${placement.product_name}» (${placement.start_cm}–${placement.end_cm} см) будет удалено с полки.`,
        );

        if (!confirmed) {
            return;
        }

        router.delete(route('planograms.placements.destroy', placement.id), {
            preserveScroll: true,
            onSuccess: () => {
                setCache((prev) => {
                    const next = { ...prev };
                    delete next[tabKey('shelf', current.id)];
                    return next;
                });
            },
            onError: () => fireError('Не удалось удалить размещение.'),
        });
    };

    const tabsForUi = tabs.map((tab) => ({
        ...tab,
        id: tab.key || tabKey(tab.type || 'shelf', tab.id),
        code: tab.type && tab.type !== 'shelf'
            ? `${tab.type === 'cooler' ? '❄' : '▣'} ${tab.code}`
            : tab.code,
    }));

    return (
        <AdminLayout
            flush
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Планограммы
                </h1>
            }
        >
            <Head title="Планограммы" />

            <div className="relative flex h-full overflow-hidden bg-[#0e172b]">
                <aside className="hidden w-[250px] shrink-0 border-r border-slate-800 lg:block">
                    <Sidebar
                        stores={stores}
                        tree={tree}
                        storeId={storeId}
                        activeId={current?.id}
                        activeType={current?.type || 'shelf'}
                        searchQuery={searchQuery}
                        onStoreChange={handleStoreChange}
                        onOpenEquipment={openEquipment}
                    />
                </aside>

                <div
                    className={clsx(
                        'fixed inset-0 z-40 lg:hidden',
                        navOpen ? 'pointer-events-auto' : 'pointer-events-none',
                    )}
                >
                    <div
                        className={clsx(
                            'absolute inset-0 bg-gray-900/50 transition-opacity',
                            navOpen ? 'opacity-100' : 'opacity-0',
                        )}
                        onClick={() => setNavOpen(false)}
                        aria-hidden="true"
                    />
                    <aside
                        className={clsx(
                            'absolute inset-y-0 left-0 flex w-[250px] max-w-[85vw] flex-col bg-[#152033] shadow-xl transition-transform duration-300',
                            navOpen ? 'translate-x-0' : '-translate-x-full',
                        )}
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
                            <span className="text-sm font-semibold text-white">
                                Навигация
                            </span>
                            <button
                                type="button"
                                onClick={() => setNavOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-[#0e172b]"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <Sidebar
                            stores={stores}
                            tree={tree}
                            storeId={storeId}
                            activeId={current?.id}
                            activeType={current?.type || 'shelf'}
                            searchQuery={searchQuery}
                            onStoreChange={handleStoreChange}
                            onOpenEquipment={openEquipment}
                        />
                    </aside>
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-stretch border-b border-slate-800 bg-[#152033]">
                        <button
                            type="button"
                            onClick={() => setNavOpen(true)}
                            className="shrink-0 border-r border-slate-800 px-3 text-slate-400 hover:bg-slate-800 lg:hidden"
                            aria-label="Открыть список"
                        >
                            <Bars3Icon className="h-5 w-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <Tabs
                                tabs={tabsForUi}
                                activeId={activeKey}
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                onSelect={selectTab}
                                onClose={closeTab}
                            />
                        </div>
                    </div>

                    {isShelf && current && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-[#152033] px-3 py-2">
                            {canEditPlanogram && (
                            <button
                                type="button"
                                onClick={() => setShowForm(true)}
                                disabled={!current.levels?.length}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Добавить товар
                            </button>
                            )}

                            <div className="flex max-w-full gap-2 overflow-x-auto">
                                {canDeletePlanogram && current.levels?.flatMap((level) =>
                                    (level.placements || []).map((placement) => (
                                        <button
                                            key={placement.id}
                                            type="button"
                                            onClick={() => removePlacement(placement)}
                                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-300 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                            <span className="max-w-[9rem] truncate">
                                                {placement.product_name}
                                            </span>
                                        </button>
                                    )),
                                )}
                            </div>
                        </div>
                    )}

                    {current && !isShelf && (
                        <div className="border-b border-slate-800 bg-sky-50 px-3 py-2 text-sm text-sky-800">
                            {current.type === 'cooler'
                                ? `Холодильник · ${current.temperature_zone_label || ''} · двери: ${current.door_count ?? '—'}`
                                : `Стойка · ${current.stand_type_label || ''} · ${current.has_back ? 'с задней стенкой' : 'без задней стенки'}`}
                            {' · '}
                            размещение товаров пока только на стеллажах
                        </div>
                    )}

                    <div className="min-h-0 flex-1 overflow-hidden">
                        <ShelfView shelf={current} />
                    </div>
                </div>
            </div>

            {showForm && isShelf && current && canEditPlanogram && (
                <AddPlacementModal
                    shelf={current}
                    onClose={() => setShowForm(false)}
                    onAdded={handlePlacementAdded}
                />
            )}
        </AdminLayout>
    );
}
