<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SetupFloorPlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->can(Permissions::MANAGE_PLANOGRAMS) === true
            && $user->canSetupFloorPlanMap();
    }

    protected function prepareForValidation(): void
    {
        $width = (float) $this->input('width_meters', 0);
        $height = (float) $this->input('height_meters', 0);
        $side = (string) $this->input('entrance_side', 'south');
        $wallLength = in_array($side, ['north', 'south'], true) ? $width : $height;

        $entranceWidth = (float) $this->input('entrance_width_m', 2);
        if ($wallLength > 0) {
            $entranceWidth = min(max(0.5, $entranceWidth), max(0.5, $wallLength));
        }

        $offset = (float) $this->input('entrance_offset_m', 0);
        if ($wallLength > 0) {
            $offset = min(max(0, $offset), max(0, $wallLength - $entranceWidth));
        }

        $polygon = $this->input('geo_polygon');
        if (is_string($polygon)) {
            $decoded = json_decode($polygon, true);
            $polygon = is_array($decoded) ? $decoded : [];
        }

        $this->merge([
            'has_cash_registers' => $this->boolean('has_cash_registers'),
            'replace_existing' => $this->boolean('replace_existing'),
            'width_meters' => round($width, 1),
            'height_meters' => round($height, 1),
            'entrance_width_m' => round($entranceWidth, 1),
            'entrance_offset_m' => round($offset, 1),
            'cash_count' => $this->filled('cash_count') ? (int) $this->input('cash_count') : null,
            'grid_size_cm' => $this->filled('grid_size_cm') ? (int) $this->input('grid_size_cm') : 50,
            'geo_polygon' => is_array($polygon) ? array_values($polygon) : [],
            'bearing_degrees' => $this->input('bearing_degrees', 0) ?? 0,
            'area_sqm_geo' => $this->filled('area_sqm_geo')
                ? round((float) $this->input('area_sqm_geo'), 1)
                : null,
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'store_id' => [
                'required',
                'string',
                Rule::exists('stores', 'id')->whereNull('deleted_at'),
            ],
            'width_meters' => ['required', 'numeric', 'min:5', 'max:500'],
            'height_meters' => ['required', 'numeric', 'min:5', 'max:500'],
            'entrance_side' => ['required', 'string', Rule::in(['north', 'south', 'west', 'east'])],
            'entrance_offset_m' => ['required', 'numeric', 'min:0'],
            'entrance_width_m' => ['required', 'numeric', 'min:0.5', 'max:50'],
            'has_cash_registers' => ['required', 'boolean'],
            'cash_side' => ['nullable', 'string', Rule::in(['north', 'south', 'west', 'east'])],
            'cash_count' => ['nullable', 'integer', 'min:1', 'max:40'],
            'grid_size_cm' => ['nullable', 'integer', 'min:10', 'max:500'],
            'replace_existing' => ['sometimes', 'boolean'],
            'geo_address' => ['nullable', 'string', 'max:500'],
            'geo_center_lat' => ['nullable', 'numeric', 'between:-90,90'],
            'geo_center_lng' => ['nullable', 'numeric', 'between:-180,180'],
            'area_sqm_geo' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'bearing_degrees' => ['nullable', 'numeric', 'min:0', 'max:360'],
            'geo_polygon' => ['required', 'array', 'min:3', 'max:50'],
            'geo_polygon.*.lat' => ['required', 'numeric', 'between:-90,90'],
            'geo_polygon.*.lng' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($this->boolean('has_cash_registers')) {
                if (! $this->filled('cash_side')) {
                    $validator->errors()->add('cash_side', 'Укажите сторону касс.');
                }
                if ((int) $this->input('cash_count', 0) < 1) {
                    $validator->errors()->add('cash_count', 'Укажите количество касс.');
                }
            }

            $polygon = $this->input('geo_polygon');
            if (! is_array($polygon) || count($polygon) < 3) {
                $validator->errors()->add('geo_polygon', 'Нужно минимум 3 угла здания.');
            }
        });
    }
}
