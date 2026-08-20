<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Tenant;
use App\Services\TenantQuotaService;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::CREATE_USERS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $allowedRoles = $this->user()?->isSuperAdmin()
            ? Permissions::roles()
            : Permissions::tenantRoles();

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', Password::defaults()],
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

        $this->merge([
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true,
            'timezone' => $this->input('timezone') ?: 'Europe/Minsk',
            'locale' => $this->input('locale') ?: 'ru',
        ]);
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
            'password.required' => 'Укажите пароль.',
            'password.min' => 'Пароль должен быть не короче 8 символов.',
            'role.required' => 'Выберите роль.',
            'role.in' => 'Выбранная роль недоступна.',
            'tenant_id.required' => 'Выберите арендатора.',
            'tenant_id.exists' => 'Арендатор не найден.',
            'department_id.required' => 'Выберите отдел для заведующего.',
            'department_id.exists' => 'Отдел не найден.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->input('role') === Permissions::ROLE_SUPER_ADMIN) {
                return;
            }

            $tenantId = $this->input('tenant_id');

            if (! is_string($tenantId) || $tenantId === '') {
                return;
            }

            $tenant = Tenant::query()->find($tenantId);

            if (! $tenant) {
                return;
            }

            $quotas = app(TenantQuotaService::class);

            if (! $quotas->canAddUser($tenant)) {
                $validator->errors()->add('tenant_id', $quotas->userLimitMessage($tenant));
            }
        });
    }
}
