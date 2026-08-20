import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import CoolerForm, {
    buildCoolerFormData,
    validateCoolerForm,
} from './CoolerForm';

export default function Create({
    stores = [],
    departments = [],
    temperatureZones = {},
    selectedStoreId = null,
    selectedDepartmentId = null,
    suggestedCode = null,
}) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildCoolerFormData(null, selectedStoreId, selectedDepartmentId),
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
        router.get(route('coolers.create'), previewParams(storeId, departmentId), {
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

        const nextErrors = validateCoolerForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            store_id: form.store_id,
            department_id: form.department_id,
            display_name: String(form.display_name || '').trim() || null,
            width_mm: Number(form.width_mm),
            height_mm: Number(form.height_mm),
            depth_mm: Number(form.depth_mm),
            door_count: Number(form.door_count),
            shelf_count: Number(form.shelf_count),
            temperature_zone: form.temperature_zone,
        }));

        post(route('coolers.store'), {
            onSuccess: () => fireSuccess('Холодильник создан.'),
            onError: () => fireError('Не удалось создать холодильник.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый холодильник
                </h1>
            }
        >
            <Head title="Новый холодильник" />

            <CoolerForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                stores={stores}
                departments={departments}
                temperatureZones={temperatureZones}
                suggestedCode={suggestedCode}
                submitLabel="Создать"
                onSubmit={submit}
                onStoreChange={handleStoreChange}
                onDepartmentChange={handleDepartmentChange}
            />
        </AdminLayout>
    );
}
