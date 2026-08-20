import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import PlanForm, { buildPlanFormData, toPlanPayload } from './PlanForm';

export default function Create() {
    const { data, setData, post, processing, errors, transform } = useForm(
        buildPlanFormData(),
    );

    const submit = (e) => {
        e.preventDefault();
        transform((form) => toPlanPayload(form));
        post(route('admin.plans.store'), {
            onSuccess: () => fireSuccess('Тариф создан.'),
            onError: () => fireError('Не удалось создать тариф.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый тариф
                </h1>
            }
        >
            <Head title="Новый тариф" />
            <PlanForm
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel="Создать"
                onSubmit={submit}
                cancelHref={route('admin.plans.index')}
            />
        </AdminLayout>
    );
}
