import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import PlanForm, { buildPlanFormData, toPlanPayload } from './PlanForm';

export default function Edit({ plan }) {
    const { data, setData, put, processing, errors, transform } = useForm(
        buildPlanFormData(plan),
    );

    const submit = (e) => {
        e.preventDefault();
        transform((form) => toPlanPayload(form));
        put(route('admin.plans.update', plan.id), {
            onSuccess: () => fireSuccess('Тариф обновлён.'),
            onError: () => fireError('Не удалось обновить тариф.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование тарифа
                </h1>
            }
        >
            <Head title={`Тариф: ${plan.name}`} />
            <PlanForm
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel="Сохранить"
                onSubmit={submit}
                cancelHref={route('admin.plans.index')}
            />
        </AdminLayout>
    );
}
