import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import DepartmentForm, {
    buildDepartmentFormData,
    validateDepartmentForm,
} from './DepartmentForm';

export default function Create({ stores = [], selectedStoreId = null }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildDepartmentFormData(null, selectedStoreId),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateDepartmentForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            code: String(form.code || '')
                .trim()
                .toUpperCase(),
            sort_order:
                form.sort_order === '' || form.sort_order === null
                    ? 0
                    : Number(form.sort_order),
        }));

        post(route('departments.store'), {
            onSuccess: () => fireSuccess('Отдел создан.'),
            onError: () => fireError('Не удалось создать отдел.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый отдел
                </h1>
            }
        >
            <Head title="Новый отдел" />

            <DepartmentForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                submitLabel="Создать"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
