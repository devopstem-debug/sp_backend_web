<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreChatMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->canUseChat() ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $body = $this->input('body');

        if (is_string($body)) {
            $this->merge(['body' => trim($body)]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'body.required' => 'Введите сообщение.',
            'body.max' => 'Сообщение не длиннее 2000 символов.',
        ];
    }
}
