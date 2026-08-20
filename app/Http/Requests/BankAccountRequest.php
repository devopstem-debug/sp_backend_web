<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class BankAccountRequest extends FormRequest
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
        return [
            'account_name' => ['required', 'string', 'max:255'],
            'bank_name' => ['required', 'string', 'max:255'],
            'iban' => ['required', 'string', 'max:34'],
            'unp' => ['required', 'string', 'max:20'],
            'payment_purpose' => ['nullable', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'iban' => strtoupper(preg_replace('/\s+/', '', (string) $this->input('iban', '')) ?? ''),
            'unp' => preg_replace('/\s+/', '', (string) $this->input('unp', '')),
            'is_default' => filter_var(
                $this->input('is_default', false),
                FILTER_VALIDATE_BOOLEAN,
                FILTER_NULL_ON_FAILURE,
            ) ?? false,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function accountAttributes(): array
    {
        $validated = $this->validated();

        return [
            'account_name' => trim($validated['account_name']),
            'bank_name' => trim($validated['bank_name']),
            'iban' => $validated['iban'],
            'unp' => $validated['unp'],
            'payment_purpose' => isset($validated['payment_purpose'])
                ? trim((string) $validated['payment_purpose']) ?: null
                : null,
            'is_default' => (bool) ($validated['is_default'] ?? false),
        ];
    }
}
