<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::MANAGE_INVOICES) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'tenant_id' => ['required', 'uuid', 'exists:tenants,id'],
            'plan_id' => ['required', 'uuid', 'exists:plans,id'],
            'period_month' => ['required', 'date_format:Y-m'],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:999999.99'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'tenant_id.required' => 'Выберите арендатора.',
            'plan_id.required' => 'Выберите тариф.',
            'period_month.required' => 'Укажите месяц.',
            'period_month.date_format' => 'Месяц должен быть в формате ГГГГ-ММ.',
        ];
    }

    /**
     * @return array{tenant_id: string, plan_id: string, period_start: string, amount: float|null}
     */
    public function invoiceAttributes(): array
    {
        $validated = $this->validated();

        return [
            'tenant_id' => $validated['tenant_id'],
            'plan_id' => $validated['plan_id'],
            'period_start' => $validated['period_month'].'-01',
            'amount' => isset($validated['amount']) ? (float) $validated['amount'] : null,
        ];
    }
}
