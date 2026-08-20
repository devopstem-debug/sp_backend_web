import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import StandForm, {
    buildStandFormData,
    validateStandForm,
} from './StandForm';

export default function Create({
    stores = [],
    departments = [],
    standTypes = {},
    selectedStoreId = null,
    selectedDepartmentId = null,
    suggestedCode = null,
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildStandFormData(null, selectedStoreId, selectedDepartmentId),
    );

    useEffect(() => {
        if (selectedStoreId) {
            setData('store_id', selectedStoreId);
        }
        setData('department_id', selectedDepartmentId || '');
    }, [selectedStoreId, selectedDepartmentId, setData]);

    const previewParams = (storeId, departmentId) => ({
        store_id: storeId || undefined,
        department_id: departmentId || undefined,
    });

    const reloadPreview = (storeId, departmentId) => {
        router.get(route('stands.create'), previewParams(storeId, departmentId), {
            only: [
                'suggestedCode',
                'departments',
                'selectedStoreId',
                'selectedDepartmentId',
            ],
            preserveState: true,
            replace: true,
        });
    };

    const handleStoreChange = (storeId) => {
        reloadPreview(storeId, null);
    };

    const handleDepartmentChange = (departmentId) => {
        reloadPreview(data.store_id, departmentId);
    };

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateStandForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            store_id: form.store_id,
            department_id: form.department_id,
            display_name: String(form.display_name || '').trim() || null,
            stand_type: form.stand_type,
            width_mm: Number(form.width_mm),
            height_mm: Number(form.height_mm),
            depth_mm: Number(form.depth_mm),
            shelf_count: Number(form.shelf_count),
            has_back: Boolean(form.has_back),
        }));

        post(route('stands.store'), {
            onSuccess: () => fireSuccess('Стойка создана.'),
            onError: () => fireError('Не удалось создать стойку.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новая стойка
                </h1>
            }
        >
            <Head title="Новая стойка" />

            <StandForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                departments={departments}
                standTypes={standTypes}
                suggestedCode={suggestedCode}
                submitLabel="Создать"
                onSubmit={submit}
                onStoreChange={handleStoreChange}
                onDepartmentChange={handleDepartmentChange}
            />
        </AdminLayout>
    );
}
