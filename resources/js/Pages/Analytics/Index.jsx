import AdminLayout from '@/layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRightIcon,
    ArrowUpRightIcon,
    BuildingOfficeIcon,
    BuildingStorefrontIcon,
    CubeIcon,
    CreditCardIcon,
    ExclamationTriangleIcon,
    MinusIcon,
    Squares2X2Icon,
    TableCellsIcon,
    UsersIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#a78bfa', '#fb7185'];

const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: (i = 0) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.35, ease: 'easeOut' },
    }),
};

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

function GrowthBadge({ growth }) {
    const delta = Number(growth?.delta ?? 0);
    const thisWeek = Number(growth?.this_week ?? 0);
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
          : 'text-slate-400 bg-slate-800';

    return (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${tone}`}
            >
                <Icon className="h-3.5 w-3.5" />
                {positive ? '+' : ''}
                {delta}
            </span>
            <span className="text-slate-500">за неделю · новых {thisWeek}</span>
        </div>
    );
}

function ChartTooltip({ active, payload, label, valueSuffix = '' }) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-xl">
            {label ? <div className="mb-1 text-slate-400">{label}</div> : null}
            {payload.map((item) => (
                <div key={item.dataKey || item.name} className="font-medium text-slate-100">
                    {item.name}: {item.value}
                    {valueSuffix}
                </div>
            ))}
        </div>
    );
}

function StatCard({ label, value, href, icon: Icon, iconTone, growth, delay }) {
    const content = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        {Number(value ?? 0).toLocaleString('ru-RU')}
                    </p>
                </div>
                <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconTone}`}
                >
                    <Icon className="h-5 w-5" />
                </span>
            </div>
            {growth ? <GrowthBadge growth={growth} /> : null}
        </>
    );

    return (
        <Card delay={delay}>
            {href ? (
                <Link href={href} className="block transition hover:opacity-90">
                    {content}
                </Link>
            ) : (
                content
            )}
        </Card>
    );
}

function QuotaBar({ used, max, label }) {
    const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
    const tone =
        pct >= 90 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-400' : 'bg-indigo-500';

    return (
        <div>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                <span>{label}</span>
                <span className="text-slate-300">
                    {used} / {max} ({pct}%)
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export default function Index({
    scope = 'tenant',
    generated_at,
    overview = {},
    growth = {},
    products_by_category = [],
    products_checked = {},
    equipment = {},
    activity_by_day = [],
    logins_by_day = [],
    tenants_by_plan = [],
    tenants_table = [],
    subscriptions_by_status = [],
    payments = null,
    expiring_tenants = [],
    quota_pressure = [],
    tenant = null,
    shelf_fill_rate = [],
    top_stores = [],
}) {
    const isPlatform = scope === 'platform';

    const checkedPie = [
        { name: 'Проверенные', value: Number(products_checked.checked || 0) },
        { name: 'Не проверенные', value: Number(products_checked.unchecked || 0) },
    ].filter((item) => item.value > 0);

    const overviewCards = isPlatform
        ? [
              {
                  key: 'tenants',
                  label: 'Арендаторы',
                  value: overview.tenants,
                  href: '/tenants',
                  icon: BuildingOfficeIcon,
                  iconTone: 'bg-violet-500/15 text-violet-300',
              },
              {
                  key: 'stores',
                  label: 'Магазины',
                  value: overview.stores,
                  href: '/stores',
                  icon: BuildingStorefrontIcon,
                  iconTone: 'bg-indigo-500/15 text-indigo-300',
                  growth: growth.stores,
              },
              {
                  key: 'users',
                  label: 'Пользователи',
                  value: overview.users,
                  href: '/users',
                  icon: UsersIcon,
                  iconTone: 'bg-sky-500/15 text-sky-300',
                  growth: growth.users,
              },
              {
                  key: 'products',
                  label: 'Товары',
                  value: overview.products,
                  href: '/products',
                  icon: CubeIcon,
                  iconTone: 'bg-emerald-500/15 text-emerald-300',
                  growth: growth.products,
              },
          ]
        : [
              {
                  key: 'stores',
                  label: 'Магазины',
                  value: overview.stores,
                  href: '/stores',
                  icon: BuildingStorefrontIcon,
                  iconTone: 'bg-indigo-500/15 text-indigo-300',
                  growth: growth.stores,
              },
              {
                  key: 'users',
                  label: 'Пользователи',
                  value: overview.users,
                  href: '/users',
                  icon: UsersIcon,
                  iconTone: 'bg-sky-500/15 text-sky-300',
                  growth: growth.users,
              },
              {
                  key: 'products',
                  label: 'Товары',
                  value: overview.products,
                  href: '/products',
                  icon: CubeIcon,
                  iconTone: 'bg-emerald-500/15 text-emerald-300',
                  growth: growth.products,
              },
              {
                  key: 'placements',
                  label: 'Размещения',
                  value: overview.placements,
                  href: '/planograms',
                  icon: Squares2X2Icon,
                  iconTone: 'bg-amber-500/15 text-amber-300',
              },
          ];

    return (
        <AdminLayout
            header={
                <div>
                    <h1 className="text-xl font-semibold leading-tight text-white">
                        Аналитика
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        {isPlatform
                            ? 'Платформа: арендаторы, магазины, подписки и нагрузка'
                            : 'Ваша сеть: магазины, товары, оборудование и активность'}
                        {generated_at ? (
                            <span className="ml-2 text-slate-600">
                                · обновлено{' '}
                                {new Date(generated_at).toLocaleString('ru-RU')}
                            </span>
                        ) : null}
                    </p>
                </div>
            }
        >
            <Head title="Аналитика" />

            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {overviewCards.map((card, index) => (
                        <StatCard key={card.key} {...card} delay={index} />
                    ))}
                </div>

                {isPlatform ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card delay={4}>
                            <p className="text-sm text-slate-400">Активные арендаторы</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {overview.tenants_active ?? 0}
                                <span className="ml-2 text-sm font-normal text-slate-500">
                                    / {overview.tenants ?? 0}
                                </span>
                            </p>
                        </Card>
                        <Card delay={5}>
                            <p className="text-sm text-slate-400">Активные подписки</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {overview.subscriptions_active ?? 0}
                            </p>
                        </Card>
                        <Card delay={6}>
                            <p className="text-sm text-slate-400">Каталог товаров</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {overview.products ?? 0}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                глобальных {overview.products_global ?? 0} · свой бренд{' '}
                                {overview.products_private ?? 0} · непроверенных{' '}
                                {overview.products_unchecked ?? 0}
                            </p>
                        </Card>
                        <Card delay={7}>
                            <p className="text-sm text-slate-400">Оборудование</p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                                {(equipment.shelves || 0) +
                                    (equipment.coolers || 0) +
                                    (equipment.stands || 0)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                стеллажи {equipment.shelves || 0} · холод{' '}
                                {equipment.coolers || 0} · стойки{' '}
                                {equipment.stands || 0}
                            </p>
                        </Card>
                    </div>
                ) : null}

                {!isPlatform && tenant ? (
                    <Card delay={4}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="text-sm text-slate-400">Ваш тариф</p>
                                <h2 className="mt-1 text-lg font-semibold text-white">
                                    {tenant.name}
                                </h2>
                                <p className="mt-1 text-sm text-slate-400">
                                    {tenant.plan_label}
                                    {tenant.subscription_until
                                        ? ` · до ${tenant.subscription_until}`
                                        : ''}
                                </p>
                            </div>
                            <div className="grid w-full max-w-xl gap-3">
                                <QuotaBar
                                    label="Магазины"
                                    used={tenant.stores}
                                    max={tenant.max_stores}
                                />
                                <QuotaBar
                                    label="Пользователи"
                                    used={tenant.users}
                                    max={tenant.max_users}
                                />
                                <div className="rounded-lg border border-slate-700/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
                                    <p>
                                        Каталог товаров:{' '}
                                        <span className="font-semibold text-white">
                                            {tenant.catalog_products ?? 0}
                                        </span>{' '}
                                        (общий, без лимита)
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Свой бренд:{' '}
                                        {tenant.private_products ?? 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card delay={8} className="min-h-[320px]">
                        <h3 className="mb-4 text-sm font-semibold text-white">
                            {isPlatform ? 'Арендаторы по тарифам' : 'Товары по категориям'}
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={
                                            isPlatform
                                                ? tenants_by_plan.map((item) => ({
                                                      name: item.label,
                                                      value: item.count,
                                                  }))
                                                : products_by_category.map((item) => ({
                                                      name: item.category,
                                                      value: item.count,
                                                  }))
                                        }
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={2}
                                    >
                                        {(isPlatform
                                            ? tenants_by_plan
                                            : products_by_category
                                        ).map((_, index) => (
                                            <Cell
                                                key={index}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card delay={9} className="min-h-[320px]">
                        <h3 className="mb-4 text-sm font-semibold text-white">
                            Статус проверки товаров
                        </h3>
                        <div className="h-64">
                            {checkedPie.length === 0 ? (
                                <p className="text-sm text-slate-500">Нет товаров</p>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={checkedPie}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={55}
                                            outerRadius={90}
                                        >
                                            {checkedPie.map((_, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={
                                                        index === 0
                                                            ? '#34d399'
                                                            : '#fbbf24'
                                                    }
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    <Card delay={10} className="min-h-[320px]">
                        <h3 className="mb-4 text-sm font-semibold text-white">
                            Активность за 14 дней
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activity_by_day}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="События"
                                        stroke="#818cf8"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card delay={11} className="min-h-[320px]">
                        <h3 className="mb-4 text-sm font-semibold text-white">
                            Входы за 14 дней
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={logins_by_day}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend />
                                    <Bar
                                        dataKey="success"
                                        name="Успешно"
                                        fill="#34d399"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="failed"
                                        name="Ошибки"
                                        fill="#fb7185"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {isPlatform ? (
                    <>
                        <div className="grid gap-4 xl:grid-cols-3">
                            <Card delay={12}>
                                <div className="mb-3 flex items-center gap-2">
                                    <CreditCardIcon className="h-5 w-5 text-indigo-300" />
                                    <h3 className="text-sm font-semibold text-white">Платежи</h3>
                                </div>
                                <p className="text-2xl font-semibold text-white">
                                    {(payments?.paid_total || 0).toLocaleString('ru-RU')}{' '}
                                    <span className="text-sm font-normal text-slate-400">
                                        {payments?.currency || 'BYN'}
                                    </span>
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                    оплачено: {payments?.paid_count || 0} · ожидают:{' '}
                                    {payments?.awaiting_count || 0} · черновики:{' '}
                                    {payments?.pending_count || 0}
                                </p>
                            </Card>

                            <Card delay={13} className="xl:col-span-2">
                                <h3 className="mb-3 text-sm font-semibold text-white">
                                    Подписки по статусу
                                </h3>
                                <div className="h-48">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={subscriptions_by_status}>
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#1e293b"
                                            />
                                            <XAxis
                                                dataKey="label"
                                                stroke="#64748b"
                                                fontSize={11}
                                            />
                                            <YAxis
                                                stroke="#64748b"
                                                fontSize={12}
                                                allowDecimals={false}
                                            />
                                            <Tooltip content={<ChartTooltip />} />
                                            <Bar
                                                dataKey="count"
                                                name="Подписки"
                                                fill="#38bdf8"
                                                radius={[6, 6, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </div>

                        <Card delay={14}>
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold text-white">
                                    Арендаторы: магазины / пользователи / свой бренд
                                </h3>
                                <Link
                                    href="/tenants"
                                    className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                                >
                                    Все арендаторы
                                </Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-800 text-sm">
                                    <thead>
                                        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="px-3 py-2">Арендатор</th>
                                            <th className="px-3 py-2">Тариф</th>
                                            <th className="px-3 py-2">Магазины</th>
                                            <th className="px-3 py-2">Пользователи</th>
                                            <th className="px-3 py-2">Свой бренд</th>
                                            <th className="px-3 py-2">До</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {tenants_table.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={6}
                                                    className="px-3 py-6 text-center text-slate-500"
                                                >
                                                    Нет арендаторов
                                                </td>
                                            </tr>
                                        ) : (
                                            tenants_table.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className="hover:bg-slate-800/50"
                                                >
                                                    <td className="px-3 py-3">
                                                        <Link
                                                            href={route(
                                                                'tenants.show',
                                                                row.id,
                                                            )}
                                                            className="font-medium text-white hover:text-indigo-300"
                                                        >
                                                            {row.name}
                                                        </Link>
                                                        <div className="text-xs text-slate-500">
                                                            {row.domain || '—'}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-300">
                                                        {row.plan_label}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-300">
                                                        {row.stores}/{row.max_stores}
                                                        <span className="ml-1 text-xs text-slate-500">
                                                            ({row.stores_pct}%)
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-300">
                                                        {row.users}/{row.max_users}
                                                        <span className="ml-1 text-xs text-slate-500">
                                                            ({row.users_pct}%)
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-300">
                                                        {row.private_products ?? 0}
                                                    </td>
                                                    <td className="px-3 py-3 text-slate-400">
                                                        {row.subscription_until || '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        <div className="grid gap-4 xl:grid-cols-2">
                            <Card delay={15}>
                                <div className="mb-3 flex items-center gap-2">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-amber-300" />
                                    <h3 className="text-sm font-semibold text-white">
                                        Подписки истекают ≤ 30 дней
                                    </h3>
                                </div>
                                {expiring_tenants.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        Ближайших окончаний нет
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {expiring_tenants.map((item) => (
                                            <li
                                                key={item.id}
                                                className="flex items-center justify-between rounded-xl bg-slate-800/60 px-3 py-2"
                                            >
                                                <div>
                                                    <Link
                                                        href={route(
                                                            'tenants.show',
                                                            item.id,
                                                        )}
                                                        className="text-sm font-medium text-white hover:text-indigo-300"
                                                    >
                                                        {item.name}
                                                    </Link>
                                                    <p className="text-xs text-slate-500">
                                                        {item.plan_label}
                                                    </p>
                                                </div>
                                                <div className="text-right text-xs">
                                                    <div className="font-medium text-amber-300">
                                                        {item.days_left} дн.
                                                    </div>
                                                    <div className="text-slate-500">
                                                        {item.subscription_until}
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>

                            <Card delay={16}>
                                <div className="mb-3 flex items-center gap-2">
                                    <TableCellsIcon className="h-5 w-5 text-rose-300" />
                                    <h3 className="text-sm font-semibold text-white">
                                        Нагрузка по квотам ≥ 80%
                                    </h3>
                                </div>
                                {quota_pressure.length === 0 ? (
                                    <p className="text-sm text-slate-500">
                                        Критической нагрузки нет
                                    </p>
                                ) : (
                                    <ul className="space-y-2">
                                        {quota_pressure.map((item, index) => (
                                            <li
                                                key={`${item.id}-${item.metric}-${index}`}
                                                className="rounded-xl bg-slate-800/60 px-3 py-2"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <Link
                                                        href={route(
                                                            'tenants.show',
                                                            item.id,
                                                        )}
                                                        className="text-sm font-medium text-white hover:text-indigo-300"
                                                    >
                                                        {item.name}
                                                    </Link>
                                                    <span className="text-xs font-semibold text-rose-300">
                                                        {item.pct}%
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {item.metric}: {item.used} / {item.max}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Card>
                        </div>
                    </>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        <Card delay={12} className="min-h-[300px]">
                            <h3 className="mb-4 text-sm font-semibold text-white">
                                Заполненность стеллажей
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={shelf_fill_rate} layout="vertical">
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="#1e293b"
                                        />
                                        <XAxis
                                            type="number"
                                            domain={[0, 100]}
                                            stroke="#64748b"
                                            fontSize={12}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="code"
                                            width={70}
                                            stroke="#64748b"
                                            fontSize={11}
                                        />
                                        <Tooltip
                                            content={
                                                <ChartTooltip valueSuffix="%" />
                                            }
                                        />
                                        <Bar
                                            dataKey="fillRate"
                                            name="Заполнение"
                                            fill="#818cf8"
                                            radius={[0, 6, 6, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <Card delay={13}>
                            <h3 className="mb-4 text-sm font-semibold text-white">
                                Магазины по числу отделов
                            </h3>
                            {top_stores.length === 0 ? (
                                <p className="text-sm text-slate-500">Нет магазинов</p>
                            ) : (
                                <ul className="space-y-2">
                                    {top_stores.map((store, index) => (
                                        <li
                                            key={`${store.name}-${index}`}
                                            className="flex items-center justify-between rounded-xl bg-slate-800/60 px-3 py-2"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-white">
                                                    {store.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {store.city}
                                                </p>
                                            </div>
                                            <span className="text-sm text-slate-300">
                                                {store.departments} отд.
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Отделы</p>
                                    <p className="font-semibold text-white">
                                        {equipment.departments || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Размещения</p>
                                    <p className="font-semibold text-white">
                                        {equipment.placements || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Стеллажи</p>
                                    <p className="font-semibold text-white">
                                        {equipment.shelves || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Холод / стойки</p>
                                    <p className="font-semibold text-white">
                                        {(equipment.coolers || 0) +
                                            (equipment.stands || 0)}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
