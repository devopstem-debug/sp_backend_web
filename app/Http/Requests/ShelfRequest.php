<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesCrudPermission;
use App\Models\Department;
use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ShelfRequest extends FormRequest
{
    use AuthorizesCrudPermission;

    public function authorize(): bool
    {
        return $this->authorizeCrud(Permissions::CREATE_SHELVES, Permissions::EDIT_SHELVES)
            && $this->headOwnsDepartment($this->input('department_id'));
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'department_id' => ['required', 'uuid', 'exists:departments,id'],
            'name' => ['nullable', 'string', 'max:100'],
            'width_mm' => ['required', 'integer', 'min:100', 'max:10000'],
            'height_mm' => ['required', 'integer', 'min:100', 'max:10000'],
            'depth_mm' => ['required', 'integer', 'min:100', 'max:5000'],
            'shelf_count' => ['required', 'integer', 'min:3', 'max:7'],
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
            'department_id.required' => 'Выберите отдел.',
            'shelf_count.min' => 'Минимум 3 этажа.',
            'shelf_count.max' => 'Максимум 7 этажей.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->constrainHeadToOwnScope();

        $this->merge([
            'width_mm' => $this->filled('width_mm') ? (int) $this->input('width_mm') : 1500,
            'height_mm' => $this->filled('height_mm') ? (int) $this->input('height_mm') : 1600,
            'depth_mm' => $this->filled('depth_mm') ? (int) $this->input('depth_mm') : 700,
            'shelf_count' => $this->filled('shelf_count') ? (int) $this->input('shelf_count') : 5,
            'sort_order' => $this->input('sort_order', 0),
            'name' => $this->filled('name') ? trim((string) $this->input('name')) : null,
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            $department = Department::query()->find($this->input('department_id'));
            $storeId = $this->input('store_id');

            if ($department && $storeId && $department->store_id !== $storeId) {
                $validator->errors()->add('department_id', 'Отдел не принадлежит выбранному магазину.');
            }

            $user = $this->user();
            if ($storeId && $user && ! $user->isSuperAdmin()) {
                $store = Store::query()->find($storeId);
                if ($store && $user->tenant_id && $store->tenant_id !== $user->tenant_id) {
                    $validator->errors()->add('store_id', 'Магазин принадлежит другому арендатору.');
                }
            }
        });
    }
}
