<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Subscription;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscribeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user !== null
            && $user->tenant_id !== null
            && $user->can(Permissions::MANAGE_BILLING);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'uuid', 'exists:plans,id'],
            'interval' => ['required', 'string', Rule::in(Subscription::intervals())],
            'auto_renew' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'auto_renew' => filter_var(
                $this->input('auto_renew', true),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? true,
        ]);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'plan_id.required' => 'Выберите тариф.',
            'plan_id.exists' => 'Тариф не найден.',
            'interval.required' => 'Выберите период оплаты.',
            'interval.in' => 'Недопустимый период оплаты.',
        ];
    }
}
