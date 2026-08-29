<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Cooler;
use App\Models\CoolerShelfLevel;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\ShelfLevel;
use App\Models\Stand;
use App\Models\StandShelfLevel;
use App\Services\PlacementService;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use InvalidArgumentException;

class StorePlacementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return $user?->can(Permissions::CREATE_PLANOGRAMS)
            || $user?->can(Permissions::EDIT_PLANOGRAMS);
    }

    protected function prepareForValidation(): void
    {
        $levelId = $this->input('level_id') ?: $this->input('shelf_level_id');

        $this->merge([
            'facings' => $this->filled('facings') ? (int) $this->input('facings') : $this->input('facings'),
            'level_id' => $levelId,
            'shelf_level_id' => $levelId,
            'equipment_type' => $this->input('equipment_type')
                ?: ($this->route('shelf') ? 'shelf' : null),
            'equipment_id' => $this->input('equipment_id')
                ?: $this->route('shelf'),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'equipment_type' => ['required', 'string', Rule::in(['shelf', 'cooler', 'stand'])],
            'equipment_id' => ['required', 'uuid'],
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'level_id' => ['required', 'uuid'],
            'shelf_level_id' => ['nullable', 'uuid'],
            'facings' => ['required', 'integer', 'min:1', 'max:20'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_id.required' => 'Выберите товар.',
            'product_id.exists' => 'Товар не найден.',
            'level_id.required' => 'Выберите полку.',
            'facings.required' => 'Укажите количество фейсингов.',
            'facings.min' => 'Фейсинг минимум 1.',
            'facings.max' => 'Фейсинг максимум 20.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $type = (string) $this->input('equipment_type');
            $equipmentId = (string) $this->input('equipment_id');
            $levelId = (string) $this->input('level_id');
            $product = Product::query()->find($this->input('product_id'));

            if (! $product) {
                $validator->errors()->add('product_id', 'Товар не найден.');

                return;
            }

            try {
                $service = app(PlacementService::class);

                if ($type === 'shelf') {
                    $level = ShelfLevel::query()->with('shelf')->find($levelId);
                    $shelf = Shelf::query()->find($equipmentId);
                    if (! $shelf || ! $level || $level->shelf_id !== $shelf->id) {
                        $validator->errors()->add('level_id', 'Полка не принадлежит этому стеллажу.');

                        return;
                    }
                    $widthCm = (float) ($shelf->width_cm ?: max(1, round(((int) $shelf->width_mm) / 10)));
                    $service->resolveGeometry(
                        $widthCm,
                        $service->nextStartCmForShelfLevel($level),
                        $product,
                        (int) $this->input('facings'),
                    );
                } elseif ($type === 'cooler') {
                    $level = CoolerShelfLevel::query()->find($levelId);
                    $cooler = Cooler::query()->find($equipmentId);
                    if (! $cooler || ! $level || $level->cooler_id !== $cooler->id) {
                        $validator->errors()->add('level_id', 'Полка не принадлежит этому холодильнику.');

                        return;
                    }
                    $widthCm = max(1.0, round(((int) $cooler->width_mm) / 10, 2));
                    $service->resolveGeometry(
                        $widthCm,
                        $service->nextStartCmForCoolerLevel($level),
                        $product,
                        (int) $this->input('facings'),
                    );
                } else {
                    $level = StandShelfLevel::query()->find($levelId);
                    $stand = Stand::query()->find($equipmentId);
                    if (! $stand || ! $level || $level->stand_id !== $stand->id) {
                        $validator->errors()->add('level_id', 'Полка не принадлежит этой стойке.');

                        return;
                    }
                    $widthCm = max(1.0, round(((int) $stand->width_mm) / 10, 2));
                    $service->resolveGeometry(
                        $widthCm,
                        $service->nextStartCmForStandLevel($level),
                        $product,
                        (int) $this->input('facings'),
                    );
                }
            } catch (InvalidArgumentException $exception) {
                $message = $exception->getMessage();

                if (str_contains($message, 'ширина')) {
                    $validator->errors()->add('product_id', $message);
                } elseif (str_contains($message, 'превысить')) {
                    $validator->errors()->add('facings', $message);
                } else {
                    $validator->errors()->add('level_id', $message);
                }
            }
        });
    }
}
