import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import StoreForm, {
    buildStoreFormData,
    validateStoreForm,
} from './StoreForm';

export default function Edit({ store, tenants = [] }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildStoreFormData(store),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateStoreForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            latitude: form.latitude === '' ? null : form.latitude,
            longitude: form.longitude === '' ? null : form.longitude,
            area_sqm: form.area_sqm === '' ? null : form.area_sqm,
            radius_meters:
                form.radius_meters === '' ? 100 : Number(form.radius_meters),
        }));

        put(route('stores.update', store.id), {
            onSuccess: () => fireSuccess('Магазин обновлён.'),
            onError: () => fireError('Не удалось обновить магазин.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование магазина
                </h1>
            }
        >
            <Head title={`Редактирование: ${store.name}`} />

            <StoreForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                tenants={[]}
                submitLabel="Обновить"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
