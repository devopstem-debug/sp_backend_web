import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import StoreForm, {
    buildStoreFormData,
    validateStoreForm,
} from './StoreForm';

export default function Create({ tenants = [], defaultTenantId = null }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildStoreFormData(null, { tenant_id: defaultTenantId || '' }),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateStoreForm(data);

        if (tenants.length > 0 && !data.tenant_id) {
            nextErrors.tenant_id = 'Выберите арендатора.';
        }

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

        post(route('stores.store'), {
            onSuccess: () => fireSuccess('Магазин создан.'),
            onError: () => fireError('Не удалось создать магазин.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый магазин
                </h1>
            }
        >
            <Head title="Новый магазин" />

            <StoreForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                tenants={tenants}
                submitLabel="Создать"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
