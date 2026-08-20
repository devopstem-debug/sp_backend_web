<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\LegalDocument;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LegalDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::MANAGE_LEGAL) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
        ];

        if ($this->isMethod('POST')) {
            $rules['type'] = ['required', 'string', Rule::in(LegalDocument::types())];
        }

        return $rules;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim((string) $this->input('title', '')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function documentAttributes(): array
    {
        $validated = $this->validated();

        $payload = [
            'title' => $validated['title'],
            'content' => $validated['content'],
        ];

        if (isset($validated['type'])) {
            $payload['type'] = $validated['type'];
        }

        return $payload;
    }
}
