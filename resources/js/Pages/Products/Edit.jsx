import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import ProductForm, {
    buildProductFormData,
    validateProductForm,
} from './ProductForm';

export default function Edit({ product }) {
    const [clientErrors, setClientErrors] = useState({});

    const { data, setData, put, processing, errors, transform } = useForm(
        buildProductFormData(product),
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

        put(route('products.update', product.id), {
            onSuccess: () => fireSuccess('Товар обновлён.'),
            onError: () => fireError('Не удалось обновить товар.'),
        });
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Редактирование товара
                </h1>
            }
        >
            <Head title={`Редактирование: ${product.name}`} />

            <div className="mb-4">
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        product.is_global
                            ? 'bg-sky-500/10 text-sky-300 ring-sky-400/30'
                            : 'bg-violet-500/10 text-violet-300 ring-violet-400/30'
                    }`}
                >
                    {product.is_global
                        ? 'Глобальный каталог'
                        : 'Свой бренд (только ваш арендатор)'}
                </span>
            </div>

            <ProductForm
                data={data}
                setData={setData}
                errors={errors}
                clientErrors={clientErrors}
                processing={processing}
                submitLabel="Обновить"
                onSubmit={submit}
                showCatalogHint={false}
            />
        </AdminLayout>
    );
}
