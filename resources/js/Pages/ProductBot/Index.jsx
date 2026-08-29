import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import {
    ArrowPathIcon,
    CheckIcon,
    CpuChipIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireConfirm, fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

function StatCard({ label, value }) {
    return (
        <div className="rounded-xl bg-[#152033] px-4 py-3 ring-1 ring-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
        </div>
    );
}

function JobCard({ job, packageTypes, statusFilter = 'pending' }) {
    const product = job.product;
    const form = useForm({
        name: job.suggested_name ?? product?.name ?? '',
        category: job.suggested_category ?? product?.category ?? '',
        package_type: job.suggested_package_type ?? product?.package_type ?? '',
        width_mm: job.suggested_width_mm ?? product?.width_mm ?? '',
        height_mm: job.suggested_height_mm ?? product?.height_mm ?? '',
        depth_mm: job.suggested_depth_mm ?? product?.depth_mm ?? '',
        volume_ml: job.suggested_volume_ml ?? product?.volume_ml ?? '',
        mark_checked: true,
        save_as_training: false,
        training_name: '',
        training_keyword: product?.category ?? '',
        status: statusFilter,
    });

    const accept = (e) => {
        e.preventDefault();
        form.post(route('product-bot.accept', job.id), {
            preserveScroll: true,
            onError: () => fireError('Не удалось принять предложение.'),
        });
    };

    const reject = async () => {
        const ok = await fireConfirm(
            'Отклонить предложение?',
            'Товар не изменится. Задание будет закрыто.',
            'Отклонить',
        );
        if (!ok) return;

        router.post(
            route('product-bot.reject', job.id),
            {},
            {
                preserveScroll: true,
                onError: () => fireError('Не удалось отклонить.'),
            },
        );
    };

    const inputClass =
        'mt-1 block w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

    return (
        <form
            onSubmit={accept}
            className="rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800 sm:p-5"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-medium text-white">
                        {product?.name || 'Без названия'}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                        {product?.barcode || '—'}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={clsx(
                            'rounded-full px-2.5 py-1 text-xs font-medium',
                            job.confidence >= 60
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : job.confidence >= 35
                                  ? 'bg-amber-500/15 text-amber-200'
                                  : 'bg-rose-500/15 text-rose-300',
                        )}
                    >
                        Уверенность {job.confidence}%
                    </span>
                    <span className="rounded-full bg-slate-700/60 px-2.5 py-1 text-xs text-slate-300">
                        {job.source || '—'}
                    </span>
                    <span
                        className={clsx(
                            'rounded-full px-2.5 py-1 text-xs capitalize',
                            job.status === 'pending' && 'bg-indigo-500/15 text-indigo-300',
                            job.status === 'accepted' && 'bg-emerald-500/15 text-emerald-300',
                            job.status === 'rejected' && 'bg-slate-600/40 text-slate-300',
                        )}
                    >
                        {job.status}
                    </span>
                </div>
            </div>

            {job.reason ? (
                <p className="mt-3 text-sm text-slate-400">{job.reason}</p>
            ) : null}

            {job.status === 'pending' ? (
                <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <label className="text-xs text-slate-400">
                            Название
                            <input
                                className={inputClass}
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                            />
                        </label>
                        <label className="text-xs text-slate-400">
                            Категория
                            <input
                                className={inputClass}
                                value={form.data.category}
                                onChange={(e) => form.setData('category', e.target.value)}
                            />
                        </label>
                        <label className="text-xs text-slate-400">
                            Тип упаковки
                            <select
                                className={inputClass}
                                value={form.data.package_type}
                                onChange={(e) =>
                                    form.setData('package_type', e.target.value)
                                }
                            >
                                <option value="">—</option>
                                {packageTypes.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs text-slate-400">
                            Объём, мл
                            <input
                                type="number"
                                className={inputClass}
                                value={form.data.volume_ml}
                                onChange={(e) =>
                                    form.setData('volume_ml', e.target.value)
                                }
                            />
                        </label>
                        <label className="text-xs text-slate-400">
                            Ширина, мм
                            <input
                                type="number"
                                className={inputClass}
                                value={form.data.width_mm}
                                onChange={(e) =>
                                    form.setData('width_mm', e.target.value)
                                }
                            />
                        </label>
                        <label className="text-xs text-slate-400">
                            Высота, мм
                            <input
                                type="number"
                                className={inputClass}
                                value={form.data.height_mm}
                                onChange={(e) =>
                                    form.setData('height_mm', e.target.value)
                                }
                            />
                        </label>
                        <label className="text-xs text-slate-400">
                            Глубина, мм
                            <input
                                type="number"
                                className={inputClass}
                                value={form.data.depth_mm}
                                onChange={(e) =>
                                    form.setData('depth_mm', e.target.value)
                                }
                            />
                        </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                className="rounded border-slate-600 bg-[#0e172b] text-indigo-500"
                                checked={form.data.mark_checked}
                                onChange={(e) =>
                                    form.setData('mark_checked', e.target.checked)
                                }
                            />
                            Отметить как проверенный
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                            <input
                                type="checkbox"
                                className="rounded border-slate-600 bg-[#0e172b] text-indigo-500"
                                checked={form.data.save_as_training}
                                onChange={(e) =>
                                    form.setData('save_as_training', e.target.checked)
                                }
                            />
                            Сохранить как правило обучения
                        </label>
                    </div>

                    {form.data.save_as_training ? (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="text-xs text-slate-400">
                                Название правила
                                <input
                                    className={inputClass}
                                    value={form.data.training_name}
                                    onChange={(e) =>
                                        form.setData('training_name', e.target.value)
                                    }
                                    placeholder="Необязательно"
                                />
                            </label>
                            <label className="text-xs text-slate-400">
                                Ключевое слово
                                <input
                                    className={inputClass}
                                    value={form.data.training_keyword}
                                    onChange={(e) =>
                                        form.setData('training_keyword', e.target.value)
                                    }
                                />
                            </label>
                        </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
                        >
                            <CheckIcon className="h-4 w-4" />
                            Принять
                        </button>
                        <button
                            type="button"
                            onClick={reject}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600"
                        >
                            <XMarkIcon className="h-4 w-4" />
                            Отклонить
                        </button>
                        {product?.id ? (
                            <Link
                                href={route('products.edit', product.id)}
                                className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-indigo-300 hover:text-indigo-200"
                            >
                                Открыть товар
                            </Link>
                        ) : null}
                    </div>
                </>
            ) : (
                <div className="mt-3 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
                    <p>
                        Упаковка:{' '}
                        <span className="text-slate-200">
                            {job.suggested_package_type || '—'}
                        </span>
                    </p>
                    <p>
                        Объём:{' '}
                        <span className="text-slate-200">
                            {job.suggested_volume_ml ?? '—'} мл
                        </span>
                    </p>
                    <p>
                        Габариты:{' '}
                        <span className="text-slate-200">
                            {[
                                job.suggested_width_mm,
                                job.suggested_height_mm,
                                job.suggested_depth_mm,
                            ]
                                .map((v) => v ?? '—')
                                .join(' × ')}{' '}
                            мм
                        </span>
                    </p>
                </div>
            )}
        </form>
    );
}

export default function Index({
    jobs,
    rules = [],
    stats = {},
    packageTypes = [],
    filters = {},
}) {
    const { flash } = usePage().props;
    const [tab, setTab] = useState('queue');

    const ruleForm = useForm({
        name: '',
        keyword: '',
        volume_ml_min: '',
        volume_ml_max: '',
        package_type: packageTypes[0] || 'Бутылка',
        width_mm: '',
        height_mm: '',
        depth_mm: '',
        priority: 100,
        is_active: true,
    });

    useEffect(() => {
        if (flash?.success) fireSuccess(flash.success);
        if (flash?.error) fireError(flash.error);
    }, [flash]);

    // Автообновление очереди каждые 30 сек (скан на сервере тоже ~30 сек).
    useEffect(() => {
        const timer = window.setInterval(() => {
            router.reload({
                only: ['jobs', 'stats', 'rules'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 30000);

        return () => window.clearInterval(timer);
    }, []);

    const setStatus = (status) => {
        router.get(
            route('product-bot.index'),
            { status },
            { preserveState: true, replace: true },
        );
    };

    const runScan = () => {
        router.post(
            route('product-bot.scan'),
            {},
            {
                preserveScroll: true,
                onError: () => fireError('Сканирование не удалось.'),
            },
        );
    };

    const submitRule = (e) => {
        e.preventDefault();
        ruleForm.post(route('product-bot.rules.store'), {
            preserveScroll: true,
            onSuccess: () => ruleForm.reset(),
            onError: () => fireError('Не удалось сохранить правило.'),
        });
    };

    const deleteRule = async (rule) => {
        const ok = await fireConfirm(
            'Удалить правило?',
            rule.name,
            'Удалить',
        );
        if (!ok) return;

        router.delete(route('product-bot.rules.destroy', rule.id), {
            preserveScroll: true,
        });
    };

    const inputClass =
        'mt-1 block w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40';

    return (
        <AdminLayout
            header={
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <CpuChipIcon className="h-6 w-6 text-indigo-300" />
                        <h1 className="text-xl font-semibold leading-tight text-white">
                            Бот обогащения товаров
                        </h1>
                    </div>
                    <button
                        type="button"
                        onClick={runScan}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                    >
                        <ArrowPathIcon className="h-4 w-4" />
                        Сканировать сейчас
                    </button>
                </div>
            }
        >
            <Head title="Бот товаров" />

            <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <StatCard label="В очереди" value={stats.pending ?? 0} />
                    <StatCard label="Принято" value={stats.accepted ?? 0} />
                    <StatCard label="Отклонено" value={stats.rejected ?? 0} />
                    <StatCard
                        label="Неполных товаров"
                        value={stats.incomplete_products ?? 0}
                    />
                    <StatCard
                        label="Правил обучения"
                        value={stats.training_rules ?? 0}
                    />
                </div>

                <p className="text-sm text-slate-400">
                    Бот ищет в Open Food Facts по штрихкоду и по названию (если
                    штрихкод СНГ/США не совпал). В{' '}
                    <code className="text-slate-300">products</code> пишется только
                    после «Принять». Автоскан и обновление страницы — каждые ~30
                    сек.
                </p>

                <div className="flex flex-wrap gap-2">
                    {[
                        { id: 'queue', label: 'Очередь' },
                        { id: 'training', label: 'Обучение' },
                    ].map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={clsx(
                                'rounded-lg px-3 py-1.5 text-sm font-medium',
                                tab === item.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'queue' ? (
                    <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'pending', label: 'Ожидают' },
                                { id: 'accepted', label: 'Принятые' },
                                { id: 'rejected', label: 'Отклонённые' },
                                { id: 'all', label: 'Все' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setStatus(item.id)}
                                    className={clsx(
                                        'rounded-full px-3 py-1 text-xs font-medium',
                                        (filters.status || 'pending') === item.id
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {(jobs.data || []).length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                                Заданий нет. Нажмите «Сканировать сейчас».
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {(jobs.data || []).map((job) => (
                                    <JobCard
                                        key={job.id}
                                        job={job}
                                        packageTypes={packageTypes}
                                        statusFilter={filters.status || 'pending'}
                                    />
                                ))}
                            </div>
                        )}

                        {jobs.links?.length > 3 ? (
                            <div className="flex flex-wrap gap-2">
                                {jobs.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url || '#'}
                                        className={clsx(
                                            'rounded-lg px-3 py-1.5 text-sm',
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-slate-800 text-slate-300',
                                            !link.url && 'pointer-events-none opacity-40',
                                        )}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <form
                            onSubmit={submitRule}
                            className="rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800 sm:p-5"
                        >
                            <h2 className="text-sm font-semibold text-white">
                                Новое правило
                            </h2>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <label className="text-xs text-slate-400 sm:col-span-2">
                                    Название
                                    <input
                                        className={inputClass}
                                        value={ruleForm.data.name}
                                        onChange={(e) =>
                                            ruleForm.setData('name', e.target.value)
                                        }
                                        required
                                    />
                                </label>
                                <label className="text-xs text-slate-400">
                                    Ключевое слово
                                    <input
                                        className={inputClass}
                                        value={ruleForm.data.keyword}
                                        onChange={(e) =>
                                            ruleForm.setData('keyword', e.target.value)
                                        }
                                        placeholder="пиво, cola…"
                                    />
                                </label>
                                <label className="text-xs text-slate-400">
                                    Тип упаковки
                                    <select
                                        className={inputClass}
                                        value={ruleForm.data.package_type}
                                        onChange={(e) =>
                                            ruleForm.setData(
                                                'package_type',
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {packageTypes.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-xs text-slate-400">
                                    Объём от, мл
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={ruleForm.data.volume_ml_min}
                                        onChange={(e) =>
                                            ruleForm.setData(
                                                'volume_ml_min',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label className="text-xs text-slate-400">
                                    Объём до, мл
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={ruleForm.data.volume_ml_max}
                                        onChange={(e) =>
                                            ruleForm.setData(
                                                'volume_ml_max',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label className="text-xs text-slate-400">
                                    Ш × В × Г, мм
                                    <div className="mt-1 grid grid-cols-3 gap-2">
                                        <input
                                            type="number"
                                            className={inputClass + ' !mt-0'}
                                            placeholder="Ш"
                                            value={ruleForm.data.width_mm}
                                            onChange={(e) =>
                                                ruleForm.setData(
                                                    'width_mm',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <input
                                            type="number"
                                            className={inputClass + ' !mt-0'}
                                            placeholder="В"
                                            value={ruleForm.data.height_mm}
                                            onChange={(e) =>
                                                ruleForm.setData(
                                                    'height_mm',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <input
                                            type="number"
                                            className={inputClass + ' !mt-0'}
                                            placeholder="Г"
                                            value={ruleForm.data.depth_mm}
                                            onChange={(e) =>
                                                ruleForm.setData(
                                                    'depth_mm',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </label>
                                <label className="text-xs text-slate-400">
                                    Приоритет (меньше = раньше)
                                    <input
                                        type="number"
                                        className={inputClass}
                                        value={ruleForm.data.priority}
                                        onChange={(e) =>
                                            ruleForm.setData('priority', e.target.value)
                                        }
                                    />
                                </label>
                            </div>
                            <button
                                type="submit"
                                disabled={ruleForm.processing}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
                            >
                                <PlusIcon className="h-4 w-4" />
                                Добавить
                            </button>
                        </form>

                        <div className="space-y-3">
                            {rules.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-700 px-4 py-10 text-center text-sm text-slate-400">
                                    Правил пока нет.
                                </div>
                            ) : (
                                rules.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className="rounded-xl bg-[#152033] p-4 ring-1 ring-slate-800"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-medium text-white">
                                                    {rule.name}
                                                </p>
                                                <p className="mt-1 text-sm text-slate-400">
                                                    {rule.package_type}
                                                    {rule.keyword
                                                        ? ` · «${rule.keyword}»`
                                                        : ''}
                                                    {rule.volume_ml_min != null ||
                                                    rule.volume_ml_max != null
                                                        ? ` · ${rule.volume_ml_min ?? '…'}–${rule.volume_ml_max ?? '…'} мл`
                                                        : ''}
                                                    {rule.width_mm
                                                        ? ` · ${rule.width_mm}×${rule.height_mm}×${rule.depth_mm} мм`
                                                        : ''}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => deleteRule(rule)}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                                                title="Удалить"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
