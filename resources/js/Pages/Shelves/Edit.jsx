import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import ShelfForm, {
    buildShelfFormData,
    validateShelfForm,
} from './ShelfForm';

export default function Edit({ shelf, stores = [], departments = [] }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildShelfFormData(shelf),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateShelfForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            store_id: form.store_id,
            department_id: form.department_id,
            name: String(form.name || '').trim() || null,
            shelf_count: Number(form.shelf_count),
            width_mm: Number(form.width_mm),
            height_mm: Number(form.height_mm),
            depth_mm: Number(form.depth_mm),
        }));

        put(route('shelves.update', shelf.id), {
            onSuccess: () => fireSuccess('Стеллаж обновлён.'),
            onError: () => fireError('Не удалось обновить стеллаж.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование стеллажа
                </h1>
            }
        >
            <Head title={`Редактирование: ${shelf.code}`} />

            <ShelfForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                departments={departments}
                suggestedCode={shelf.code}
                submitLabel="Обновить"
                onSubmit={submit}
                levelsLocked={Boolean(shelf.has_placements)}
            />
        </AdminLayout>
    );
}
