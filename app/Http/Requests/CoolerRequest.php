<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Http\Requests\Concerns\AuthorizesCrudPermission;
use App\Models\Cooler;
use App\Models\Department;
use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CoolerRequest extends FormRequest
{
    use AuthorizesCrudPermission;

    public function authorize(): bool
    {
        return $this->authorizeCrud(Permissions::CREATE_COOLERS, Permissions::EDIT_COOLERS)
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
            'display_name' => ['nullable', 'string', 'max:100'],
            'width_mm' => ['required', 'integer', 'min:100', 'max:10000'],
            'height_mm' => ['required', 'integer', 'min:100', 'max:10000'],
            'depth_mm' => ['required', 'integer', 'min:100', 'max:5000'],
            'door_count' => ['required', 'integer', 'min:1', 'max:10'],
            'shelf_count' => ['required', 'integer', 'min:3', 'max:7'],
            'temperature_zone' => ['required', 'string', Rule::in(array_keys(Cooler::TEMPERATURE_ZONES))],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->constrainHeadToOwnScope();

        $this->merge([
            'width_mm' => $this->filled('width_mm') ? (int) $this->input('width_mm') : 1500,
            'height_mm' => $this->filled('height_mm') ? (int) $this->input('height_mm') : 2000,
            'depth_mm' => $this->filled('depth_mm') ? (int) $this->input('depth_mm') : 700,
            'door_count' => $this->filled('door_count') ? (int) $this->input('door_count') : 2,
            'shelf_count' => $this->filled('shelf_count') ? (int) $this->input('shelf_count') : 5,
            'temperature_zone' => $this->input('temperature_zone', 'chilled'),
            'sort_order' => $this->input('sort_order', 0),
            'display_name' => $this->filled('display_name') ? trim((string) $this->input('display_name')) : null,
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
