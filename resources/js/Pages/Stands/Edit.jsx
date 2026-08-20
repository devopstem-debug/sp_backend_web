import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import StandForm, {
    buildStandFormData,
    validateStandForm,
} from './StandForm';

export default function Edit({
    stand,
    stores = [],
    departments = [],
    standTypes = {},
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildStandFormData(stand),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateStandForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            store_id: form.store_id,
            department_id: form.department_id,
            display_name: String(form.display_name || '').trim() || null,
            stand_type: form.stand_type,
            width_mm: Number(form.width_mm),
            height_mm: Number(form.height_mm),
            depth_mm: Number(form.depth_mm),
            shelf_count: Number(form.shelf_count),
            has_back: Boolean(form.has_back),
        }));

        put(route('stands.update', stand.id), {
            onSuccess: () => fireSuccess('Стойка обновлена.'),
            onError: () => fireError('Не удалось обновить стойку.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование стойки
                </h1>
            }
        >
            <Head title={`Редактирование: ${stand.code}`} />

            <StandForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                departments={departments}
                standTypes={standTypes}
                suggestedCode={stand.code}
                submitLabel="Обновить"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
