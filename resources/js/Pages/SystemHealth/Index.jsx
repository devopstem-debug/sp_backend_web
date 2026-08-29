import AdminLayout from '@/layouts/AdminLayout';
import { Head } from '@inertiajs/react';
import {
    ArrowPathIcon,
    CircleStackIcon,
    CpuChipIcon,
    ServerStackIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';

function formatBytes(bytes) {
    if (bytes == null || Number.isNaN(Number(bytes))) return '—';
    const n = Number(bytes);
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let v = n;
    let i = -1;
    do {
        v /= 1024;
        i += 1;
    } while (v >= 1024 && i < units.length - 1);
    return `${v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatUptime(seconds) {
    if (seconds == null) return '—';
    const s = Math.max(0, Number(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}д ${h}ч ${m}м`;
    if (h > 0) return `${h}ч ${m}м`;
    return `${m}м`;
}

function toneForPercent(pct) {
    if (pct == null) return 'slate';
    if (pct >= 90) return 'rose';
    if (pct >= 75) return 'amber';
    return 'emerald';
}

const TONE = {
    emerald: {
        bar: 'bg-emerald-500',
        text: 'text-emerald-400',
        chip: 'bg-emerald-500/15 text-emerald-300',
    },
    amber: {
        bar: 'bg-amber-500',
        text: 'text-amber-400',
        chip: 'bg-amber-500/15 text-amber-300',
    },
    rose: {
        bar: 'bg-rose-500',
        text: 'text-rose-400',
        chip: 'bg-rose-500/15 text-rose-300',
    },
    slate: {
        bar: 'bg-slate-500',
        text: 'text-slate-400',
        chip: 'bg-slate-700 text-slate-300',
    },
};

const STATUS_LABEL = {
    ok: { label: 'Норма', className: 'bg-emerald-500/15 text-emerald-300' },
    warning: { label: 'Внимание', className: 'bg-amber-500/15 text-amber-300' },
    critical: { label: 'Критично', className: 'bg-rose-500/15 text-rose-300' },
};

function Meter({ label, percent, detail, sub }) {
    const tone = TONE[toneForPercent(percent)];
    const width = Math.min(100, Math.max(0, Number(percent) || 0));

    return (
        <div>
            <div className="mb-1.5 flex items-end justify-between gap-2">
                <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    {sub ? <p className="text-xs text-slate-500">{sub}</p> : null}
                </div>
                <div className="text-right">
                    <p className={clsx('text-lg font-semibold tabular-nums', tone.text)}>
                        {percent == null ? '—' : `${Number(percent).toFixed(1)}%`}
                    </p>
                    {detail ? <p className="text-xs text-slate-500">{detail}</p> : null}
                </div>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                    className={clsx('h-full rounded-full transition-all duration-500', tone.bar)}
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

function Card({ title, icon: Icon, children, className = '' }) {
    return (
        <section
            className={clsx(
                'rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/20',
                className,
            )}
        >
            <div className="mb-4 flex items-center gap-2">
                {Icon ? <Icon className="h-5 w-5 text-indigo-400" /> : null}
                <h2 className="text-sm font-semibold text-white">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function Kv({ label, value }) {
    return (
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 py-2 text-sm last:border-0">
            <span className="text-slate-500">{label}</span>
            <span className="max-w-[65%] text-right font-medium text-slate-200 break-words">
                {value ?? '—'}
            </span>
        </div>
    );
}

function Sparkline({ history, colorClass = 'stroke-indigo-400' }) {
    if (!history?.length) {
        return <div className="h-12 rounded bg-slate-800/50" />;
    }
    const max = Math.max(...history, 1);
    const min = Math.min(...history, 0);
    const range = Math.max(max - min, 1);
    const w = 200;
    const h = 48;
    const pts = history
        .map((v, i) => {
            const x = (i / Math.max(history.length - 1, 1)) * w;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            return `${x},${y}`;
        })
        .join(' ');

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full">
            <polyline
                fill="none"
                className={colorClass}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={pts}
            />
        </svg>
    );
}

export default function Index({ metrics: initialMetrics, pollIntervalMs = 3000 }) {
    const [metrics, setMetrics] = useState(initialMetrics);
    const [live, setLive] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [updatedAt, setUpdatedAt] = useState(() => new Date());
    const historyRef = useRef({
        cpu: [],
        memory: [],
        disk: [],
    });
    const [history, setHistory] = useState(historyRef.current);

    const pushHistory = (snap) => {
        const next = {
            cpu: [...historyRef.current.cpu, Number(snap?.cpu?.usage_percent) || 0].slice(-40),
            memory: [
                ...historyRef.current.memory,
                Number(snap?.memory?.usage_percent) || 0,
            ].slice(-40),
            disk: [...historyRef.current.disk, Number(snap?.disk?.usage_percent) || 0].slice(
                -40,
            ),
        };
        historyRef.current = next;
        setHistory(next);
    };

    useEffect(() => {
        pushHistory(initialMetrics);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const refresh = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(route('system-health.metrics'), {
                headers: { Accept: 'application/json' },
            });
            setMetrics(data);
            pushHistory(data);
            setUpdatedAt(new Date());
            setError(null);
        } catch (e) {
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    'Не удалось получить метрики',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!live) return undefined;
        const timer = window.setInterval(refresh, pollIntervalMs);
        return () => window.clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [live, pollIntervalMs]);

    const status = STATUS_LABEL[metrics?.status] || STATUS_LABEL.ok;
    const cpu = metrics?.cpu || {};
    const memory = metrics?.memory || {};
    const disk = metrics?.disk || {};
    const gpu = metrics?.gpu || {};
    const php = metrics?.php || {};
    const queue = metrics?.queue || {};
    const app = metrics?.app || {};

    return (
        <AdminLayout title="Ресурсы системы">
            <Head title="Ресурсы системы" />

            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-white">Ресурсы сервера</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        Живой мониторинг CPU / RAM / диск / GPU · обновление каждые{' '}
                        {Math.round(pollIntervalMs / 1000)} с без перезагрузки страницы
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span className={clsx('rounded-full px-2.5 py-1 font-medium', status.className)}>
                            {status.label}
                        </span>
                        <span className="text-slate-500">
                            {metrics?.hostname} · {metrics?.os}
                        </span>
                        <span className="text-slate-600">
                            обновлено {updatedAt.toLocaleTimeString('ru-RU')}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setLive((v) => !v)}
                        className={clsx(
                            'rounded-lg px-3 py-2 text-xs font-medium',
                            live
                                ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                        )}
                    >
                        {live ? '● Live' : '○ Пауза'}
                    </button>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        <ArrowPathIcon className={clsx('h-4 w-4', loading && 'animate-spin')} />
                        Обновить
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
                <Card title="CPU" icon={CpuChipIcon}>
                    <Meter
                        label="Нагрузка"
                        percent={cpu.usage_percent}
                        detail={
                            cpu.load_1 != null
                                ? `load ${cpu.load_1} / ${cpu.load_5} / ${cpu.load_15}`
                                : null
                        }
                        sub={
                            [cpu.cores ? `${cpu.cores} ядер` : null, cpu.model]
                                .filter(Boolean)
                                .join(' · ') || null
                        }
                    />
                    <div className="mt-4">
                        <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">
                            История %
                        </p>
                        <Sparkline history={history.cpu} colorClass="stroke-indigo-400" />
                    </div>
                </Card>

                <Card title="RAM" icon={ServerStackIcon}>
                    <Meter
                        label="Память"
                        percent={memory.usage_percent}
                        detail={`${formatBytes(memory.used_bytes)} / ${formatBytes(memory.total_bytes)}`}
                        sub={
                            memory.available_bytes != null
                                ? `доступно ${formatBytes(memory.available_bytes)}`
                                : null
                        }
                    />
                    <div className="mt-3 text-xs text-slate-500">
                        Swap:{' '}
                        <span className="text-slate-300">
                            {memory.swap_usage_percent != null
                                ? `${memory.swap_usage_percent}% · ${formatBytes(memory.swap_used_bytes)} / ${formatBytes(memory.swap_total_bytes)}`
                                : '—'}
                        </span>
                    </div>
                    <div className="mt-3">
                        <Sparkline history={history.memory} colorClass="stroke-emerald-400" />
                    </div>
                </Card>

                <Card title="Диск" icon={CircleStackIcon}>
                    <Meter
                        label="Корневой раздел приложения"
                        percent={disk.usage_percent}
                        detail={`${formatBytes(disk.used_bytes)} / ${formatBytes(disk.total_bytes)}`}
                        sub={disk.path}
                    />
                    <div className="mt-4">
                        <Sparkline history={history.disk} colorClass="stroke-amber-400" />
                    </div>
                </Card>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card title="GPU">
                    {!gpu.available ? (
                        <p className="text-sm text-slate-400">
                            {gpu.message || 'GPU недоступен'}
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {(gpu.devices || []).map((d) => (
                                <div
                                    key={d.index}
                                    className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                                >
                                    <p className="mb-2 text-sm font-medium text-white">
                                        #{d.index} {d.name}
                                    </p>
                                    <Meter
                                        label="Утилизация GPU"
                                        percent={d.utilization_percent}
                                        detail={`${d.temperature_c}°C`}
                                    />
                                    <div className="mt-3">
                                        <Meter
                                            label="Память GPU"
                                            percent={
                                                d.memory_total_bytes
                                                    ? Math.round(
                                                          (d.memory_used_bytes /
                                                              d.memory_total_bytes) *
                                                              1000,
                                                      ) / 10
                                                    : d.memory_utilization_percent
                                            }
                                            detail={`${formatBytes(d.memory_used_bytes)} / ${formatBytes(d.memory_total_bytes)}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Очередь и PHP">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                            <p className="text-[11px] text-slate-500">В очереди</p>
                            <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                                {queue.pending ?? '—'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                            <p className="text-[11px] text-slate-500">Failed</p>
                            <p
                                className={clsx(
                                    'mt-1 text-xl font-semibold tabular-nums',
                                    (queue.failed || 0) > 0 ? 'text-rose-400' : 'text-white',
                                )}
                            >
                                {queue.failed ?? '—'}
                            </p>
                        </div>
                        <div className="rounded-xl bg-slate-950/60 p-3 text-center">
                            <p className="text-[11px] text-slate-500">Драйвер</p>
                            <p className="mt-1 text-sm font-semibold text-slate-200">
                                {queue.connection || '—'}
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-0">
                        <Kv label="PHP" value={`${php.version} (${php.sapi})`} />
                        <Kv
                            label="Память PHP"
                            value={`${formatBytes(php.memory_usage_bytes)} · peak ${formatBytes(php.memory_peak_bytes)} · limit ${php.memory_limit || '—'}`}
                        />
                        <Kv
                            label="OPcache"
                            value={php.opcache_enabled ? 'включён' : 'выключен'}
                        />
                        {queue.oldest_pending_seconds != null ? (
                            <Kv
                                label="Самый старый job"
                                value={formatUptime(queue.oldest_pending_seconds)}
                            />
                        ) : null}
                    </div>
                </Card>
            </div>

            <div className="mt-4">
                <Card title="Приложение">
                    <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                        <Kv label="Laravel" value={app.laravel} />
                        <Kv label="ENV" value={app.env} />
                        <Kv label="Debug" value={app.debug ? 'ON' : 'OFF'} />
                        <Kv label="Uptime хоста" value={formatUptime(app.uptime_seconds)} />
                        <Kv label="Cache" value={app.cache_store} />
                        <Kv label="Session" value={app.session_driver} />
                        <Kv label="Broadcast" value={app.broadcast_connection} />
                        <Kv label="Timezone" value={app.timezone} />
                        <Kv
                            label="Собрано"
                            value={
                                metrics?.collected_at
                                    ? new Date(metrics.collected_at).toLocaleString('ru-RU')
                                    : '—'
                            }
                        />
                    </div>
                </Card>
            </div>
        </AdminLayout>
    );
}
