<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Tenant;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::MANAGE_TENANTS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $tenantId = $this->route('tenant');

        return [
            'name' => ['required', 'string', 'max:255'],
            'domain' => [
                'required',
                'string',
                'max:255',
                Rule::unique('tenants', 'domain')->ignore($tenantId),
            ],
            'plan' => ['required', 'string', Rule::in(Tenant::plans())],
            'max_stores' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_users' => ['required', 'integer', 'min:1', 'max:100000'],
            'max_products' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'subscription_until' => ['nullable', 'date'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            'domain' => strtolower(trim((string) $this->input('domain', ''))),
            'name' => trim((string) $this->input('name', '')),
        ];

        if ($this->input('subscription_until') === '') {
            $payload['subscription_until'] = null;
        }

        if ($this->has('is_active') || $this->isMethod('POST')) {
            $payload['is_active'] = filter_var(
                $this->input('is_active', true),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? true;
        }

        $this->merge($payload);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название.',
            'domain.required' => 'Укажите домен.',
            'domain.unique' => 'Арендатор с таким доменом уже существует.',
            'plan.required' => 'Выберите тариф.',
            'plan.in' => 'Недопустимый тариф.',
            'max_stores.required' => 'Укажите лимит магазинов.',
            'max_users.required' => 'Укажите лимит пользователей.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function tenantAttributes(): array
    {
        $validated = $this->validated();

        $payload = [
            'name' => $validated['name'],
            'domain' => $validated['domain'],
            'plan' => $validated['plan'],
            'max_stores' => (int) $validated['max_stores'],
            'max_users' => (int) $validated['max_users'],
            'subscription_until' => $validated['subscription_until'] ?? null,
        ];

        if (array_key_exists('max_products', $validated)) {
            $payload['max_products'] = (int) $validated['max_products'];
        }

        if (array_key_exists('is_active', $validated)) {
            $payload['is_active'] = (bool) $validated['is_active'];
        } elseif ($this->isMethod('POST')) {
            $payload['is_active'] = true;
        }

        return $payload;
    }
}
