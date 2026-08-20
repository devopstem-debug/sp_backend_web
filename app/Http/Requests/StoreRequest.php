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
            'address' => ['nullable', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'radius_meters' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'area_sqm' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
            'status' => ['required', Rule::in(['active', 'repair', 'decommissioned'])],
            'working_hours_json' => ['nullable', 'string'],
            'contact_info_json' => ['nullable', 'string'],
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
            'status.required' => 'Выберите статус.',
            'status.in' => 'Недопустимый статус.',
            'tenant_id.required' => 'Выберите арендатора.',
            'latitude.between' => 'Широта должна быть от -90 до 90.',
            'longitude.between' => 'Долгота должна быть от -180 до 180.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            foreach (['working_hours_json', 'contact_info_json'] as $field) {
                $raw = $this->input($field);

                if ($raw === null || $raw === '') {
                    continue;
                }

                try {
                    $decoded = json_decode((string) $raw, true, 512, JSON_THROW_ON_ERROR);
                } catch (\JsonException) {
                    $validator->errors()->add($field, 'Некорректный JSON.');

                    continue;
                }

                if (! is_array($decoded)) {
                    $validator->errors()->add($field, 'JSON должен быть объектом или массивом.');
                }
            }

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
            'radius_meters' => $validated['radius_meters'] ?? 100,
            'area_sqm' => $validated['area_sqm'] ?? null,
            'status' => $validated['status'],
            'working_hours' => $this->decodeJsonField('working_hours_json'),
            'contact_info' => $this->decodeJsonField('contact_info_json'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function decodeJsonField(string $key): ?array
    {
        $raw = $this->input($key);

        if ($raw === null || $raw === '') {
            return null;
        }

        try {
            $decoded = json_decode((string) $raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }

        return is_array($decoded) ? $decoded : null;
    }
}
