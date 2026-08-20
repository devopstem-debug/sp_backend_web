import { Head, Link, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';

export default function Edit({ document = null, types = [] }) {
    const isEdit = Boolean(document?.id);

    const { data, setData, post, put, processing, errors } = useForm({
        type: document?.type ?? 'oferta',
        title: document?.title ?? '',
        content: document?.content ?? '',
    });

    const submit = (e) => {
        e.preventDefault();

        const options = {
            onSuccess: () => fireSuccess(isEdit ? 'Документ сохранён.' : 'Документ создан.'),
            onError: () => fireError('Не удалось сохранить документ.'),
        };

        if (isEdit) {
            put(route('admin.legal.update', document.id), options);
            return;
        }

        post(route('admin.legal.store'), options);
    };

    const inputClass = (hasError) =>
        `mt-1 block w-full rounded-lg border px-3 py-2 text-sm ${
            hasError ? 'border-red-400' : 'border-slate-700'
        }`;

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    {isEdit ? 'Редактирование документа' : 'Новый документ'}
                </h1>
            }
        >
            <Head title={isEdit ? document.title : 'Новый документ'} />

            <form
                onSubmit={submit}
                className="max-w-3xl space-y-5 rounded-xl bg-[#152033] p-6 ring-1 ring-slate-800"
            >
                {!isEdit && (
                    <div>
                        <label htmlFor="type" className="block text-sm text-slate-200">
                            Тип
                        </label>
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                            className={inputClass(Boolean(errors.type))}
                        >
                            {types.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                        {errors.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
                    </div>
                )}

                <div>
                    <label htmlFor="title" className="block text-sm text-slate-200">
                        Заголовок
                    </label>
                    <input
                        id="title"
                        value={data.title}
                        onChange={(e) => setData('title', e.target.value)}
                        className={inputClass(Boolean(errors.title))}
                    />
                    {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                </div>

                <div>
                    <label htmlFor="content" className="block text-sm text-slate-200">
                        Текст
                    </label>
                    <textarea
                        id="content"
                        rows={18}
                        value={data.content}
                        onChange={(e) => setData('content', e.target.value)}
                        className={inputClass(Boolean(errors.content))}
                    />
                    {errors.content && (
                        <p className="mt-1 text-sm text-red-500">{errors.content}</p>
                    )}
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        Сохранить
                    </button>
                    <Link
                        href={route('admin.legal.index')}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200"
                    >
                        К списку
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
