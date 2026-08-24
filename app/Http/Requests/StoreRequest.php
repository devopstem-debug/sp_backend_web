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

class StoreRequest extends FormRequest
{
    use AuthorizesCrudPermission;

    public function authorize(): bool
    {
        return $this->authorizeCrud(Permissions::CREATE_STORES, Permissions::EDIT_STORES);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'status' => ['required', Rule::in(['active', 'repair', 'decommissioned'])],
        ];

        if ($this->user()?->tenant_id === null && $this->user()?->isSuperAdmin()) {
            $rules['tenant_id'] = ['required', 'uuid', 'exists:tenants,id'];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название магазина.',
            'address.required' => 'Укажите адрес магазина.',
            'status.required' => 'Выберите статус.',
            'status.in' => 'Недопустимый статус.',
            'tenant_id.required' => 'Выберите арендатора.',
            'latitude.required' => 'Укажите точку на карте (широта).',
            'longitude.required' => 'Укажите точку на карте (долгота).',
            'latitude.between' => 'Широта должна быть от -90 до 90.',
            'longitude.between' => 'Долгота должна быть от -180 до 180.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->isMethod('POST')) {
                return;
            }

            $tenantId = $this->user()?->tenant_id ?: $this->input('tenant_id');

            if (! is_string($tenantId) || $tenantId === '') {
                return;
            }

            $tenant = Tenant::query()->find($tenantId);

            if (! $tenant) {
                return;
            }

            $quotas = app(TenantQuotaService::class);

            if (! $quotas->canAddStore($tenant)) {
                $field = $this->user()?->isSuperAdmin() ? 'tenant_id' : 'name';
                $validator->errors()->add($field, $quotas->storeLimitMessage($tenant));
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function storeAttributes(): array
    {
        $validated = $this->validated();
        $name = trim((string) $validated['name']);

        return [
            'name' => [
                'ru' => $name,
                'en' => $name,
            ],
            'address' => $validated['address'] ?? null,
            'city' => $validated['city'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'status' => $validated['status'],
        ];
    }
}
