import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import CoolerForm, {
    buildCoolerFormData,
    validateCoolerForm,
} from './CoolerForm';

export default function Edit({
    cooler,
    stores = [],
    departments = [],
    temperatureZones = {},
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildCoolerFormData(cooler),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateCoolerForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            store_id: form.store_id,
            department_id: form.department_id,
            display_name: String(form.display_name || '').trim() || null,
            width_mm: Number(form.width_mm),
            height_mm: Number(form.height_mm),
            depth_mm: Number(form.depth_mm),
            door_count: Number(form.door_count),
            shelf_count: Number(form.shelf_count),
            temperature_zone: form.temperature_zone,
        }));

        put(route('coolers.update', cooler.id), {
            onSuccess: () => fireSuccess('Холодильник обновлён.'),
            onError: () => fireError('Не удалось обновить холодильник.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование холодильника
                </h1>
            }
        >
            <Head title={`Редактирование: ${cooler.code}`} />

            <CoolerForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                departments={departments}
                temperatureZones={temperatureZones}
                suggestedCode={cooler.code}
                submitLabel="Обновить"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
