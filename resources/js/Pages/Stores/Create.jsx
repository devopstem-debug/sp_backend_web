import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess, fireToast } from '@/lib/swal';
import StoreForm, {
    buildStoreFormData,
    validateStoreForm,
} from './StoreForm';

export default function Create({
    tenants = [],
    defaultTenantId = null,
    quota = null,
}) {
    const { flash } = usePage().props;
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildStoreFormData(null, { tenant_id: defaultTenantId || '' }),
    );

    useEffect(() => {
        if (flash?.error) {
            fireError(flash.error);
        }
        if (flash?.warning) {
            fireToast('warning', flash.warning);
        }
        if (flash?.success) {
            fireSuccess(flash.success);
        }
    }, [flash]);

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
        }));

        post(route('stores.store'), {
            onSuccess: (page) => {
                const nextFlash = page?.props?.flash;
                if (nextFlash?.error) {
                    fireError(nextFlash.error);
                    return;
                }
                fireSuccess(nextFlash?.success || 'Магазин создан.');
            },
            onError: (formErrors) => {
                const first = Object.values(formErrors || {})[0];
                const message = Array.isArray(first) ? first[0] : first;
                fireError(message || 'Не удалось создать магазин.');
            },
        });
    };

    return (
        <AdminLayout
            flush
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый магазин
                </h1>
            }
        >
            <Head title="Новый магазин" />

            <div className="flex h-full min-h-0 flex-col">
                {quota ? (
                    <div className="shrink-0 border-b border-slate-800 bg-amber-500/5 px-4 py-2.5 text-sm text-slate-300 sm:px-6">
                        Магазины по тарифу:{' '}
                        <span className="font-semibold text-white">
                            {quota.used} / {quota.max}
                        </span>
                        {quota.message ? (
                            <span className="ml-2 text-amber-300">
                                {quota.message}
                            </span>
                        ) : null}
                    </div>
                ) : null}

                <div className="min-h-0 flex-1">
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
                </div>
            </div>
        </AdminLayout>
    );
}
