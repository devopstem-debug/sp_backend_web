import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import DepartmentForm, {
    buildDepartmentFormData,
    validateDepartmentForm,
} from './DepartmentForm';

export default function Edit({ department, stores = [] }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildDepartmentFormData(department),
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

        put(route('departments.update', department.id), {
            onSuccess: () => fireSuccess('Отдел обновлён.'),
            onError: () => fireError('Не удалось обновить отдел.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование отдела
                </h1>
            }
        >
            <Head title={`Редактирование: ${department.name}`} />

            <DepartmentForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                submitLabel="Обновить"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
