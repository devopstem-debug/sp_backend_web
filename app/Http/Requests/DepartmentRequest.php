<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesCrudPermission;
use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class DepartmentRequest extends FormRequest
{
    use AuthorizesCrudPermission;

    public function authorize(): bool
    {
        return $this->authorizeCrud(Permissions::CREATE_DEPARTMENTS, Permissions::EDIT_DEPARTMENTS);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $departmentId = $this->route('department');

        return [
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'code' => [
                'required',
                'string',
                'max:10',
                'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('departments', 'code')
                    ->where(fn ($query) => $query
                        ->where('store_id', $this->input('store_id'))
                        ->whereNull('deleted_at'))
                    ->ignore($departmentId),
            ],
            'name' => ['required', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'size:7', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'store_id.required' => 'Выберите магазин.',
            'store_id.exists' => 'Выбранный магазин не найден.',
            'code.required' => 'Укажите код отдела.',
            'code.regex' => 'Код должен содержать только A-Z, 0-9, _ или -.',
            'code.unique' => 'Отдел с таким кодом уже есть в этом магазине.',
            'name.required' => 'Укажите название отдела.',
            'color.size' => 'Цвет должен быть в формате #RRGGBB.',
            'color.regex' => 'Цвет должен быть в формате #RRGGBB.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->constrainHeadToOwnScope();

        $code = strtoupper(trim((string) $this->input('code', '')));

        $this->merge([
            'code' => $code,
            'color' => $this->filled('color')
                ? strtoupper((string) $this->input('color'))
                : '#CCCCCC',
            'sort_order' => $this->input('sort_order', 0),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function departmentAttributes(): array
    {
        $validated = $this->validated();
        $name = trim((string) $validated['name']);

        return [
            'store_id' => $validated['store_id'],
            'code' => strtoupper((string) $validated['code']),
            'name' => [
                'ru' => $name,
                'en' => $name,
            ],
            'color' => $validated['color'] ?? '#CCCCCC',
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $storeId = $this->input('store_id');
            $user = $this->user();

            if (! $storeId || ! $user || $user->isSuperAdmin()) {
                return;
            }

            $store = Store::query()->find($storeId);

            if ($store && $user->tenant_id && $store->tenant_id !== $user->tenant_id) {
                $validator->errors()->add('store_id', 'Магазин принадлежит другому арендатору.');
            }

            if ($user->restrictsToOwnDepartment() && $user->ownedStoreId() && $storeId !== $user->ownedStoreId()) {
                $validator->errors()->add('store_id', 'Можно работать только со своим отделом.');
            }
        });
    }
}
