import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';

export default function Index({ result = null }) {
    const { flash } = usePage().props;
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const pickFile = (nextFile) => {
        if (!nextFile) {
            return;
        }

        const name = (nextFile.name || '').toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.txt')) {
            fireError('Выберите файл .csv или .txt');
            return;
        }

        setFile(nextFile);
    };

    const onDrop = (event) => {
        event.preventDefault();
        setDragging(false);
        pickFile(event.dataTransfer.files?.[0] || null);
    };

    const submit = (event) => {
        event.preventDefault();

        if (!file) {
            fireError('Выберите CSV-файл.');
            return;
        }

        setUploading(true);

        router.post(
            route('import.upload'),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setUploading(false),
                onSuccess: () => {
                    setFile(null);
                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
                onError: (errors) => {
                    fireError(errors.file || 'Не удалось импортировать файл.');
                },
            },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Импорт товаров
                </h1>
            }
        >
            <Head title="Импорт" />

            <div className="space-y-4">
                <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm text-slate-300">
                                Формат: CSV с разделителем «;». Колонки:{' '}
                                <span className="font-mono text-xs text-white">
                                    barcode;name;category;volume_ml;package_type;width_mm;height_mm;depth_mm;weight_g
                                </span>
                            </p>
                        </div>
                        <a
                            href={route('import.template')}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-[#152033] px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm hover:bg-slate-800"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Скачать шаблон
                        </a>
                    </div>

                    <form onSubmit={submit} className="space-y-4">
                        <div
                            onDragEnter={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={(e) => {
                                e.preventDefault();
                                setDragging(false);
                            }}
                            onDrop={onDrop}
                            className={[
                                'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition',
                                dragging
                                    ? 'border-indigo-500 bg-indigo-500/15'
                                    : 'border-slate-700 bg-[#0e172b] hover:border-indigo-400 hover:bg-indigo-500/10',
                            ].join(' ')}
                            onClick={() => inputRef.current?.click()}
                        >
                            <DocumentArrowUpIcon className="mb-3 h-10 w-10 text-indigo-500" />
                            <p className="text-sm font-medium text-white">
                                Перетащите CSV сюда или нажмите для выбора
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Максимум 10 МБ
                            </p>
                            {file && (
                                <p className="mt-3 rounded-lg bg-[#152033] px-3 py-1.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-200">
                                    {file.name} (
                                    {(file.size / 1024).toFixed(1)} КБ)
                                </p>
                            )}
                            <input
                                ref={inputRef}
                                type="file"
                                accept=".csv,text/csv,.txt,text/plain"
                                className="hidden"
                                onChange={(e) =>
                                    pickFile(e.target.files?.[0] || null)
                                }
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <ArrowUpTrayIcon className="h-4 w-4" />
                                {uploading ? 'Импорт…' : 'Импортировать'}
                            </button>
                        </div>
                    </form>
                </div>

                {result && (
                    <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800 sm:p-6">
                        <h2 className="mb-3 text-sm font-semibold text-white">
                            Результат импорта
                        </h2>
                        <div className="mb-4 grid gap-3 sm:grid-cols-3">
                            <Stat label="Создано" value={result.created} tone="green" />
                            <Stat label="Обновлено" value={result.updated} tone="blue" />
                            <Stat label="Ошибок" value={result.errors} tone="red" />
                        </div>

                        {Array.isArray(result.error_rows) &&
                            result.error_rows.length > 0 && (
                                <div className="overflow-hidden rounded-lg ring-1 ring-slate-800">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-[#1a2740]">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-slate-300">
                                                    Строка
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-300">
                                                    Штрихкод
                                                </th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-300">
                                                    Ошибки
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-[#152033]">
                                            {result.error_rows.map((row) => (
                                                <tr key={`${row.row}-${row.barcode || 'x'}`}>
                                                    <td className="px-3 py-2 text-white">
                                                        {row.row}
                                                    </td>
                                                    <td className="px-3 py-2 font-mono text-xs text-slate-200">
                                                        {row.barcode || '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-red-600">
                                                        {(row.messages || []).join('; ')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

function Stat({ label, value, tone }) {
    const tones = {
        green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
        blue: 'bg-sky-50 text-sky-800 ring-sky-200',
        red: 'bg-rose-50 text-rose-800 ring-rose-200',
    };

    return (
        <div className={`rounded-xl px-4 py-3 ring-1 ${tones[tone]}`}>
            <div className="text-xs font-medium opacity-80">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{value ?? 0}</div>
        </div>
    );
}
