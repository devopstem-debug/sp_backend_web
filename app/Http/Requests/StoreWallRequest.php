<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Wall;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWallRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can(Permissions::MANAGE_PLANOGRAMS) ?? false;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'start_x' => ['required', 'numeric', 'min:-200', 'max:200'],
            'start_y' => ['required', 'numeric', 'min:-200', 'max:200'],
            'end_x' => ['required', 'numeric', 'min:-200', 'max:200'],
            'end_y' => ['required', 'numeric', 'min:-200', 'max:200'],
            'wall_type' => ['nullable', 'string', Rule::in(array_keys(Wall::TYPES))],
        ];
    }
}
