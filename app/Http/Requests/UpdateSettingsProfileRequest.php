<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSettingsProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::EDIT_PROFILE) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique(User::class, 'email')->ignore($this->user()?->id),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'timezone' => ['required', 'string', 'max:50', 'timezone'],
            'locale' => ['required', 'string', Rule::in(['ru', 'en'])],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите имя.',
            'email.required' => 'Укажите email.',
            'email.email' => 'Некорректный email.',
            'email.unique' => 'Этот email уже занят.',
            'timezone.required' => 'Выберите часовой пояс.',
            'locale.required' => 'Выберите язык.',
        ];
    }
}
