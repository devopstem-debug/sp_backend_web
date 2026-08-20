import { useMemo } from 'react';

const PALETTE = [
    '#6366F1',
    '#0EA5E9',
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#14B8A6',
    '#F97316',
];

const PADDING_X = 40;
const PADDING_Y = 24;
const LEVEL_GAP = 16;
const LABEL_HEIGHT = 18;
const MIN_LEVEL_PX = 56;
const PX_PER_CM = 4;
const HEIGHT_SCALE = 1.2;

function truncate(text, max) {
    if (!text) {
        return '';
    }
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default function ShelfView({ shelf }) {
    const layout = useMemo(() => {
        if (!shelf) {
            return null;
        }

        const widthCm = Math.max(Number(shelf.width_cm) || 120, 1);
        const contentWidth = widthCm * PX_PER_CM;
        const svgWidth = contentWidth + PADDING_X * 2;

        let y = PADDING_Y;
        const levels = (shelf.levels || []).map((level, levelIndex) => {
            const heightCm = Math.max(Number(level.height_cm) || 30, 10);
            const levelHeight = Math.max(heightCm * HEIGHT_SCALE, MIN_LEVEL_PX);
            const top = y;
            y += levelHeight + LEVEL_GAP + LABEL_HEIGHT;

            const placements = (level.placements || []).map(
                (placement, index) => {
                    const start = Math.max(0, Number(placement.start_cm) || 0);
                    const end = Math.min(
                        widthCm,
                        Number(placement.end_cm) || start,
                    );
                    const x = PADDING_X + start * PX_PER_CM;
                    const w = Math.max((end - start) * PX_PER_CM, 4);
                    const color = PALETTE[index % PALETTE.length];

                    return {
                        ...placement,
                        x,
                        y: top + 4,
                        width: w,
                        height: levelHeight - 8,
                        color,
                    };
                },
            );

            return {
                ...level,
                top,
                height: levelHeight,
                placements,
                labelY: top + levelHeight + 12,
            };
        });

        return {
            svgWidth,
            svgHeight: Math.max(y + PADDING_Y, 200),
            contentWidth,
            widthCm,
            levels,
        };
    }, [shelf]);

    if (!shelf || !layout) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-400">
                Выберите стеллаж, чтобы открыть планограмму
            </div>
        );
    }

    if (layout.levels.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <p className="text-sm font-medium text-slate-200">
                    {shelf.code} — {shelf.name}
                </p>
                <p className="text-sm text-slate-400">
                    У стеллажа пока нет полок
                </p>
            </div>
        );
    }

    return (
        <div className="h-full overflow-auto bg-[#0e172b] p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-base font-semibold text-white">
                    <span className="font-mono text-indigo-600">
                        {shelf.code}
                    </span>{' '}
                    {shelf.name}
                </h2>
                <p className="text-sm text-slate-400">
                    {[shelf.store_name, shelf.department_name]
                        .filter(Boolean)
                        .join(' · ')}
                    {' · '}
                    ширина {shelf.width_cm} см
                </p>
            </div>

            <div className="inline-block min-w-full rounded-xl bg-[#152033] p-2 shadow-sm ring-1 ring-slate-800 sm:p-4">
                <svg
                    viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
                    width={layout.svgWidth}
                    height={layout.svgHeight}
                    className="mx-auto max-w-full"
                    role="img"
                    aria-label={`Планограмма ${shelf.code}`}
                >
                    <defs>
                        <pattern
                            id="shelf-grid"
                            width="20"
                            height="20"
                            patternUnits="userSpaceOnUse"
                        >
                            <path
                                d="M 20 0 L 0 0 0 20"
                                fill="none"
                                stroke="#F1F5F9"
                                strokeWidth="1"
                            />
                        </pattern>
                    </defs>

                    <rect
                        x={0}
                        y={0}
                        width={layout.svgWidth}
                        height={layout.svgHeight}
                        fill="url(#shelf-grid)"
                    />

                    {/* Scale ruler */}
                    <g>
                        <line
                            x1={PADDING_X}
                            y1={12}
                            x2={PADDING_X + layout.contentWidth}
                            y2={12}
                            stroke="#94A3B8"
                            strokeWidth="1"
                        />
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                            const cm = Math.round(layout.widthCm * ratio);
                            const x = PADDING_X + cm * PX_PER_CM;

                            return (
                                <g key={ratio}>
                                    <line
                                        x1={x}
                                        y1={8}
                                        x2={x}
                                        y2={16}
                                        stroke="#94A3B8"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={x}
                                        y={6}
                                        textAnchor="middle"
                                        className="fill-slate-400"
                                        style={{ fontSize: 10 }}
                                    >
                                        {cm}
                                    </text>
                                </g>
                            );
                        })}
                    </g>

                    {layout.levels.map((level) => (
                        <g key={level.id}>
                            <rect
                                x={PADDING_X}
                                y={level.top}
                                width={layout.contentWidth}
                                height={level.height}
                                rx={6}
                                fill="#F8FAFC"
                                stroke="#CBD5E1"
                                strokeWidth="1.5"
                            />

                            <text
                                x={PADDING_X - 8}
                                y={level.top + level.height / 2}
                                textAnchor="end"
                                dominantBaseline="middle"
                                className="fill-slate-500"
                                style={{ fontSize: 11, fontWeight: 600 }}
                            >
                                №{level.level_number}
                            </text>

                            {level.placements.map((placement) => {
                                const canFitLabel = placement.width >= 36;
                                const name = truncate(
                                    placement.product_name || 'Товар',
                                    placement.width >= 80 ? 14 : 8,
                                );

                                return (
                                    <g key={placement.id}>
                                        <rect
                                            x={placement.x}
                                            y={placement.y}
                                            width={placement.width}
                                            height={placement.height}
                                            rx={4}
                                            fill={placement.color}
                                            fillOpacity={0.85}
                                            stroke="#1E293B"
                                            strokeOpacity={0.15}
                                            strokeWidth="1"
                                        >
                                            <title>
                                                {placement.product_name}
                                                {'\n'}
                                                {placement.start_cm}–
                                                {placement.end_cm} см · фейсинг{' '}
                                                {placement.facings}
                                            </title>
                                        </rect>

                                        {canFitLabel && (
                                            <>
                                                <text
                                                    x={
                                                        placement.x +
                                                        placement.width / 2
                                                    }
                                                    y={
                                                        placement.y +
                                                        placement.height / 2 -
                                                        6
                                                    }
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#FFFFFF"
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    {name}
                                                </text>
                                                <text
                                                    x={
                                                        placement.x +
                                                        placement.width / 2
                                                    }
                                                    y={
                                                        placement.y +
                                                        placement.height / 2 +
                                                        10
                                                    }
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#FFFFFF"
                                                    fillOpacity={0.9}
                                                    style={{ fontSize: 10 }}
                                                >
                                                    ×{placement.facings}
                                                </text>
                                            </>
                                        )}
                                    </g>
                                );
                            })}

                            <text
                                x={PADDING_X}
                                y={level.labelY}
                                className="fill-slate-400"
                                style={{ fontSize: 10 }}
                            >
                                Высота {level.height_cm} см · товаров{' '}
                                {level.placements.length}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
}
