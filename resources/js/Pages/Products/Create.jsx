import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import ProductForm, {
    buildProductFormData,
    validateProductForm,
} from './ProductForm';

export default function Create() {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, post, processing, errors, transform } = useForm(
        buildProductFormData(),
    );

    const submit = (e) => {
        e.preventDefault();

        const nextErrors = validateProductForm(data);
        setClientErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            fireError('Исправьте ошибки в форме.');
            return;
        }

        transform((form) => ({
            ...form,
            volume_ml: form.volume_ml === '' ? null : form.volume_ml,
            width_mm: form.width_mm === '' ? null : form.width_mm,
            height_mm: form.height_mm === '' ? null : form.height_mm,
            depth_mm: form.depth_mm === '' ? null : form.depth_mm,
            weight_g: form.weight_g === '' ? null : form.weight_g,
            package_type: form.package_type || null,
        }));

        post(route('products.store'), {
            onSuccess: () => fireSuccess('Товар создан.'),
            onError: () => fireError('Не удалось создать товар.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Новый товар
                </h1>
            }
        >
            <Head title="Новый товар" />

            <ProductForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                submitLabel="Создать"
                onSubmit={submit}
            />
        </AdminLayout>
    );
}
