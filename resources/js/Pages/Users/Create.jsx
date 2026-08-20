import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
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
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildUserFormData(null, {
            tenant_id: defaultTenantId || '',
            defaultTenantId,
            is_active: true,
        }),
    );

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
            onSuccess: () => fireSuccess('Пользователь создан.'),
            onError: () => fireError('Не удалось создать пользователя.'),
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
