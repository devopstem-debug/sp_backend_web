<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::EDIT_USERS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user');
        $allowedRoles = $this->user()?->isSuperAdmin()
            ? Permissions::roles()
            : Permissions::tenantRoles();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($userId),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'role' => ['required', 'string', Rule::in($allowedRoles)],
            'tenant_id' => [
                Rule::requiredIf(fn () => in_array($this->input('role'), Permissions::tenantRoles(), true)),
                'nullable',
                'uuid',
                'exists:tenants,id',
            ],
            'department_id' => [
                Rule::requiredIf(fn () => $this->input('role') === Permissions::ROLE_HEAD),
                'nullable',
                'uuid',
                'exists:departments,id',
            ],
            'timezone' => ['nullable', 'string', 'max:50', 'timezone'],
            'locale' => ['nullable', 'string', Rule::in(['ru', 'en'])],
            'is_active' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', 'min:8'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $role = $this->input('role');

        if ($role === Permissions::ROLE_SUPER_ADMIN) {
            $this->merge([
                'tenant_id' => null,
                'department_id' => null,
            ]);
        }

        if ($role !== Permissions::ROLE_HEAD) {
            $this->merge(['department_id' => null]);
        }

        if ($this->user() && ! $this->user()->isSuperAdmin()) {
            $this->merge(['tenant_id' => $this->user()->tenant_id]);
        }

        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            ]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Укажите имя.',
            'email.required' => 'Укажите email.',
            'email.unique' => 'Пользователь с таким email уже существует.',
            'role.required' => 'Выберите роль.',
            'role.in' => 'Выбранная роль недоступна.',
            'tenant_id.required' => 'Выберите арендатора.',
            'department_id.required' => 'Выберите отдел для заведующего.',
            'department_id.exists' => 'Отдел не найден.',
        ];
    }
}
