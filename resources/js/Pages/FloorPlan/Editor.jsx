import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess } from '@/lib/swal';
import {
    ArrowDownTrayIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import clsx from 'clsx';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

const BASE_PX_PER_M = 80;
const ROTATIONS = [0, 90, 180, 270];
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 2.5;

const EQUIP_META = {
    shelf: { label: 'Стеллаж', emoji: '🛒', color: '#6366f1', listKey: 'shelves' },
    cooler: { label: 'Холодильник', emoji: '🧊', color: '#06b6d4', listKey: 'coolers' },
    stand: { label: 'Стойка', emoji: '🍺', color: '#22c55e', listKey: 'stands' },
};

const MARKER_META = {
    cash_register: { label: 'Касса', emoji: '💰', color: '#eab308', w: 1.2, d: 0.8 },
    entrance: { label: 'Вход', emoji: '🚪', color: '#22c55e', w: 1.5, d: 0.4 },
    exit: { label: 'Выход', emoji: '🚪', color: '#f97316', w: 1.5, d: 0.4 },
    beacon: { label: 'Маяк', emoji: '📍', color: '#a855f7', w: 0.4, d: 0.4 },
};

function clone(v) {
    return JSON.parse(JSON.stringify(v));
}

function snap(value, step) {
    if (!step) return value;
    return Math.round(value / step) * step;
}

function gridCell(x, y, gridCm) {
    const step = Math.max(0.1, gridCm / 100);
    const col = Math.max(0, Math.floor(x / step));
    const row = Math.max(1, Math.floor(y / step) + 1);
    let n = col;
    let letters = '';
    do {
        letters = String.fromCharCode(65 + (n % 26)) + letters;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return `${letters}-${row}`;
}

function footprint(item) {
    const rot = Number(item.rotation) || 0;
    const w = Number(item.width_meters) || 1;
    const d = Number(item.length_meters ?? item.depth_meters) || 1;
    const width = rot % 180 === 0 ? w : d;
    const depth = rot % 180 === 0 ? d : w;
    return {
        x: Number(item.pos_x) || 0,
        y: Number(item.pos_y) || 0,
        w: width,
        d: depth,
    };
}

/** SW origin (0,0) at south-west; SVG Y grows down → flip by hall height. */
function svgX(meters, scale) {
    return meters * BASE_PX_PER_M * scale;
}

function svgY(metersFromSouth, hallHeightM, scale) {
    return (hallHeightM - metersFromSouth) * BASE_PX_PER_M * scale;
}

function cashZoneRect(layout) {
    if (!layout?.has_cash_registers || !layout.cash_side) return null;
    const depth = 2.5;
    const w = Number(layout.width_meters) || 0;
    const h = Number(layout.height_meters) || 0;
    switch (layout.cash_side) {
        case 'south':
            return { x: 0, y: 0, w, d: depth };
        case 'north':
            return { x: 0, y: Math.max(0, h - depth), w, d: depth };
        case 'west':
            return { x: 0, y: 0, w: depth, d: h };
        case 'east':
            return { x: Math.max(0, w - depth), y: 0, w: depth, d: h };
        default:
            return null;
    }
}

function entranceArrow(layout) {
    if (!layout?.entrance_side || layout.entrance_offset_m == null) return null;
    const w = Number(layout.width_meters) || 0;
    const h = Number(layout.height_meters) || 0;
    const off = Number(layout.entrance_offset_m) || 0;
    const ew = Number(layout.entrance_width_m) || 2;
    const mid = off + ew / 2;
    switch (layout.entrance_side) {
        case 'south':
            return { cx: mid, cy: 1.2, tipX: mid, tipY: 2.4, baseY: 0.4 };
        case 'north':
            return { cx: mid, cy: h - 1.2, tipX: mid, tipY: h - 2.4, baseY: h - 0.4 };
        case 'west':
            return { cx: 1.2, cy: mid, tipX: 2.4, tipY: mid, baseY: mid };
        case 'east':
            return { cx: w - 1.2, cy: mid, tipX: w - 2.4, tipY: mid, baseY: mid };
        default:
            return null;
    }
}

function overlaps(a, b, gap = 0.01) {
    return (
        a.x < b.x + b.w - gap &&
        a.x + a.w > b.x + gap &&
        a.y < b.y + b.d - gap &&
        a.y + a.d > b.y + gap
    );
}

function outOfBounds(fp, layout) {
    return (
        fp.x < -0.001 ||
        fp.y < -0.001 ||
        fp.x + fp.w > layout.width_meters + 0.001 ||
        fp.y + fp.d > layout.height_meters + 0.001
    );
}

function makeTempId() {
    return `tmp-${crypto.randomUUID()}`;
}

function buildState(layout, walls, shelves, coolers, stands, markers) {
    return {
        layout: clone(layout),
        walls: clone(walls),
        shelves: clone(shelves),
        coolers: clone(coolers),
        stands: clone(stands),
        markers: clone(markers),
    };
}

function DraggableRect({
    item,
    scale,
    hallHeight,
    hallWidth,
    gridStepM,
    selected,
    invalid,
    color,
    label,
    canDrag,
    onSelect,
    onMoveEnd,
}) {
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const fp = footprint(item);
    const widthPx = fp.w * BASE_PX_PER_M * scale;
    const heightPx = fp.d * BASE_PX_PER_M * scale;
    const x = svgX(item.pos_x, scale);
    const y = svgY(item.pos_y + fp.d, hallHeight, scale);

    const clampPosition = useCallback(
        (nextX, nextY) => {
            const nextFp = footprint({
                ...item,
                pos_x: snap(nextX, gridStepM),
                pos_y: snap(nextY, gridStepM),
                length_meters: item.length_meters ?? item.depth_meters,
            });
            let px = snap(Math.max(0, nextFp.x), gridStepM);
            let py = snap(Math.max(0, nextFp.y), gridStepM);
            px = Math.min(px, Math.max(0, hallWidth - nextFp.w));
            py = Math.min(py, Math.max(0, hallHeight - nextFp.d));
            return { x: px, y: py };
        },
        [gridStepM, hallHeight, hallWidth, item],
    );

    const handlePointerDown = (e) => {
        if (!canDrag) return;
        e.stopPropagation();
        e.preventDefault();
        onSelect();

        const startClientX = e.clientX;
        const startClientY = e.clientY;
        const startPosX = Number(item.pos_x) || 0;
        const startPosY = Number(item.pos_y) || 0;

        const onPointerMove = (ev) => {
            setDragOffset({
                x: ev.clientX - startClientX,
                y: ev.clientY - startClientY,
            });
        };

        const onPointerUp = (ev) => {
            const dx =
                (ev.clientX - startClientX) / (BASE_PX_PER_M * scale);
            const dy =
                -(ev.clientY - startClientY) / (BASE_PX_PER_M * scale);
            const next = clampPosition(startPosX + dx, startPosY + dy);
            onMoveEnd(next.x, next.y);
            setDragOffset({ x: 0, y: 0 });
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
    };

    return (
        <g transform={`translate(${x + dragOffset.x}, ${y + dragOffset.y})`}>
            <rect
                x={0}
                y={0}
                width={widthPx}
                height={heightPx}
                rx={4}
                fill={invalid ? '#f43f5e' : color}
                fillOpacity={selected ? 0.95 : 0.8}
                stroke={invalid ? '#fecdd3' : selected ? '#f8fafc' : '#0f172a'}
                strokeWidth={selected || invalid ? 2.5 : 1}
                className={clsx(
                    canDrag ? 'cursor-grab' : 'cursor-default',
                    dragOffset.x || dragOffset.y ? 'opacity-90' : '',
                )}
                onPointerDown={handlePointerDown}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                }}
            />
            <text
                x={widthPx / 2}
                y={heightPx / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={Math.min(14, Math.max(9, widthPx / 5))}
                fontWeight={600}
                pointerEvents="none"
            >
                {label}
            </text>
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
    markers: initialMarkers = [],
}) {
    const { flash } = usePage().props;
    const canEdit = useCan()('manage-planograms');
    const canvasRef = useRef(null);

    const [state, setState] = useState(() =>
        buildState(
            initialLayout,
            initialWalls,
            initialShelves,
            initialCoolers,
            initialStands,
            initialMarkers,
        ),
    );
    const [history, setHistory] = useState([]);
    const [future, setFuture] = useState([]);
    const [selected, setSelected] = useState(null); // { kind, id }
    const [tool, setTool] = useState('select'); // select | wall | place:*
    const [wallDraft, setWallDraft] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 40, y: 40 });
    const [cursorMeters, setCursorMeters] = useState({ x: 0, y: 0 });
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [lastSavedAt, setLastSavedAt] = useState(null);
    const panning = useRef(null);

    const gridStepM = (state.layout.grid_size_cm || 50) / 100;
    const scale = zoom;

    const pushHistory = useCallback((prev) => {
        setHistory((h) => [...h.slice(-49), clone(prev)]);
        setFuture([]);
        setDirty(true);
    }, []);

    const applyState = useCallback(
        (updater) => {
            setState((prev) => {
                pushHistory(prev);
                return typeof updater === 'function' ? updater(prev) : updater;
            });
        },
        [pushHistory],
    );

    const undo = useCallback(() => {
        setHistory((h) => {
            if (h.length === 0) return h;
            const prev = h[h.length - 1];
            setFuture((f) => [clone(state), ...f].slice(0, 50));
            setState(clone(prev));
            setDirty(true);
            return h.slice(0, -1);
        });
    }, [state]);

    const redo = useCallback(() => {
        setFuture((f) => {
            if (f.length === 0) return f;
            const next = f[0];
            setHistory((h) => [...h, clone(state)].slice(-50));
            setState(clone(next));
            setDirty(true);
            return f.slice(1);
        });
    }, [state]);

    const allPlaced = useMemo(() => {
        const items = [];
        state.shelves
            .filter((i) => i.on_map)
            .forEach((i) => items.push({ kind: 'shelf', id: i.id, item: i }));
        state.coolers
            .filter((i) => i.on_map)
            .forEach((i) => items.push({ kind: 'cooler', id: i.id, item: i }));
        state.stands
            .filter((i) => i.on_map)
            .forEach((i) => items.push({ kind: 'stand', id: i.id, item: i }));
        state.markers.forEach((i) =>
            items.push({ kind: 'marker', id: i.id, item: i }),
        );
        return items;
    }, [state]);

    const invalidIds = useMemo(() => {
        const bad = new Set();
        const fps = allPlaced.map((entry) => ({
            ...entry,
            fp: footprint({
                ...entry.item,
                length_meters:
                    entry.item.length_meters ?? entry.item.depth_meters,
            }),
        }));

        for (const a of fps) {
            if (outOfBounds(a.fp, state.layout)) {
                bad.add(`${a.kind}:${a.id}`);
            }
            for (const b of fps) {
                if (a.kind === b.kind && a.id === b.id) continue;
                if (overlaps(a.fp, b.fp)) {
                    bad.add(`${a.kind}:${a.id}`);
                    bad.add(`${b.kind}:${b.id}`);
                }
            }
        }
        return bad;
    }, [allPlaced, state.layout]);

    const selectedItem = useMemo(() => {
        if (!selected) return null;
        if (selected.kind === 'marker') {
            return state.markers.find((m) => m.id === selected.id) || null;
        }
        if (selected.kind === 'wall') {
            return state.walls.find((w) => w.id === selected.id) || null;
        }
        const listKey = EQUIP_META[selected.kind]?.listKey;
        if (!listKey) return null;
        return state[listKey].find((i) => i.id === selected.id) || null;
    }, [selected, state]);

    const buildPayload = useCallback(() => {
        return {
            layout: state.layout,
            walls: state.walls.map((w) => ({
                id: String(w.id).startsWith('tmp-') ? null : w.id,
                start_x: w.start_x,
                start_y: w.start_y,
                end_x: w.end_x,
                end_y: w.end_y,
                wall_type: w.wall_type || 'wall',
            })),
            shelves: state.shelves.map((i) => ({
                id: i.id,
                pos_x: i.on_map ? i.pos_x : -1,
                pos_y: i.on_map ? i.pos_y : -1,
                rotation: i.rotation || 0,
                on_map: !!i.on_map,
            })),
            coolers: state.coolers.map((i) => ({
                id: i.id,
                pos_x: i.on_map ? i.pos_x : -1,
                pos_y: i.on_map ? i.pos_y : -1,
                rotation: i.rotation || 0,
                on_map: !!i.on_map,
            })),
            stands: state.stands.map((i) => ({
                id: i.id,
                pos_x: i.on_map ? i.pos_x : -1,
                pos_y: i.on_map ? i.pos_y : -1,
                rotation: i.rotation || 0,
                on_map: !!i.on_map,
            })),
            markers: state.markers.map((m) => ({
                id: m.id,
                marker_type: m.marker_type,
                code: m.code,
                pos_x: m.pos_x,
                pos_y: m.pos_y,
                rotation: m.rotation || 0,
                width_meters: m.width_meters,
                depth_meters: m.depth_meters,
                color: m.color,
            })),
        };
    }, [state]);

    const save = useCallback(
        async ({ silent = false } = {}) => {
            if (!canEdit || saving) return;
            if (invalidIds.size > 0) {
                if (!silent) {
                    fireError(
                        'Есть пересечения или выход за границы. Исправьте перед сохранением.',
                    );
                }
                return;
            }

            setSaving(true);
            try {
                const { data } = await axios.post(
                    route('floor-plan.save', store.id),
                    buildPayload(),
                );
                setDirty(false);
                setLastSavedAt(new Date());
                if (data?.payload) {
                    setState(
                        buildState(
                            data.payload.layout,
                            data.payload.walls || [],
                            data.payload.shelves || [],
                            data.payload.coolers || [],
                            data.payload.stands || [],
                            data.payload.markers || [],
                        ),
                    );
                    setSelected(null);
                }
                if (!silent) fireSuccess(data?.message || 'Карта зала сохранена');
            } catch (error) {
                const msg =
                    error?.response?.data?.message ||
                    error?.response?.data?.errors ||
                    'Не удалось сохранить';
                if (!silent) {
                    fireError(
                        typeof msg === 'string'
                            ? msg
                            : 'Ошибка валидации при сохранении',
                    );
                }
            } finally {
                setSaving(false);
            }
        },
        [buildPayload, canEdit, invalidIds.size, saving, store.id],
    );

    // Autosave every 30s
    useEffect(() => {
        if (flash?.success) fireSuccess(flash.success);
        if (flash?.error) fireError(flash.error);
    }, [flash]);

    useEffect(() => {
        if (!canEdit) return undefined;
        const timer = window.setInterval(() => {
            if (dirty && !saving && invalidIds.size === 0) {
                save({ silent: true });
            }
        }, 30000);
        return () => window.clearInterval(timer);
    }, [canEdit, dirty, invalidIds.size, save, saving]);

    // Keyboard shortcuts
    useEffect(() => {
        const onKey = (e) => {
            const meta = e.ctrlKey || e.metaKey;
            if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            if (
                (meta && e.key.toLowerCase() === 'y') ||
                (meta && e.shiftKey && e.key.toLowerCase() === 'z')
            ) {
                e.preventDefault();
                redo();
            }
            if (meta && e.key.toLowerCase() === 's') {
                e.preventDefault();
                save();
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selected && document.activeElement?.tagName !== 'INPUT') {
                    e.preventDefault();
                    deleteSelected();
                }
            }
            if (e.key === 'Escape') {
                setTool('select');
                setWallDraft(null);
                setSelected(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [undo, redo, save, selected]);

    const clientToMeters = (clientX, clientY) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        const sx = (clientX - rect.left - pan.x) / (BASE_PX_PER_M * scale);
        const syFromTop = (clientY - rect.top - pan.y) / (BASE_PX_PER_M * scale);
        const x = snap(
            Math.min(
                state.layout.width_meters,
                Math.max(0, sx),
            ),
            gridStepM,
        );
        const y = snap(
            Math.min(
                state.layout.height_meters,
                Math.max(0, state.layout.height_meters - syFromTop),
            ),
            gridStepM,
        );
        return { x, y };
    };

    const placeEquipment = (kind, x, y) => {
        const listKey = EQUIP_META[kind].listKey;
        const free = state[listKey].find((i) => !i.on_map);
        if (!free) {
            fireError(
                `Нет свободных объектов «${EQUIP_META[kind].label}». Создайте их в разделе оборудования магазина.`,
            );
            setTool('select');
            return;
        }

        applyState((prev) => ({
            ...prev,
            [listKey]: prev[listKey].map((item) =>
                item.id === free.id
                    ? {
                          ...item,
                          on_map: true,
                          pos_x: x,
                          pos_y: y,
                          rotation: item.rotation || 0,
                      }
                    : item,
            ),
        }));
        setSelected({ kind, id: free.id });
        setTool('select');
    };

    const placeMarker = (markerType, x, y) => {
        const meta = MARKER_META[markerType];
        const count =
            state.markers.filter((m) => m.marker_type === markerType).length + 1;
        const prefix =
            markerType === 'cash_register'
                ? 'CR'
                : markerType === 'beacon'
                  ? 'BC'
                  : markerType === 'entrance'
                    ? 'IN'
                    : 'OUT';
        const id = makeTempId();
        const marker = {
            id,
            marker_type: markerType,
            code: `${prefix}-${String(count).padStart(2, '0')}`,
            pos_x: x,
            pos_y: y,
            rotation: 0,
            width_meters: meta.w,
            depth_meters: meta.d,
            color: meta.color,
            on_map: true,
        };
        applyState((prev) => ({
            ...prev,
            markers: [...prev.markers, marker],
        }));
        setSelected({ kind: 'marker', id });
        setTool('select');
    };

    const onCanvasClick = (e) => {
        if (!canEdit) return;
        if (e.target !== canvasRef.current && e.target.tagName !== 'svg' && e.target.getAttribute('data-canvas') !== '1') {
            // allow clicking empty svg background
            if (e.target.tagName !== 'rect' || e.target.getAttribute('data-grid') !== '1') {
                if (!tool.startsWith('place:') && tool !== 'wall') {
                    return;
                }
            }
        }

        const { x, y } = clientToMeters(e.clientX, e.clientY);

        if (tool === 'wall') {
            if (!wallDraft) {
                setWallDraft({ start_x: x, start_y: y });
                return;
            }
            const id = makeTempId();
            applyState((prev) => ({
                ...prev,
                walls: [
                    ...prev.walls,
                    {
                        id,
                        start_x: wallDraft.start_x,
                        start_y: wallDraft.start_y,
                        end_x: x,
                        end_y: y,
                        wall_type: 'wall',
                    },
                ],
            }));
            setWallDraft(null);
            setSelected({ kind: 'wall', id });
            setTool('select');
            return;
        }

        if (tool.startsWith('place:')) {
            const placeType = tool.slice(6);
            if (EQUIP_META[placeType]) {
                placeEquipment(placeType, x, y);
            } else if (MARKER_META[placeType]) {
                placeMarker(placeType, x, y);
            }
            return;
        }

        setSelected(null);
    };

    const moveItem = useCallback(
        (kind, id, x, y) => {
            if (!canEdit) return;

            applyState((prev) => {
                const next = clone(prev);
                const patch = { pos_x: x, pos_y: y };

                if (kind === 'marker') {
                    next.markers = next.markers.map((m) =>
                        m.id === id ? { ...m, ...patch } : m,
                    );
                } else {
                    const listKey = EQUIP_META[kind]?.listKey;
                    if (listKey) {
                        next[listKey] = next[listKey].map((item) =>
                            item.id === id ? { ...item, ...patch } : item,
                        );
                    }
                }

                return next;
            });
            setSelected({ kind, id });
        },
        [applyState, canEdit],
    );

    const updateSelected = (patch) => {
        if (!selected) return;
        applyState((prev) => {
            const next = clone(prev);
            if (selected.kind === 'marker') {
                next.markers = next.markers.map((m) =>
                    m.id === selected.id ? { ...m, ...patch } : m,
                );
            } else if (selected.kind === 'wall') {
                next.walls = next.walls.map((w) =>
                    w.id === selected.id ? { ...w, ...patch } : w,
                );
            } else {
                const listKey = EQUIP_META[selected.kind]?.listKey;
                if (listKey) {
                    next[listKey] = next[listKey].map((item) =>
                        item.id === selected.id ? { ...item, ...patch } : item,
                    );
                }
            }
            return next;
        });
    };

    const deleteSelected = () => {
        if (!selected || !canEdit) return;
        applyState((prev) => {
            const next = clone(prev);
            if (selected.kind === 'marker') {
                next.markers = next.markers.filter((m) => m.id !== selected.id);
            } else if (selected.kind === 'wall') {
                next.walls = next.walls.filter((w) => w.id !== selected.id);
            } else {
                const listKey = EQUIP_META[selected.kind]?.listKey;
                if (listKey) {
                    next[listKey] = next[listKey].map((item) =>
                        item.id === selected.id
                            ? {
                                  ...item,
                                  on_map: false,
                                  pos_x: 0,
                                  pos_y: 0,
                                  rotation: 0,
                              }
                            : item,
                    );
                }
            }
            return next;
        });
        setSelected(null);
    };

    const exportJson = () => {
        const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `floor-plan-${store.id}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const canvasW = state.layout.width_meters * BASE_PX_PER_M * scale;
    const canvasH = state.layout.height_meters * BASE_PX_PER_M * scale;
    const statusCell = gridCell(cursorMeters.x, cursorMeters.y, state.layout.grid_size_cm);

    const inputClass =
        'mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none';

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b1220] text-slate-100">
            <Head title={`Карта зала — ${store.name}`} />

            {/* Header */}
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#111827] px-3">
                <div className="flex min-w-0 items-center gap-3">
                    <Link
                        href={route('floor-plan.stores')}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Назад
                    </Link>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                            {store.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                            {dirty
                                ? 'Есть несохранённые изменения'
                                : lastSavedAt
                                  ? `Сохранено ${lastSavedAt.toLocaleTimeString('ru-RU')}`
                                  : 'Редактор карты зала'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={undo}
                        disabled={history.length === 0}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        title="Undo (Ctrl+Z)"
                    >
                        <ArrowUturnLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={redo}
                        disabled={future.length === 0}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                        title="Redo (Ctrl+Y)"
                    >
                        <ArrowUturnRightIcon className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - 0.15))}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                    >
                        <MagnifyingGlassMinusIcon className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-xs text-slate-400">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + 0.15))}
                        className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
                    >
                        <MagnifyingGlassPlusIcon className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={exportJson}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Экспорт
                    </button>
                    {canEdit ? (
                        <button
                            type="button"
                            onClick={() => save()}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                        >
                            <ArrowPathIcon
                                className={clsx('h-4 w-4', saving && 'animate-spin')}
                            />
                            Сохранить
                        </button>
                    ) : null}
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Left panel */}
                <aside className="flex w-[200px] shrink-0 flex-col border-r border-slate-800 bg-[#111827]">
                    <div className="border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Элементы
                    </div>
                    <div className="space-y-1 p-2">
                        <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                                setTool('select');
                                setWallDraft(null);
                            }}
                            className={clsx(
                                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                                tool === 'select'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800',
                            )}
                        >
                            <span>↖</span>
                            <span className="truncate">Выбор / перемещение</span>
                        </button>
                        {Object.entries(EQUIP_META).map(([key, meta]) => (
                            <button
                                key={key}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => setTool(`place:${key}`)}
                                className={clsx(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                                    tool === `place:${key}`
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800',
                                )}
                            >
                                <span>{meta.emoji}</span>
                                <span className="truncate">{meta.label}</span>
                            </button>
                        ))}
                        <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => {
                                setTool('wall');
                                setWallDraft(null);
                            }}
                            className={clsx(
                                'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                                tool === 'wall'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-300 hover:bg-slate-800',
                            )}
                        >
                            <span>🧱</span>
                            <span>Стена</span>
                        </button>
                        {Object.entries(MARKER_META).map(([key, meta]) => (
                            <button
                                key={key}
                                type="button"
                                disabled={!canEdit}
                                onClick={() => setTool(`place:${key}`)}
                                className={clsx(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm',
                                    tool === `place:${key}`
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-300 hover:bg-slate-800',
                                )}
                            >
                                <span>{meta.emoji}</span>
                                <span className="truncate">{meta.label}</span>
                            </button>
                        ))}
                    </div>

                    <div className="border-b border-t border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Свойства
                    </div>
                    <div className="flex-1 overflow-y-auto p-3">
                        {!selectedItem ? (
                            <p className="text-xs text-slate-500">
                                «Выбор / перемещение» — тащите объект мышью.
                                Другие инструменты — только для добавления.
                            </p>
                        ) : selected.kind === 'wall' ? (
                            <div className="space-y-2 text-xs">
                                <p className="font-medium text-white">Стена</p>
                                <p className="text-slate-400">
                                    ({selectedItem.start_x}, {selectedItem.start_y}) → (
                                    {selectedItem.end_x}, {selectedItem.end_y})
                                </p>
                                {canEdit ? (
                                    <button
                                        type="button"
                                        onClick={deleteSelected}
                                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600/20 px-2 py-1.5 text-rose-300 hover:bg-rose-600/30"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        Удалить
                                    </button>
                                ) : null}
                            </div>
                        ) : (
                            <div className="space-y-2 text-xs">
                                <label className="block text-slate-400">
                                    Тип
                                    <p className="mt-1 font-medium text-white">
                                        {selected.kind === 'marker'
                                            ? MARKER_META[selectedItem.marker_type]
                                                  ?.label
                                            : EQUIP_META[selected.kind]?.label}
                                    </p>
                                </label>
                                <label className="block text-slate-400">
                                    Код
                                    <input
                                        className={inputClass}
                                        value={selectedItem.code || ''}
                                        disabled={!canEdit || selected.kind !== 'marker'}
                                        onChange={(e) =>
                                            updateSelected({ code: e.target.value })
                                        }
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block text-slate-400">
                                        X (м)
                                        <input
                                            type="number"
                                            step={gridStepM}
                                            className={inputClass}
                                            value={selectedItem.pos_x}
                                            disabled={!canEdit}
                                            onChange={(e) =>
                                                updateSelected({
                                                    pos_x: snap(
                                                        Number(e.target.value) || 0,
                                                        gridStepM,
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                    <label className="block text-slate-400">
                                        Y (м)
                                        <input
                                            type="number"
                                            step={gridStepM}
                                            className={inputClass}
                                            value={selectedItem.pos_y}
                                            disabled={!canEdit}
                                            onChange={(e) =>
                                                updateSelected({
                                                    pos_y: snap(
                                                        Number(e.target.value) || 0,
                                                        gridStepM,
                                                    ),
                                                })
                                            }
                                        />
                                    </label>
                                </div>
                                <p className="text-slate-500">
                                    Ячейка:{' '}
                                    <span className="text-slate-300">
                                        {gridCell(
                                            selectedItem.pos_x,
                                            selectedItem.pos_y,
                                            state.layout.grid_size_cm,
                                        )}
                                    </span>
                                </p>
                                <label className="block text-slate-400">
                                    Поворот
                                    <select
                                        className={inputClass}
                                        value={selectedItem.rotation || 0}
                                        disabled={!canEdit}
                                        onChange={(e) =>
                                            updateSelected({
                                                rotation: Number(e.target.value),
                                            })
                                        }
                                    >
                                        {ROTATIONS.map((r) => (
                                            <option key={r} value={r}>
                                                {r}°
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                {selected.kind === 'marker' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block text-slate-400">
                                                Ширина
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className={inputClass}
                                                    value={selectedItem.width_meters}
                                                    disabled={!canEdit}
                                                    onChange={(e) =>
                                                        updateSelected({
                                                            width_meters: Number(
                                                                e.target.value,
                                                            ),
                                                        })
                                                    }
                                                />
                                            </label>
                                            <label className="block text-slate-400">
                                                Глубина
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    className={inputClass}
                                                    value={selectedItem.depth_meters}
                                                    disabled={!canEdit}
                                                    onChange={(e) =>
                                                        updateSelected({
                                                            depth_meters: Number(
                                                                e.target.value,
                                                            ),
                                                        })
                                                    }
                                                />
                                            </label>
                                        </div>
                                        <label className="block text-slate-400">
                                            Цвет
                                            <input
                                                type="color"
                                                className="mt-1 h-9 w-full cursor-pointer rounded-md border border-slate-700 bg-slate-950"
                                                value={selectedItem.color || '#6366f1'}
                                                disabled={!canEdit}
                                                onChange={(e) =>
                                                    updateSelected({
                                                        color: e.target.value,
                                                    })
                                                }
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <p className="text-slate-500">
                                        Размер:{' '}
                                        {selectedItem.width_meters}×
                                        {selectedItem.length_meters} м
                                    </p>
                                )}
                                {canEdit ? (
                                    <button
                                        type="button"
                                        onClick={deleteSelected}
                                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-rose-600/20 px-2 py-1.5 text-rose-300 hover:bg-rose-600/30"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                        Удалить
                                    </button>
                                ) : null}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Canvas */}
                <div
                    ref={canvasRef}
                    className={clsx(
                        'relative min-w-0 flex-1 overflow-hidden bg-[#0b1220]',
                        tool !== 'select' && 'cursor-crosshair',
                    )}
                    onMouseMove={(e) => {
                        const m = clientToMeters(e.clientX, e.clientY);
                        setCursorMeters(m);
                        if (panning.current) {
                            setPan({
                                x: e.clientX - panning.current.startX + panning.current.originX,
                                y: e.clientY - panning.current.startY + panning.current.originY,
                            });
                        }
                    }}
                    onMouseDown={(e) => {
                        if (e.button === 1 || (e.button === 0 && e.spaceKey)) {
                            panning.current = {
                                startX: e.clientX,
                                startY: e.clientY,
                                originX: pan.x,
                                originY: pan.y,
                            };
                        }
                    }}
                    onMouseUp={() => {
                        panning.current = null;
                    }}
                    onMouseLeave={() => {
                        panning.current = null;
                    }}
                    onWheel={(e) => {
                        e.preventDefault();
                        const delta = e.deltaY > 0 ? -0.08 : 0.08;
                        setZoom((z) =>
                            Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z + delta)),
                        );
                    }}
                    onClick={onCanvasClick}
                >
                        <svg
                            width={canvasW + pan.x + 80}
                            height={canvasH + pan.y + 80}
                            className="block"
                        >
                            <g transform={`translate(${pan.x}, ${pan.y})`}>
                                {/* Floor bounds */}
                                <rect
                                    data-canvas="1"
                                    data-grid="1"
                                    x={0}
                                    y={0}
                                    width={state.layout.width_meters * BASE_PX_PER_M * scale}
                                    height={
                                        state.layout.height_meters *
                                        BASE_PX_PER_M *
                                        scale
                                    }
                                    fill="#152033"
                                    stroke="#38bdf8"
                                    strokeWidth={3}
                                />

                                {/* Compass labels */}
                                <text
                                    x={(state.layout.width_meters * BASE_PX_PER_M * scale) / 2}
                                    y={-8}
                                    textAnchor="middle"
                                    fill="#64748b"
                                    fontSize={11}
                                >
                                    С (Y→)
                                </text>
                                <text
                                    x={(state.layout.width_meters * BASE_PX_PER_M * scale) / 2}
                                    y={
                                        state.layout.height_meters *
                                            BASE_PX_PER_M *
                                            scale +
                                        14
                                    }
                                    textAnchor="middle"
                                    fill="#64748b"
                                    fontSize={11}
                                >
                                    Ю (0,0) → В +X
                                </text>

                                {/* Cash zone */}
                                {(() => {
                                    const zone = cashZoneRect(state.layout);
                                    if (!zone) return null;
                                    return (
                                        <rect
                                            x={svgX(zone.x, scale)}
                                            y={svgY(zone.y + zone.d, state.layout.height_meters, scale)}
                                            width={zone.w * BASE_PX_PER_M}
                                            height={zone.d * BASE_PX_PER_M}
                                            fill="#eab308"
                                            fillOpacity={0.12}
                                            stroke="#eab308"
                                            strokeOpacity={0.45}
                                            strokeWidth={1.5}
                                            strokeDasharray="6 4"
                                        />
                                    );
                                })()}

                                {/* Grid */}
                                {Array.from({
                                    length:
                                        Math.floor(
                                            state.layout.width_meters / gridStepM,
                                        ) + 1,
                                }).map((_, i) => (
                                    <line
                                        key={`vx-${i}`}
                                        x1={i * gridStepM * BASE_PX_PER_M * scale}
                                        y1={0}
                                        x2={i * gridStepM * BASE_PX_PER_M * scale}
                                        y2={
                                            state.layout.height_meters *
                                            BASE_PX_PER_M *
                                            scale
                                        }
                                        stroke="#1e293b"
                                        strokeWidth={i % 2 === 0 ? 1 : 0.5}
                                    />
                                ))}
                                {Array.from({
                                    length:
                                        Math.floor(
                                            state.layout.height_meters / gridStepM,
                                        ) + 1,
                                }).map((_, i) => (
                                    <line
                                        key={`hy-${i}`}
                                        x1={0}
                                        y1={i * gridStepM * BASE_PX_PER_M * scale}
                                        x2={
                                            state.layout.width_meters *
                                            BASE_PX_PER_M *
                                            scale
                                        }
                                        y2={i * gridStepM * BASE_PX_PER_M * scale}
                                        stroke="#1e293b"
                                        strokeWidth={i % 2 === 0 ? 1 : 0.5}
                                    />
                                ))}

                                {/* Walls */}
                                {state.walls.map((wall) => {
                                    const isDoor = wall.wall_type === 'door';
                                    const isSelected =
                                        selected?.kind === 'wall' &&
                                        selected.id === wall.id;
                                    return (
                                        <line
                                            key={wall.id}
                                            x1={svgX(wall.start_x, scale)}
                                            y1={svgY(
                                                wall.start_y,
                                                state.layout.height_meters,
                                                scale,
                                            )}
                                            x2={svgX(wall.end_x, scale)}
                                            y2={svgY(
                                                wall.end_y,
                                                state.layout.height_meters,
                                                scale,
                                            )}
                                            stroke={
                                                isSelected
                                                    ? '#f8fafc'
                                                    : isDoor
                                                      ? '#22c55e'
                                                      : '#94a3b8'
                                            }
                                            strokeWidth={isSelected ? 5 : isDoor ? 3 : 4}
                                            strokeLinecap="round"
                                            strokeDasharray={isDoor ? '8 6' : undefined}
                                            className="cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelected({
                                                    kind: 'wall',
                                                    id: wall.id,
                                                });
                                            }}
                                        />
                                    );
                                })}

                                {/* Entrance arrow (into hall) */}
                                {(() => {
                                    const arrow = entranceArrow(state.layout);
                                    if (!arrow) return null;
                                    const h = state.layout.height_meters;
                                    const tip = {
                                        x: svgX(arrow.tipX, scale),
                                        y: svgY(arrow.tipY, h, scale),
                                    };
                                    const side = state.layout.entrance_side;
                                    let p1;
                                    let p2;
                                    if (side === 'south' || side === 'north') {
                                        p1 = {
                                            x: svgX(arrow.cx - 0.45, scale),
                                            y: svgY(arrow.baseY, h, scale),
                                        };
                                        p2 = {
                                            x: svgX(arrow.cx + 0.45, scale),
                                            y: svgY(arrow.baseY, h, scale),
                                        };
                                    } else {
                                        p1 = {
                                            x: svgX(arrow.baseY === arrow.cy ? arrow.cx : arrow.baseY, scale),
                                            y: svgY(arrow.cy - 0.45, h, scale),
                                        };
                                        // fix west/east base
                                        const baseX =
                                            side === 'west' ? arrow.cx - 0.8 : arrow.cx + 0.8;
                                        p1 = {
                                            x: svgX(baseX, scale),
                                            y: svgY(arrow.cy - 0.45, h, scale),
                                        };
                                        p2 = {
                                            x: svgX(baseX, scale),
                                            y: svgY(arrow.cy + 0.45, h, scale),
                                        };
                                    }
                                    return (
                                        <polygon
                                            points={`${tip.x},${tip.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
                                            fill="#22c55e"
                                            fillOpacity={0.9}
                                            stroke="#bbf7d0"
                                            strokeWidth={1}
                                        />
                                    );
                                })()}

                                {wallDraft ? (
                                    <circle
                                        cx={svgX(wallDraft.start_x, scale)}
                                        cy={svgY(
                                            wallDraft.start_y,
                                            state.layout.height_meters,
                                            scale,
                                        )}
                                        r={4}
                                        fill="#38bdf8"
                                    />
                                ) : null}

                                {/* Equipment */}
                                {['shelf', 'cooler', 'stand'].map((kind) =>
                                    state[EQUIP_META[kind].listKey]
                                        .filter((i) => i.on_map)
                                        .map((item) => (
                                            <DraggableRect
                                                key={`${kind}-${item.id}`}
                                                item={item}
                                                scale={scale}
                                                hallHeight={state.layout.height_meters}
                                                hallWidth={state.layout.width_meters}
                                                gridStepM={gridStepM}
                                                canDrag={canEdit && tool === 'select'}
                                                selected={
                                                    selected?.kind === kind &&
                                                    selected.id === item.id
                                                }
                                                invalid={invalidIds.has(
                                                    `${kind}:${item.id}`,
                                                )}
                                                color={item.color || EQUIP_META[kind].color}
                                                label={item.code}
                                                onSelect={() =>
                                                    setSelected({ kind, id: item.id })
                                                }
                                                onMoveEnd={(x, y) =>
                                                    moveItem(kind, item.id, x, y)
                                                }
                                            />
                                        )),
                                )}

                                {/* Markers */}
                                {state.markers.map((marker) => (
                                    <DraggableRect
                                        key={marker.id}
                                        item={{
                                            ...marker,
                                            length_meters: marker.depth_meters,
                                        }}
                                        scale={scale}
                                        hallHeight={state.layout.height_meters}
                                        hallWidth={state.layout.width_meters}
                                        gridStepM={gridStepM}
                                        canDrag={canEdit && tool === 'select'}
                                        selected={
                                            selected?.kind === 'marker' &&
                                            selected.id === marker.id
                                        }
                                        invalid={invalidIds.has(
                                            `marker:${marker.id}`,
                                        )}
                                        color={
                                            marker.color ||
                                            MARKER_META[marker.marker_type]?.color
                                        }
                                        label={marker.code}
                                        onSelect={() =>
                                            setSelected({
                                                kind: 'marker',
                                                id: marker.id,
                                            })
                                        }
                                        onMoveEnd={(x, y) =>
                                            moveItem('marker', marker.id, x, y)
                                        }
                                    />
                                ))}
                            </g>
                        </svg>

                    {tool !== 'select' ? (
                        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-indigo-600/90 px-3 py-1 text-xs font-medium text-white shadow">
                            {tool === 'wall'
                                ? wallDraft
                                    ? 'Кликните конечную точку стены'
                                    : 'Кликните начальную точку стены'
                                : 'Кликните на холст, чтобы разместить элемент'}
                        </div>
                    ) : (
                        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-emerald-700/90 px-3 py-1 text-xs font-medium text-white shadow">
                            Перетащите объект мышью, чтобы переместить
                        </div>
                    )}
                </div>
            </div>

            {/* Status bar */}
            <footer className="flex h-8 shrink-0 items-center justify-between border-t border-slate-800 bg-[#111827] px-3 text-[11px] text-slate-400">
                <div className="flex gap-4">
                    <span>
                        X: {cursorMeters.x.toFixed(2)} м · Y:{' '}
                        {cursorMeters.y.toFixed(2)} м (SW 0,0)
                    </span>
                    <span>Ячейка: {statusCell}</span>
                    <span>
                        Сетка: {state.layout.grid_size_cm} см · Зал:{' '}
                        {state.layout.width_meters}×{state.layout.height_meters} м
                    </span>
                </div>
                <div className="flex gap-3">
                    {invalidIds.size > 0 ? (
                        <span className="font-medium text-rose-400">
                            Ошибок размещения: {invalidIds.size}
                        </span>
                    ) : (
                        <span className="text-emerald-400">OK</span>
                    )}
                    <span>{canEdit ? 'Редактирование' : 'Только просмотр'}</span>
                </div>
            </footer>
        </div>
    );
}
