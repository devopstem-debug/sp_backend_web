import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import TenantForm, {
    buildTenantFormData,
    validateTenantForm,
} from './TenantForm';

export default function Create({ plans = [] }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildTenantFormData(),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateTenantForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            max_stores: Number(form.max_stores),
            max_users: Number(form.max_users),
            subscription_until: form.subscription_until || null,
        }));

        post(route('tenants.store'), {
            onSuccess: () => fireSuccess('Арендатор создан.'),
            onError: () => fireError('Не удалось создать арендатора.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый арендатор
                </h1>
            }
        >
            <Head title="Новый арендатор" />

            <TenantForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                plans={plans}
                submitLabel="Создать"
                onSubmit={submit}
                cancelHref={route('tenants.index')}
            />
        </AdminLayout>
    );
}
