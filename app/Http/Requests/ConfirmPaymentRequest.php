<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmPaymentRequest extends FormRequest
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
            'payment_id' => ['nullable', 'uuid', 'exists:payments,id'],
            'transaction_id' => ['nullable', 'string', 'max:100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $transaction = trim((string) $this->input('transaction_id', ''));

        $this->merge([
            'transaction_id' => $transaction !== '' ? $transaction : null,
        ]);
    }
}
