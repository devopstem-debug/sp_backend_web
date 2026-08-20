<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Product;
use App\Models\Shelf;
use App\Models\ShelfLevel;
use App\Services\PlacementService;
use App\Support\Permissions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
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
        $this->merge([
            'facings' => $this->filled('facings') ? (int) $this->input('facings') : $this->input('facings'),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'shelf_level_id' => ['required', 'uuid', 'exists:shelf_levels,id'],
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
            'shelf_level_id.required' => 'Выберите полку.',
            'shelf_level_id.exists' => 'Полка не найдена.',
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

            $shelfId = (string) $this->route('shelf');
            $level = ShelfLevel::query()
                ->with('shelf')
                ->find($this->input('shelf_level_id'));

            if (! $level || $level->shelf_id !== $shelfId) {
                $validator->errors()->add('shelf_level_id', 'Полка не принадлежит этому стеллажу.');

                return;
            }

            $product = Product::query()->find($this->input('product_id'));
            if (! $product) {
                $validator->errors()->add('product_id', 'Товар не найден.');

                return;
            }

            /** @var Shelf $shelf */
            $shelf = $level->shelf;

            try {
                app(PlacementService::class)->resolveGeometry(
                    $shelf,
                    $level,
                    $product,
                    (int) $this->input('facings'),
                );
            } catch (InvalidArgumentException $exception) {
                $message = $exception->getMessage();

                if (str_contains($message, 'ширина')) {
                    $validator->errors()->add('product_id', $message);
                } elseif (str_contains($message, 'превысить')) {
                    $validator->errors()->add('facings', $message);
                } else {
                    $validator->errors()->add('shelf_level_id', $message);
                }
            }
        });
    }
}
