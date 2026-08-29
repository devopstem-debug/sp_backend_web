<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Wall;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveFloorPlanRequest extends FormRequest
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
            'layout.width_meters' => ['required', 'numeric', 'min:5', 'max:500'],
            'layout.height_meters' => ['required', 'numeric', 'min:5', 'max:500'],
            'layout.grid_size_cm' => ['required', 'integer', 'min:10', 'max:500'],
            'walls' => ['present', 'array'],
            'walls.*.id' => ['nullable', 'uuid'],
            'walls.*.start_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'walls.*.start_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'walls.*.end_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'walls.*.end_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'walls.*.wall_type' => ['nullable', 'string', Rule::in(array_keys(Wall::TYPES))],
            'shelves' => ['present', 'array'],
            'shelves.*.id' => ['required', 'uuid'],
            'shelves.*.pos_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'shelves.*.pos_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'shelves.*.rotation' => ['required', 'integer', Rule::in([0, 90, 180, 270])],
            'shelves.*.on_map' => ['sometimes', 'boolean'],
            'coolers' => ['present', 'array'],
            'coolers.*.id' => ['required', 'uuid'],
            'coolers.*.pos_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'coolers.*.pos_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'coolers.*.rotation' => ['required', 'integer', Rule::in([0, 90, 180, 270])],
            'coolers.*.on_map' => ['sometimes', 'boolean'],
            'stands' => ['present', 'array'],
            'stands.*.id' => ['required', 'uuid'],
            'stands.*.pos_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'stands.*.pos_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'stands.*.rotation' => ['required', 'integer', Rule::in([0, 90, 180, 270])],
            'stands.*.on_map' => ['sometimes', 'boolean'],
            'markers' => ['present', 'array'],
            'markers.*.id' => ['nullable', 'string', 'max:64'],
            'markers.*.marker_type' => ['required', 'string', Rule::in(array_keys(\App\Models\StoreLayoutMarker::TYPES))],
            'markers.*.code' => ['required', 'string', 'max:50'],
            'markers.*.pos_x' => ['required', 'numeric', 'min:-500', 'max:500'],
            'markers.*.pos_y' => ['required', 'numeric', 'min:-500', 'max:500'],
            'markers.*.rotation' => ['required', 'integer', Rule::in([0, 90, 180, 270])],
            'markers.*.width_meters' => ['required', 'numeric', 'min:0.1', 'max:50'],
            'markers.*.depth_meters' => ['required', 'numeric', 'min:0.1', 'max:50'],
            'markers.*.color' => ['nullable', 'string', 'max:20'],
        ];
    }
}
