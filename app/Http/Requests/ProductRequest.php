<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesCrudPermission;
use App\Models\Tenant;
use App\Services\TenantQuotaService;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProductRequest extends FormRequest
{
    use AuthorizesCrudPermission;

    public function authorize(): bool
    {
        return $this->authorizeCrud(Permissions::CREATE_PRODUCTS, Permissions::EDIT_PRODUCTS);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $productId = $this->route('product');

        return [
            'barcode' => [
                'required',
                'string',
                'size:13',
                'regex:/^\d{13}$/',
                Rule::unique('products', 'barcode')
                    ->whereNull('deleted_at')
                    ->ignore($productId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'volume_ml' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:0'],
            'height_mm' => ['nullable', 'integer', 'min:0'],
            'depth_mm' => ['nullable', 'integer', 'min:0'],
            'weight_g' => ['nullable', 'integer', 'min:0'],
            'checked' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'barcode.required' => 'Укажите штрихкод.',
            'barcode.size' => 'Штрихкод должен содержать 13 символов.',
            'barcode.regex' => 'Штрихкод должен состоять из 13 цифр.',
            'barcode.unique' => 'Товар с таким штрихкодом уже существует.',
            'name.required' => 'Укажите название товара.',
            'category.required' => 'Укажите категорию.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $nullableInts = ['volume_ml', 'width_mm', 'height_mm', 'depth_mm', 'weight_g'];
        $merged = [
            'checked' => $this->boolean('checked'),
            'barcode' => preg_replace('/\s+/', '', (string) $this->input('barcode', '')),
        ];

        foreach ($nullableInts as $field) {
            $value = $this->input($field);
            $merged[$field] = ($value === '' || $value === null) ? null : $value;
        }

        if ($this->input('package_type') === '') {
            $merged['package_type'] = null;
        }

        $this->merge($merged);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->isMethod('POST')) {
                return;
            }

            $tenantId = $this->user()?->tenant_id;

            if (! is_string($tenantId) || $tenantId === '') {
                return;
            }

            $tenant = Tenant::query()->find($tenantId);

            if (! $tenant) {
                return;
            }

            $quotas = app(TenantQuotaService::class);

            if (! $quotas->canAddProduct($tenant)) {
                $validator->errors()->add('name', $quotas->productLimitMessage($tenant));
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function productAttributes(): array
    {
        $validated = $this->validated();

        return [
            'barcode' => $validated['barcode'],
            'name' => trim($validated['name']),
            'category' => trim($validated['category']),
            'volume_ml' => $validated['volume_ml'] ?? null,
            'package_type' => isset($validated['package_type'])
                ? trim((string) $validated['package_type']) ?: null
                : null,
            'width_mm' => $validated['width_mm'] ?? null,
            'height_mm' => $validated['height_mm'] ?? null,
            'depth_mm' => $validated['depth_mm'] ?? null,
            'weight_g' => $validated['weight_g'] ?? null,
            'checked' => (bool) ($validated['checked'] ?? false),
        ];
    }
}
