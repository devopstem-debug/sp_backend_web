<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsIntegrationsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::EDIT_INTEGRATIONS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'firebase_project_id' => ['nullable', 'string', 'max:255'],
            'firebase_database_url' => ['nullable', 'string', 'max:500'],
            'firebase_credentials' => ['nullable', 'file', 'max:2048', 'mimes:json,txt'],
            'engine_base_url' => ['nullable', 'string', 'max:500'],
            'engine_secret_key' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'firebase_project_id' => $this->blankToNull('firebase_project_id'),
            'firebase_database_url' => $this->blankToNull('firebase_database_url'),
            'engine_base_url' => $this->blankToNull('engine_base_url'),
            'engine_secret_key' => $this->blankToNull('engine_secret_key'),
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            foreach (['firebase_database_url', 'engine_base_url'] as $field) {
                $value = $this->input($field);
                if (is_string($value) && $value !== '' && ! filter_var($value, FILTER_VALIDATE_URL)) {
                    $validator->errors()->add($field, 'Укажите корректный URL.');
                }
            }
        });
    }

    private function blankToNull(string $key): mixed
    {
        $value = $this->input($key);

        if (! is_string($value)) {
            return $value;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
