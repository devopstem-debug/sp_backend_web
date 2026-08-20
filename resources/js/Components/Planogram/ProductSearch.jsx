import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

export default function ProductSearch({ value, onChange, error }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [requestError, setRequestError] = useState('');
    const wrapRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        const onDocClick = (event) => {
            if (!wrapRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, []);

    useEffect(() => {
        const q = query.trim();

        if (value || q.length < 2) {
            setResults([]);
            setLoading(false);
            setRequestError('');
            if (abortRef.current) {
                abortRef.current.abort();
            }
            return undefined;
        }

        const timer = window.setTimeout(async () => {
            if (abortRef.current) {
                abortRef.current.abort();
            }

            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            setRequestError('');

            try {
                const response = await axios.get('/api/v1/products', {
                    params: { search: q },
                    signal: controller.signal,
                });

                const items = response.data?.data ?? response.data ?? [];
                setResults(Array.isArray(items) ? items : []);
                setOpen(true);
            } catch (err) {
                if (axios.isCancel?.(err) || err?.code === 'ERR_CANCELED') {
                    return;
                }
                setResults([]);
                setRequestError('Не удалось найти товары');
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => window.clearTimeout(timer);
    }, [query, value]);

    const clearSelection = () => {
        onChange(null);
        setQuery('');
        setResults([]);
        setOpen(false);
    };

    if (value) {
        return (
            <div>
                <p className="mb-1.5 text-sm font-medium text-slate-200">Товар</p>
                <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700 bg-slate-800 p-3 text-slate-100">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">
                            {value.name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-300">
                            Штрихкод: {value.barcode || '—'}
                        </p>
                        <p className="text-xs text-slate-300">
                            Ширина: {value.width_mm ?? '—'} мм
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                        <XMarkIcon className="h-3.5 w-3.5" />
                        Убрать
                    </button>
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                )}
            </div>
        );
    }

    return (
        <div ref={wrapRef} className="relative">
            <label
                htmlFor="product-search"
                className="mb-1.5 block text-sm font-medium text-slate-200"
            >
                Товар
            </label>
            <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                    id="product-search"
                    type="search"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => {
                        if (results.length > 0 || requestError) {
                            setOpen(true);
                        }
                    }}
                    placeholder="Название или штрихкод…"
                    className={clsx(
                        'block w-full rounded-xl border-slate-700 py-2.5 pl-9 pr-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500',
                        error && 'border-red-300',
                    )}
                    autoComplete="off"
                />
            </div>

            {query.trim().length > 0 && query.trim().length < 2 && (
                <p className="mt-1 text-xs text-slate-400">
                    Введите минимум 2 символа
                </p>
            )}

            {open && query.trim().length >= 2 && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-800 bg-[#152033] py-1 shadow-lg">
                    {loading && (
                        <p className="px-3 py-2 text-sm text-slate-400">
                            Поиск…
                        </p>
                    )}
                    {!loading && requestError && (
                        <p className="px-3 py-2 text-sm text-red-600">
                            {requestError}
                        </p>
                    )}
                    {!loading &&
                        !requestError &&
                        results.length === 0 && (
                            <p className="px-3 py-2 text-sm text-slate-400">
                                Ничего не найдено
                            </p>
                        )}
                    {!loading &&
                        results.map((product) => (
                            <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                    onChange(product);
                                    setQuery('');
                                    setResults([]);
                                    setOpen(false);
                                }}
                                className="flex w-full flex-col px-3 py-2 text-left hover:bg-indigo-500/15"
                            >
                                <span className="text-sm font-medium text-white">
                                    {product.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {product.barcode}
                                    {' · '}
                                    {product.width_mm ?? '—'} мм
                                </span>
                            </button>
                        ))}
                </div>
            )}

            {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        </div>
    );
}
