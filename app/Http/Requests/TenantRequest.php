<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Plan;
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
            'plan' => [
                'required',
                'string',
                Rule::exists('plans', 'slug')->whereNull('deleted_at'),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $payload = [
            'domain' => strtolower(trim((string) $this->input('domain', ''))),
            'name' => trim((string) $this->input('name', '')),
        ];

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
            'plan.exists' => 'Выбранный тариф не найден или неактивен.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function tenantAttributes(): array
    {
        $validated = $this->validated();
        $plan = Plan::query()
            ->where('slug', $validated['plan'])
            ->firstOrFail();

        $payload = [
            'name' => $validated['name'],
            'domain' => $validated['domain'],
            'plan' => $plan->slug,
            'max_stores' => (int) $plan->max_stores,
            'max_users' => (int) $plan->max_users,
            'max_products' => (int) $plan->max_products,
        ];

        if ($this->isMethod('POST')) {
            $payload['subscription_until'] = now()->addYear()->toDateString();
            $payload['is_active'] = array_key_exists('is_active', $validated)
                ? (bool) $validated['is_active']
                : true;
        } elseif (array_key_exists('is_active', $validated)) {
            $payload['is_active'] = (bool) $validated['is_active'];
        }

        return $payload;
    }
}
