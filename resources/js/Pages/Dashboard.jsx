import AdminLayout from '@/layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRightIcon,
    ArrowUpRightIcon,
    BuildingStorefrontIcon,
    CubeIcon,
    MinusIcon,
    Squares2X2Icon,
    TableCellsIcon,
    TagIcon,
    ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const CATEGORY_COLORS = [
    '#818cf8',
    '#34d399',
    '#fbbf24',
    '#f472b6',
    '#38bdf8',
];

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' },
    }),
};

function formatGrowth(growth) {
    const delta = Number(growth?.delta ?? 0);
    const thisWeek = Number(growth?.this_week ?? 0);

    return { delta, thisWeek };
}

function GrowthBadge({ growth }) {
    const { delta, thisWeek } = formatGrowth(growth);
    const positive = delta > 0;
    const negative = delta < 0;
    const Icon = positive
        ? ArrowUpRightIcon
        : negative
          ? ArrowDownRightIcon
          : MinusIcon;

    const tone = positive
        ? 'text-emerald-400 bg-emerald-500/10'
        : negative
          ? 'text-rose-400 bg-rose-500/10'
          : 'text-slate-400 bg-[#0e172b]0/10';

    const sign = positive ? '+' : '';

    return (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${tone}`}
            >
                <Icon className="h-3.5 w-3.5" />
                {sign}
                {delta}
            </span>
            <span className="text-slate-500">за неделю · новых {thisWeek}</span>
        </div>
    );
}

function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    try {
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(value));
    } catch {
        return value;
    }
}

function formatShortDate(value) {
    try {
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: 'short',
        }).format(new Date(`${value}T00:00:00`));
    } catch {
        return value;
    }
}

function ChartTooltip({ active, payload, label, valueSuffix = '' }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
            {label && <div className="mb-1 text-slate-400">{label}</div>}
            {payload.map((item) => (
                <div key={item.name} className="font-medium text-slate-100">
                    {item.name}: {item.value}
                    {valueSuffix}
                </div>
            ))}
        </div>
    );
}

function Card({ children, className = '', delay = 0 }) {
    return (
        <motion.div
            custom={delay}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg shadow-black/20 ${className}`}
        >
            {children}
        </motion.div>
    );
}

export default function Dashboard({
    stats = {},
    stores_growth = {},
    products_growth = {},
    products_by_category = [],
    shelf_fill_rate = [],
    recent_activity = [],
    recent_logins = [],
    activity_by_day = [],
}) {
    const statCards = [
        {
            key: 'stores',
            label: 'Магазины',
            href: '/stores',
            icon: BuildingStorefrontIcon,
            iconTone: 'bg-indigo-500/15 text-indigo-300',
            growth: stores_growth,
        },
        {
            key: 'products',
            label: 'Товары',
            href: '/products',
            icon: CubeIcon,
            iconTone: 'bg-emerald-500/15 text-emerald-300',
            growth: products_growth,
        },
        {
            key: 'shelves',
            label: 'Стеллажи',
            href: '/shelves',
            icon: TableCellsIcon,
            iconTone: 'bg-sky-500/15 text-sky-300',
            growth: null,
        },
        {
            key: 'placements',
            label: 'Размещения',
            href: '/planograms',
            icon: Squares2X2Icon,
            iconTone: 'bg-amber-500/15 text-amber-300',
            growth: null,
        },
    ];

    const quickActions = [
        {
            label: '+ Магазин',
            href: '/stores/create',
            icon: BuildingStorefrontIcon,
        },
        { label: '+ Отдел', href: '/departments/create', icon: TagIcon },
        { label: '+ Товар', href: '/products/create', icon: CubeIcon },
        { label: '+ Импорт', href: '/import', icon: ArrowUpTrayIcon },
    ];

    const categoryData = products_by_category.map((item) => ({
        name: item.category,
        value: item.count,
    }));

    const fillData = shelf_fill_rate.map((item) => ({
        code: item.code,
        fillRate: item.fillRate,
    }));

    const activityData = activity_by_day.map((item) => ({
        date: item.date,
        label: formatShortDate(item.date),
        count: item.count,
    }));

    return (
        <AdminLayout
            flush
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Dashboard
                </h1>
            }
        >
            <Head title="Dashboard" />

            <div className="h-full overflow-y-auto bg-[#0e172b]">
                <div className="w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                    {/* Section 1: Stat Cards */}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((card, index) => (
                            <Link key={card.key} href={card.href} className="block">
                                <Card
                                    delay={index}
                                    className="h-full transition duration-200 hover:border-slate-600 hover:bg-slate-900/90"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-400">
                                                {card.label}
                                            </p>
                                            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                                                {stats[card.key] ?? 0}
                                            </p>
                                        </div>
                                        <div
                                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconTone}`}
                                        >
                                            <card.icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                    {card.growth ? (
                                        <GrowthBadge growth={card.growth} />
                                    ) : (
                                        <div className="mt-3 text-xs text-slate-500">
                                            Всего в системе
                                        </div>
                                    )}
                                </Card>
                            </Link>
                        ))}
                    </div>

                    {/* Section 2: Charts */}
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <Card delay={4} className="xl:col-span-1">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-white">
                                    Товары по категориям
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Топ-5 категорий
                                </p>
                            </div>
                            <div className="h-64">
                                {categoryData.length === 0 ? (
                                    <EmptyState text="Нет товаров для отображения" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryData}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={58}
                                                outerRadius={88}
                                                paddingAngle={3}
                                                stroke="transparent"
                                            >
                                                {categoryData.map((entry, index) => (
                                                    <Cell
                                                        key={entry.name}
                                                        fill={
                                                            CATEGORY_COLORS[
                                                                index %
                                                                    CATEGORY_COLORS.length
                                                            ]
                                                        }
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                content={
                                                    <ChartTooltip valueSuffix=" шт." />
                                                }
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                            <div className="mt-2 space-y-1.5">
                                {categoryData.map((item, index) => (
                                    <div
                                        key={item.name}
                                        className="flex items-center justify-between gap-2 text-xs"
                                    >
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span
                                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                style={{
                                                    background:
                                                        CATEGORY_COLORS[
                                                            index %
                                                                CATEGORY_COLORS.length
                                                        ],
                                                }}
                                            />
                                            <span className="truncate text-slate-300">
                                                {item.name}
                                            </span>
                                        </div>
                                        <span className="font-medium text-slate-100">
                                            {item.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        <Card delay={5} className="lg:col-span-1 xl:col-span-2">
                            <div className="mb-4">
                                <h2 className="text-sm font-semibold text-white">
                                    Заполненность стеллажей
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Процент занятой ширины полок
                                </p>
                            </div>
                            <div className="h-72">
                                {fillData.length === 0 ? (
                                    <EmptyState text="Нет стеллажей" />
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={fillData}
                                            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#1e293b"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="code"
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <YAxis
                                                domain={[0, 100]}
                                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                                axisLine={false}
                                                tickLine={false}
                                                unit="%"
                                            />
                                            <Tooltip
                                                content={
                                                    <ChartTooltip valueSuffix="%" />
                                                }
                                                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                                            />
                                            <Bar
                                                dataKey="fillRate"
                                                name="Заполнение"
                                                radius={[8, 8, 0, 0]}
                                                fill="#818cf8"
                                                maxBarSize={42}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Section 3: Activity feeds */}
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        <Card delay={6} className="xl:col-span-2">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Последние действия
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Activity log
                                    </p>
                                </div>
                                <Link
                                    href="/logs"
                                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                                >
                                    Все логи
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {recent_activity.length === 0 ? (
                                    <EmptyState text="Пока нет действий" />
                                ) : (
                                    recent_activity.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-3 rounded-xl border border-slate-800/80 bg-[#0e172b]/50 px-3 py-2.5"
                                        >
                                            <span
                                                className={`mt-0.5 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${eventTone(item.event)}`}
                                            >
                                                {item.event_label}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm text-slate-200">
                                                    {item.description ||
                                                        item.subject_type}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    {item.causer_name} ·{' '}
                                                    {formatDateTime(item.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>

                        <Card delay={7}>
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-sm font-semibold text-white">
                                        Последние входы
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Login feed
                                    </p>
                                </div>
                                <Link
                                    href="/logs?tab=logins"
                                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                                >
                                    Все
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {recent_logins.length === 0 ? (
                                    <EmptyState text="Нет записей о входах" />
                                ) : (
                                    recent_logins.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-xl border border-slate-800/80 bg-[#0e172b]/50 px-3 py-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-sm font-medium text-slate-200">
                                                    {item.user_name}
                                                </p>
                                                <span
                                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                                        item.status === 'success'
                                                            ? 'bg-emerald-500/15 text-emerald-300'
                                                            : 'bg-rose-500/15 text-rose-300'
                                                    }`}
                                                >
                                                    {item.status === 'success'
                                                        ? 'OK'
                                                        : 'FAIL'}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-xs text-slate-500">
                                                {item.ip_address || '—'} ·{' '}
                                                {formatDateTime(item.created_at)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Section 4: Line chart */}
                    <Card delay={8}>
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-white">
                                Активность за 7 дней
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Количество событий activity log по дням
                            </p>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={activityData}
                                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#1e293b"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        allowDecimals={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="События"
                                        stroke="#34d399"
                                        strokeWidth={2.5}
                                        dot={{
                                            r: 4,
                                            fill: '#34d399',
                                            strokeWidth: 0,
                                        }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    {/* Section 5: Quick actions */}
                    <Card delay={9}>
                        <div className="mb-4">
                            <h2 className="text-sm font-semibold text-white">
                                Быстрые действия
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Создать сущность или открыть импорт
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {quickActions.map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-[#0e172b]/60 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-white"
                                >
                                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                                        <action.icon className="h-4 w-4" />
                                    </span>
                                    {action.label}
                                </Link>
                            ))}
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-3">
                            <MetaStat label="Отделы" value={stats.departments} />
                            <MetaStat label="Холодильники" value={stats.coolers} />
                            <MetaStat label="Стойки" value={stats.stands} />
                        </div>
                    </Card>
                </div>
            </div>
        </AdminLayout>
    );
}

function MetaStat({ label, value }) {
    return (
        <div className="rounded-lg border border-slate-800/80 bg-[#0e172b]/40 px-3 py-2">
            <span className="text-slate-500">{label}: </span>
            <span className="font-semibold text-slate-300">{value ?? 0}</span>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="flex h-full min-h-40 items-center justify-center text-sm text-slate-500">
            {text}
        </div>
    );
}

function eventTone(event) {
    return matchEvent(event);
}

function matchEvent(event) {
    switch (event) {
        case 'created':
            return 'bg-emerald-500/15 text-emerald-300';
        case 'updated':
            return 'bg-sky-500/15 text-sky-300';
        case 'deleted':
            return 'bg-rose-500/15 text-rose-300';
        case 'restored':
            return 'bg-amber-500/15 text-amber-300';
        default:
            return 'bg-[#0e172b]0/15 text-slate-300';
    }
}
