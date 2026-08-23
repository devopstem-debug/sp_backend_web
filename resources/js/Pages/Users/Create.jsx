import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess, fireToast } from '@/lib/swal';
import UserForm, {
    buildUserFormData,
    isSuperAdminRole,
    validateUserForm,
} from './UserForm';

export default function Create({
    roles = [],
    tenants = [],
    departments = [],
    canManageTenants = false,
    defaultTenantId = null,
    quota = null,
}) {
    const { flash } = usePage().props;
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildUserFormData(null, {
            tenant_id: defaultTenantId || '',
            defaultTenantId,
            is_active: true,
        }),
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

        const nextErrors = validateUserForm(data, { requirePassword: true });
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            phone: form.phone === '' ? null : form.phone,
            tenant_id: isSuperAdminRole(form.role)
                ? null
                : form.tenant_id || defaultTenantId || null,
            department_id:
                form.role === 'Заведующий' ? form.department_id || null : null,
            is_active: Boolean(form.is_active),
        }));

        post(route('users.store'), {
            onSuccess: (page) => {
                const nextFlash = page?.props?.flash;
                if (nextFlash?.error) {
                    fireError(nextFlash.error);
                    return;
                }
                if (nextFlash?.warning) {
                    fireToast('warning', nextFlash.warning);
                }
                if (nextFlash?.success) {
                    fireSuccess(nextFlash.success);
                }
            },
            onError: (formErrors) => {
                const first = Object.values(formErrors || {})[0];
                const message = Array.isArray(first) ? first[0] : first;
                fireError(message || 'Не удалось создать пользователя.');
            },
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый пользователь
                </h1>
            }
        >
            <Head title="Новый пользователь" />

            {quota ? (
                <div className="mb-4 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                    Пользователи по тарифу:{' '}
                    <span className="font-semibold text-white">
                        {quota.used} / {quota.max}
                    </span>
                    {quota.message ? (
                        <p className="mt-1 text-amber-300">{quota.message}</p>
                    ) : null}
                </div>
            ) : null}

            <UserForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                roles={roles}
                tenants={tenants}
                departments={departments}
                canManageTenants={canManageTenants}
                requirePassword
                submitLabel="Создать"
                onSubmit={submit}
                cancelHref={route('users.index')}
            />
        </AdminLayout>
    );
}
