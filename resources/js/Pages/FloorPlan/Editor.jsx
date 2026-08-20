import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess } from '@/lib/swal';
import {
    DndContext,
    PointerSensor,
    useDraggable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    ArrowPathIcon,
    ArrowUturnLeftIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    MapIcon,
    MinusIcon,
    PlusIcon,
    Square2StackIcon,
    ViewfinderCircleIcon,
} from '@heroicons/react/24/outline';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import clsx from 'clsx';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const BASE_PX_PER_M = 100;
const ZOOM_LEVELS = [0.5, 1, 2];
const ROTATIONS = [0, 90, 180, 270];

const TYPE_META = {
    shelf: { label: 'Стеллаж', color: '#6366f1', listKey: 'shelves' },
    cooler: { label: 'Холодильник', color: '#06b6d4', listKey: 'coolers' },
    stand: { label: 'Стойка', color: '#22c55e', listKey: 'stands' },
};

function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
}

function snap(value, step) {
    if (!step) {
        return value;
    }

    return Math.round(value / step) * step;
}

function parseDragId(id) {
    const [type, ...rest] = String(id).split(':');

    return { type, id: rest.join(':') };
}

function makeDragId(type, id) {
    return `${type}:${id}`;
}

function DraggableObject({
    item,
    type,
    scale,
    selected,
    onSelect,
    layout,
}) {
    const dragId = makeDragId(type, item.id);
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({ id: dragId, disabled: !item.on_map });

    const widthPx = item.width_meters * BASE_PX_PER_M;
    const lengthPx = item.length_meters * BASE_PX_PER_M;
    const x = item.pos_x * BASE_PX_PER_M * scale;
    const y = item.pos_y * BASE_PX_PER_M * scale;

    const dragX = transform ? transform.x / scale : 0;
    const dragY = transform ? transform.y / scale : 0;

    const style = {
        transform: CSS.Translate.toString({
            x: dragX,
            y: dragY,
            scaleX: 1,
            scaleY: 1,
        }),
    };

    return (
        <g
            ref={setNodeRef}
            transform={`translate(${x}, ${y}) rotate(${item.rotation}, ${widthPx / 2}, ${lengthPx / 2})`}
            style={style}
            className={clsx(
                'cursor-grab transition-opacity',
                isDragging && 'opacity-80',
                selected && 'drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]',
            )}
            onClick={(event) => {
                event.stopPropagation();
                onSelect(type, item.id);
            }}
            {...listeners}
            {...attributes}
        >
            <rect
                x={0}
                y={0}
                width={widthPx}
                height={lengthPx}
                rx={4}
                fill={TYPE_META[type].color}
                fillOpacity={selected ? 0.95 : 0.75}
                stroke={selected ? '#e2e8f0' : '#1e293b'}
                strokeWidth={selected ? 2 : 1}
            />
            <text
                x={widthPx / 2}
                y={lengthPx / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={12}
                fontWeight={600}
                pointerEvents="none"
            >
                {item.code}
            </text>
            <title>
                {TYPE_META[type].label}: {item.code} ({item.pos_x.toFixed(2)} м,{' '}
                {item.pos_y.toFixed(2)} м)
            </title>
        </g>
    );
}

export default function Editor({
    store,
    layout: initialLayout,
    walls: initialWalls = [],
    shelves: initialShelves = [],
    coolers: initialCoolers = [],
    stands: initialStands = [],
}) {
    const can = useCan();
    const canManage = can('manage-planograms');

    const initialSnapshot = useMemo(
        () => ({
            layout: initialLayout,
            walls: initialWalls,
            shelves: initialShelves,
            coolers: initialCoolers,
            stands: initialStands,
        }),
        [
            initialLayout,
            initialWalls,
            initialShelves,
            initialCoolers,
            initialStands,
        ],
    );

    const [layout, setLayout] = useState(initialLayout);
    const [walls, setWalls] = useState(initialWalls);
    const [shelves, setShelves] = useState(initialShelves);
    const [coolers, setCoolers] = useState(initialCoolers);
    const [stands, setStands] = useState(initialStands);
    const [tool, setTool] = useState('select');
    const [showGrid, setShowGrid] = useState(true);
    const [zoomIndex, setZoomIndex] = useState(1);
    const [pan, setPan] = useState({ x: 40, y: 40 });
    const [selected, setSelected] = useState(null);
    const [wallDraft, setWallDraft] = useState(null);
    const [saving, setSaving] = useState(false);
    const [spacePressed, setSpacePressed] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [history, setHistory] = useState([cloneState(initialSnapshot)]);
    const [historyIndex, setHistoryIndex] = useState(0);

    const scale = ZOOM_LEVELS[zoomIndex];
    const gridStepMeters = layout.grid_size_cm / 100;
    const canvasWidth = layout.width_meters * BASE_PX_PER_M * scale;
    const canvasHeight = layout.height_meters * BASE_PX_PER_M * scale;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    const pushHistory = useCallback((nextState) => {
        setHistory((prev) => {
            const trimmed = prev.slice(0, historyIndex + 1);
            return [...trimmed, cloneState(nextState)];
        });
        setHistoryIndex((index) => index + 1);
    }, [historyIndex]);

    const currentState = useCallback(
        () => ({ layout, walls, shelves, coolers, stands }),
        [layout, walls, shelves, coolers, stands,],
    );

    const applyState = useCallback((state) => {
        setLayout(state.layout);
        setWalls(state.walls);
        setShelves(state.shelves);
        setCoolers(state.coolers);
        setStands(state.stands);
    }, []);

    const updateCollection = useCallback((type, id, patch) => {
        const setter = {
            shelf: setShelves,
            cooler: setCoolers,
            stand: setStands,
        }[type];

        setter((items) =>
            items.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
            ),
        );
    }, []);

    const selectedItem = useMemo(() => {
        if (!selected) {
            return null;
        }

        const list = {
            shelf: shelves,
            cooler: coolers,
            stand: stands,
        }[selected.type];

        return list?.find((item) => item.id === selected.id) ?? null;
    }, [selected, shelves, coolers, stands]);

    const svgPointFromEvent = useCallback(
        (event) => {
            const svg = event.currentTarget.ownerSVGElement;
            const rect = svg.getBoundingClientRect();
            const x =
                ((event.clientX - rect.left - pan.x) / scale) / BASE_PX_PER_M;
            const y =
                ((event.clientY - rect.top - pan.y) / scale) / BASE_PX_PER_M;

            return {
                x: snap(Math.max(0, Math.min(layout.width_meters, x)), gridStepMeters),
                y: snap(Math.max(0, Math.min(layout.height_meters, y)), gridStepMeters),
            };
        },
        [gridStepMeters, layout.height_meters, layout.width_meters, pan.x, pan.y, scale],
    );

    const handleCanvasClick = (event) => {
        if (tool === 'wall') {
            const point = svgPointFromEvent(event);

            if (!wallDraft) {
                setWallDraft(point);
                return;
            }

            const nextWalls = [
                ...walls,
                {
                    id: null,
                    start_x: wallDraft.x,
                    start_y: wallDraft.y,
                    end_x: point.x,
                    end_y: point.y,
                    wall_type: 'wall',
                },
            ];

            setWalls(nextWalls);
            setWallDraft(null);
            pushHistory({ ...currentState(), walls: nextWalls });
            return;
        }

        setSelected(null);
    };

    const handleDragEnd = (event) => {
        const { active, delta } = event;
        if (!active || !delta) {
            return;
        }

        const { type, id } = parseDragId(active.id);
        const listKey = TYPE_META[type]?.listKey;
        if (!listKey) {
            return;
        }

        const list = currentState()[listKey];
        const item = list.find((entry) => entry.id === id);
        if (!item) {
            return;
        }

        const deltaMetersX = delta.x / (BASE_PX_PER_M * scale);
        const deltaMetersY = delta.y / (BASE_PX_PER_M * scale);

        const nextPos = {
            pos_x: snap(
                Math.max(0, Math.min(layout.width_meters, item.pos_x + deltaMetersX)),
                gridStepMeters,
            ),
            pos_y: snap(
                Math.max(0, Math.min(layout.height_meters, item.pos_y + deltaMetersY)),
                gridStepMeters,
            ),
            on_map: true,
        };

        updateCollection(type, id, nextPos);
        pushHistory({
            ...currentState(),
            [listKey]: list.map((entry) =>
                entry.id === id ? { ...entry, ...nextPos } : entry,
            ),
        });
    };

    const rotateSelected = useCallback(
        (direction = 1) => {
            if (!selected) {
                return;
            }

            const listKey = TYPE_META[selected.type]?.listKey;
            if (!listKey) {
                return;
            }

            const list = {
                shelf: shelves,
                cooler: coolers,
                stand: stands,
            }[selected.type];
            const item = list?.find((entry) => entry.id === selected.id);
            if (!item) {
                return;
            }

            const index = ROTATIONS.indexOf(item.rotation);
            const nextRotation =
                ROTATIONS[(index + direction + ROTATIONS.length) % ROTATIONS.length];

            const nextList = list.map((entry) =>
                entry.id === selected.id
                    ? { ...entry, rotation: nextRotation }
                    : entry,
            );

            if (selected.type === 'shelf') {
                setShelves(nextList);
            } else if (selected.type === 'cooler') {
                setCoolers(nextList);
            } else {
                setStands(nextList);
            }

            pushHistory({
                layout,
                walls,
                shelves: selected.type === 'shelf' ? nextList : shelves,
                coolers: selected.type === 'cooler' ? nextList : coolers,
                stands: selected.type === 'stand' ? nextList : stands,
            });
        },
        [selected, shelves, coolers, stands, layout, walls, pushHistory],
    );

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.code === 'Space') {
                event.preventDefault();
                setSpacePressed(true);
            }

            if (event.key === 'r' || event.key === 'R') {
                rotateSelected(event.shiftKey ? -1 : 1);
            }
        };

        const onKeyUp = (event) => {
            if (event.code === 'Space') {
                setSpacePressed(false);
                setIsPanning(false);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [rotateSelected]);

    const removeFromMap = () => {
        if (!selected) {
            return;
        }

        updateCollection(selected.type, selected.id, {
            on_map: false,
            pos_x: 0,
            pos_y: 0,
            rotation: 0,
        });
        setSelected(null);
        pushHistory(currentState());
    };

    const placeOnMap = (type, id) => {
        updateCollection(type, id, {
            on_map: true,
            pos_x: snap(layout.width_meters / 2, gridStepMeters),
            pos_y: snap(layout.height_meters / 2, gridStepMeters),
        });
        setSelected({ type, id });
        pushHistory(currentState());
    };

    const handleSave = async () => {
        if (!canManage) {
            fireError('Недостаточно прав для сохранения.');
            return;
        }

        setSaving(true);

        try {
            await axios.post(route('floor-plan.save', store.id), {
                layout,
                walls,
                shelves: shelves.map(({ id, pos_x, pos_y, rotation, on_map }) => ({
                    id,
                    pos_x,
                    pos_y,
                    rotation,
                    on_map,
                })),
                coolers: coolers.map(({ id, pos_x, pos_y, rotation, on_map }) => ({
                    id,
                    pos_x,
                    pos_y,
                    rotation,
                    on_map,
                })),
                stands: stands.map(({ id, pos_x, pos_y, rotation, on_map }) => ({
                    id,
                    pos_x,
                    pos_y,
                    rotation,
                    on_map,
                })),
            });

            fireSuccess('Карта зала сохранена.');
        } catch (error) {
            fireError(
                error.response?.data?.message ||
                    'Не удалось сохранить карту зала.',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleUndo = () => {
        if (historyIndex <= 0) {
            return;
        }

        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        applyState(history[nextIndex]);
        setSelected(null);
    };

    const handleReset = () => {
        applyState(initialSnapshot);
        setHistory([cloneState(initialSnapshot)]);
        setHistoryIndex(0);
        setSelected(null);
        setWallDraft(null);
    };

    const gridLines = [];
    if (showGrid) {
        for (let x = 0; x <= layout.width_meters; x += gridStepMeters) {
            gridLines.push(
                <line
                    key={`v-${x}`}
                    x1={x * BASE_PX_PER_M}
                    y1={0}
                    x2={x * BASE_PX_PER_M}
                    y2={layout.height_meters * BASE_PX_PER_M}
                    stroke="#334155"
                    strokeWidth={x === 0 ? 1.5 : 1}
                />,
            );
        }

        for (let y = 0; y <= layout.height_meters; y += gridStepMeters) {
            gridLines.push(
                <line
                    key={`h-${y}`}
                    x1={0}
                    y1={y * BASE_PX_PER_M}
                    x2={layout.width_meters * BASE_PX_PER_M}
                    y2={y * BASE_PX_PER_M}
                    stroke="#334155"
                    strokeWidth={y === 0 ? 1.5 : 1}
                />,
            );
        }
    }

    const renderList = (type, items) => (
        <div className="space-y-1">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {TYPE_META[type].label}
            </p>
            {items.map((item) => (
                <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                        item.on_map
                            ? setSelected({ type, id: item.id })
                            : placeOnMap(type, item.id)
                    }
                    className={clsx(
                        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition',
                        selected?.type === type && selected?.id === item.id
                            ? 'bg-indigo-500/20 text-indigo-200'
                            : 'text-slate-300 hover:bg-slate-800',
                        !item.on_map && 'opacity-60',
                    )}
                    title={
                        item.on_map
                            ? `${item.code} — на карте`
                            : `${item.code} — не на карте, клик чтобы разместить`
                    }
                >
                    <span>{item.code}</span>
                    {!item.on_map && (
                        <PlusIcon className="h-4 w-4 text-slate-400" />
                    )}
                </button>
            ))}
        </div>
    );

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <MapIcon className="h-5 w-5 text-indigo-300" />
                            <h1 className="text-xl font-semibold text-white">
                                {store.name}
                            </h1>
                        </div>
                        <p className="text-sm text-slate-400">
                            {layout.width_meters} × {layout.height_meters} м · сетка{' '}
                            {layout.grid_size_cm} см
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('floor-plan.stores')}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                            К магазинам
                        </Link>
                        <button
                            type="button"
                            onClick={handleUndo}
                            disabled={historyIndex <= 0}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40"
                        >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                            Отменить
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                            Сбросить
                        </button>
                        {canManage && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Карта зала — ${store.name}`} />

            <div className="flex h-[calc(100vh-10rem)] min-h-[640px] overflow-hidden rounded-xl bg-[#0f172a] ring-1 ring-slate-800">
                <aside className="flex w-[280px] shrink-0 flex-col border-r border-slate-800 bg-[#152033]">
                    <div className="space-y-2 border-b border-slate-800 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Инструменты
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'select', label: 'Выбрать', icon: ViewfinderCircleIcon },
                                { id: 'wall', label: 'Стена', icon: MinusIcon },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setTool(item.id);
                                        setWallDraft(null);
                                    }}
                                    className={clsx(
                                        'inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition',
                                        tool === item.id
                                            ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setShowGrid((value) => !value)}
                                className={clsx(
                                    'inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium transition',
                                    showGrid
                                        ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                                )}
                            >
                                <Square2StackIcon className="h-4 w-4" />
                                Сетка
                            </button>
                            <div className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-2 py-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setZoomIndex((index) =>
                                            Math.max(0, index - 1),
                                        )
                                    }
                                    className="rounded p-1 text-slate-300 hover:bg-slate-700"
                                >
                                    <MagnifyingGlassMinusIcon className="h-4 w-4" />
                                </button>
                                <span className="text-xs text-slate-400">
                                    {Math.round(scale * 100)}%
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setZoomIndex((index) =>
                                            Math.min(
                                                ZOOM_LEVELS.length - 1,
                                                index + 1,
                                            ),
                                        )
                                    }
                                    className="rounded p-1 text-slate-300 hover:bg-slate-700"
                                >
                                    <MagnifyingGlassPlusIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto p-3 sidebar-scroll">
                        {renderList('shelf', shelves)}
                        {renderList('cooler', coolers)}
                        {renderList('stand', stands)}
                    </div>

                    {canManage && (
                        <div className="border-t border-slate-800 p-3">
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                                {saving ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    )}
                </aside>

                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <main
                        className={clsx(
                            'relative flex-1 overflow-hidden',
                            (spacePressed || isPanning) && 'cursor-grab',
                        )}
                        onMouseDown={(event) => {
                            if (!spacePressed) {
                                return;
                            }

                            setIsPanning(true);
                            panStart.current = {
                                x: event.clientX,
                                y: event.clientY,
                                panX: pan.x,
                                panY: pan.y,
                            };
                        }}
                        onMouseMove={(event) => {
                            if (!isPanning) {
                                return;
                            }

                            setPan({
                                x:
                                    panStart.current.panX +
                                    (event.clientX - panStart.current.x),
                                y:
                                    panStart.current.panY +
                                    (event.clientY - panStart.current.y),
                            });
                        }}
                        onMouseUp={() => setIsPanning(false)}
                        onMouseLeave={() => setIsPanning(false)}
                        onWheel={(event) => {
                            event.preventDefault();
                            setZoomIndex((index) => {
                                if (event.deltaY > 0) {
                                    return Math.max(0, index - 1);
                                }

                                return Math.min(ZOOM_LEVELS.length - 1, index + 1);
                            });
                        }}
                    >
                        <svg
                            width="100%"
                            height="100%"
                            className="bg-[#0f172a]"
                        >
                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                                <rect
                                    x={0}
                                    y={0}
                                    width={layout.width_meters * BASE_PX_PER_M}
                                    height={layout.height_meters * BASE_PX_PER_M}
                                    fill="#111827"
                                    stroke="#475569"
                                    strokeWidth={2}
                                    onClick={handleCanvasClick}
                                />
                                {gridLines}
                                {walls.map((wall, index) => (
                                    <line
                                        key={wall.id ?? `wall-${index}`}
                                        x1={wall.start_x * BASE_PX_PER_M}
                                        y1={wall.start_y * BASE_PX_PER_M}
                                        x2={wall.end_x * BASE_PX_PER_M}
                                        y2={wall.end_y * BASE_PX_PER_M}
                                        stroke="#f8fafc"
                                        strokeWidth={3}
                                        strokeLinecap="round"
                                    />
                                ))}
                                {wallDraft && (
                                    <circle
                                        cx={wallDraft.x * BASE_PX_PER_M}
                                        cy={wallDraft.y * BASE_PX_PER_M}
                                        r={5}
                                        fill="#fbbf24"
                                    />
                                )}
                                {shelves
                                    .filter((item) => item.on_map)
                                    .map((item) => (
                                        <DraggableObject
                                            key={item.id}
                                            item={item}
                                            type="shelf"
                                            scale={scale}
                                            selected={
                                                selected?.type === 'shelf' &&
                                                selected.id === item.id
                                            }
                                            onSelect={(type, id) =>
                                                setSelected({ type, id })
                                            }
                                            layout={layout}
                                        />
                                    ))}
                                {coolers
                                    .filter((item) => item.on_map)
                                    .map((item) => (
                                        <DraggableObject
                                            key={item.id}
                                            item={item}
                                            type="cooler"
                                            scale={scale}
                                            selected={
                                                selected?.type === 'cooler' &&
                                                selected.id === item.id
                                            }
                                            onSelect={(type, id) =>
                                                setSelected({ type, id })
                                            }
                                            layout={layout}
                                        />
                                    ))}
                                {stands
                                    .filter((item) => item.on_map)
                                    .map((item) => (
                                        <DraggableObject
                                            key={item.id}
                                            item={item}
                                            type="stand"
                                            scale={scale}
                                            selected={
                                                selected?.type === 'stand' &&
                                                selected.id === item.id
                                            }
                                            onSelect={(type, id) =>
                                                setSelected({ type, id })
                                            }
                                            layout={layout}
                                        />
                                    ))}
                            </g>
                        </svg>
                    </main>
                </DndContext>

                <aside className="w-[280px] shrink-0 border-l border-slate-800 bg-[#152033] p-4">
                    {selectedItem ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">
                                    {TYPE_META[selected.type].label}
                                </p>
                                <p className="text-lg font-semibold text-white">
                                    {selectedItem.code}
                                </p>
                                <p className="text-sm text-slate-400">
                                    {selectedItem.label}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-sm">
                                    <span className="mb-1 block text-slate-400">
                                        X (метров)
                                    </span>
                                    <input
                                        type="number"
                                        step={gridStepMeters}
                                        min={0}
                                        max={layout.width_meters}
                                        value={selectedItem.pos_x}
                                        onChange={(event) =>
                                            updateCollection(
                                                selected.type,
                                                selected.id,
                                                {
                                                    pos_x: snap(
                                                        Number(event.target.value),
                                                        gridStepMeters,
                                                    ),
                                                    on_map: true,
                                                },
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block text-slate-400">
                                        Y (метров)
                                    </span>
                                    <input
                                        type="number"
                                        step={gridStepMeters}
                                        min={0}
                                        max={layout.height_meters}
                                        value={selectedItem.pos_y}
                                        onChange={(event) =>
                                            updateCollection(
                                                selected.type,
                                                selected.id,
                                                {
                                                    pos_y: snap(
                                                        Number(event.target.value),
                                                        gridStepMeters,
                                                    ),
                                                    on_map: true,
                                                },
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white"
                                    />
                                </label>
                                <label className="block text-sm">
                                    <span className="mb-1 block text-slate-400">
                                        Поворот
                                    </span>
                                    <select
                                        value={selectedItem.rotation}
                                        onChange={(event) =>
                                            updateCollection(
                                                selected.type,
                                                selected.id,
                                                {
                                                    rotation: Number(
                                                        event.target.value,
                                                    ),
                                                },
                                            )
                                        }
                                        className="w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white"
                                    >
                                        {ROTATIONS.map((value) => (
                                            <option key={value} value={value}>
                                                {value}°
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <p className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-400">
                                R — повернуть на 90° · Shift+R — −90° · Пробел + мышь
                                — панорама · Колесо — масштаб
                            </p>

                            {canManage && (
                                <button
                                    type="button"
                                    onClick={removeFromMap}
                                    className="w-full rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                                >
                                    Удалить с карты
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-500">
                            <ViewfinderCircleIcon className="mb-3 h-10 w-10 text-slate-600" />
                            <p>Выберите объект на карте или в списке слева</p>
                        </div>
                    )}
                </aside>
            </div>
        </AdminLayout>
    );
}
