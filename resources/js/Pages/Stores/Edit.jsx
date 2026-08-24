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
        }));

        put(route('stores.update', store.id), {
            onSuccess: () => fireSuccess('Магазин обновлён.'),
            onError: () => fireError('Не удалось обновить магазин.'),
        });
    };

    return (
        <AdminLayout
            flush
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование магазина
                </h1>
            }
        >
            <Head title={`Редактирование: ${store.name}`} />

            <div className="h-full min-h-0">
                <StoreForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    clientErrors={clientErrors}
                    processing={processing}
                    tenants={tenants}
                    submitLabel="Обновить"
                    onSubmit={submit}
                />
            </div>
        </AdminLayout>
    );
}
