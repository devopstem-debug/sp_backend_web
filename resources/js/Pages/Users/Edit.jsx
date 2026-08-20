import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import UserForm, {
    buildUserFormData,
    isSuperAdminRole,
    validateUserForm,
} from './UserForm';

export default function Edit({
    user,
    roles = [],
    tenants = [],
    departments = [],
    canManageTenants = false,
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildUserFormData(user),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateUserForm(data, { requirePassword: false });
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => {
            const payload = {
                ...form,
                phone: form.phone === '' ? null : form.phone,
                tenant_id: isSuperAdminRole(form.role)
                    ? null
                    : form.tenant_id || null,
                department_id:
                    form.role === 'Заведующий'
                        ? form.department_id || null
                        : null,
                is_active: Boolean(form.is_active),
            };

            if (!form.password) {
                delete payload.password;
            }

            return payload;
        });

        put(route('users.update', user.id), {
            onSuccess: () => fireSuccess('Пользователь обновлён.'),
            onError: () => fireError('Не удалось обновить пользователя.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование пользователя
                </h1>
            }
        >
            <Head title={`Редактирование: ${user.name}`} />

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
                requirePassword={false}
                submitLabel="Обновить"
                onSubmit={submit}
                cancelHref={route('users.show', user.id)}
            />
        </AdminLayout>
    );
}
