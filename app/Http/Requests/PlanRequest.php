<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::MANAGE_PLANS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $planId = $this->route('plan');

        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => [
                'nullable',
                'string',
                'max:50',
                'alpha_dash',
                Rule::unique('plans', 'slug')->whereNull('deleted_at')->ignore($planId),
            ],
            'price_monthly' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'price_yearly' => ['required', 'numeric', 'min:0', 'max:999999.99'],
            'max_stores' => ['required', 'integer', 'min:1', 'max:10000'],
            'max_users' => ['required', 'integer', 'min:1', 'max:100000'],
            'max_products' => ['required', 'integer', 'min:1', 'max:1000000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:10000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $features = $this->input('features', []);

        if (is_string($features)) {
            $features = preg_split('/\r\n|\r|\n/', $features) ?: [];
        }

        if (! is_array($features)) {
            $features = [];
        }

        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'slug' => ($slug = strtolower(trim((string) $this->input('slug', '')))) !== '' ? $slug : null,
            'features' => array_values(array_filter(array_map(
                static fn (mixed $item): string => trim((string) $item),
                $features,
            ))),
            'is_active' => filter_var(
                $this->input('is_active', true),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? true,
            'sort_order' => $this->input('sort_order') === '' ? 0 : $this->input('sort_order'),
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите название тарифа.',
            'price_monthly.required' => 'Укажите цену за месяц.',
            'price_yearly.required' => 'Укажите цену за год.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function planAttributes(): array
    {
        $validated = $this->validated();

        return [
            'name' => $validated['name'],
            'slug' => $validated['slug'] ?? $validated['name'],
            'price_monthly' => $validated['price_monthly'],
            'price_yearly' => $validated['price_yearly'],
            'max_stores' => (int) $validated['max_stores'],
            'max_users' => (int) $validated['max_users'],
            'max_products' => (int) $validated['max_products'],
            'features' => $validated['features'] ?? [],
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ];
    }
}
