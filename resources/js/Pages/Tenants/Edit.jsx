import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import TenantForm, {
    buildTenantFormData,
    validateTenantForm,
} from './TenantForm';

export default function Edit({ tenant, plans = [] }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors } = useForm(
        buildTenantFormData(tenant, plans),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateTenantForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        put(route('tenants.update', tenant.id), {
            onSuccess: () => fireSuccess('Арендатор обновлён.'),
            onError: () => fireError('Не удалось обновить арендатора.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование арендатора
                </h1>
            }
        >
            <Head title={`Редактирование: ${tenant.name}`} />

            <TenantForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                plans={plans}
                submitLabel="Сохранить"
                onSubmit={submit}
                cancelHref={route('tenants.show', tenant.id)}
            />
        </AdminLayout>
    );
}
