<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProductImportService
{
    public const HEADERS = [
        'barcode',
        'name',
        'category',
        'volume_ml',
        'package_type',
        'width_mm',
        'height_mm',
        'depth_mm',
        'weight_g',
    ];

    /**
     * @return array{
     *     created: int,
     *     updated: int,
     *     errors: int,
     *     error_rows: list<array{row: int, barcode: string|null, messages: list<string>}>
     * }
     */
    public function import(UploadedFile $file, string $tenantId): array
    {
        $handle = fopen($file->getRealPath(), 'rb');

        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => 'Не удалось прочитать файл.',
            ]);
        }

        $created = 0;
        $updated = 0;
        $errors = 0;
        $errorRows = [];
        $rowNumber = 0;
        $headerValidated = false;

        try {
            while (($row = fgetcsv($handle, 0, ';', '"', '\\')) !== false) {
                $rowNumber++;

                if ($this->isEmptyRow($row)) {
                    continue;
                }

                $row = $this->normalizeRow($row);

                if (! $headerValidated) {
                    if ($this->looksLikeHeader($row)) {
                        $headerValidated = true;

                        continue;
                    }

                    $headerValidated = true;
                }

                $parsed = $this->parseRow($row);
                $validator = Validator::make($parsed, $this->rowRules(), $this->rowMessages());

                if ($validator->fails()) {
                    $errors++;
                    $errorRows[] = [
                        'row' => $rowNumber,
                        'barcode' => $parsed['barcode'] !== '' ? $parsed['barcode'] : null,
                        'messages' => $validator->errors()->all(),
                    ];

                    continue;
                }

                $attributes = $this->attributesFromValidated($validator->validated());

                $product = Product::withTrashed()
                    ->where('barcode', $attributes['barcode'])
                    ->first();

                if ($product) {
                    if ($product->trashed()) {
                        $product->restore();
                    }

                    $product->update($attributes);
                    $updated++;

                    continue;
                }

                Product::query()->create([
                    ...$attributes,
                    'tenant_id' => $tenantId,
                    'checked' => false,
                ]);
                $created++;
            }
        } finally {
            fclose($handle);
        }

        if ($rowNumber === 0 || (! $headerValidated && $created === 0 && $updated === 0 && $errors === 0)) {
            throw ValidationException::withMessages([
                'file' => 'CSV-файл пуст.',
            ]);
        }

        return [
            'created' => $created,
            'updated' => $updated,
            'errors' => $errors,
            'error_rows' => $errorRows,
        ];
    }

    public function templateCsv(): string
    {
        $lines = [
            implode(';', self::HEADERS),
            '4810014018641;Квас Старажытны;Квас Белорусский;1500;ПЭТ;80;250;80;1500',
            '4607025392585;Вода негазированная;Вода;1500;ПЭТ;80;280;80;1500',
        ];

        return implode("\n", $lines)."\n";
    }

    /**
     * @return array<string, list<string>>
     */
    private function rowRules(): array
    {
        return [
            'barcode' => ['required', 'string', 'size:13', 'regex:/^\d{13}$/'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'volume_ml' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:0'],
            'height_mm' => ['nullable', 'integer', 'min:0'],
            'depth_mm' => ['nullable', 'integer', 'min:0'],
            'weight_g' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    private function rowMessages(): array
    {
        return [
            'barcode.required' => 'Штрихкод обязателен.',
            'barcode.size' => 'Штрихкод должен содержать 13 цифр.',
            'barcode.regex' => 'Штрихкод должен состоять из 13 цифр.',
            'name.required' => 'Название обязательно.',
            'volume_ml.integer' => 'volume_ml должно быть целым числом.',
            'width_mm.integer' => 'width_mm должно быть целым числом.',
            'height_mm.integer' => 'height_mm должно быть целым числом.',
            'depth_mm.integer' => 'depth_mm должно быть целым числом.',
            'weight_g.integer' => 'weight_g должно быть целым числом.',
        ];
    }

    /**
     * @param  list<string|null>  $row
     * @return array<string, mixed>
     */
    private function parseRow(array $row): array
    {
        $values = [];

        foreach (self::HEADERS as $index => $header) {
            $values[$header] = isset($row[$index]) ? trim((string) $row[$index]) : '';
        }

        $values['barcode'] = preg_replace('/\s+/', '', $values['barcode']) ?? '';

        foreach (['volume_ml', 'width_mm', 'height_mm', 'depth_mm', 'weight_g'] as $field) {
            if ($values[$field] === '') {
                $values[$field] = null;
            }
        }

        if ($values['package_type'] === '') {
            $values['package_type'] = null;
        }

        if ($values['category'] === '') {
            $values['category'] = null;
        }

        return $values;
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function attributesFromValidated(array $validated): array
    {
        $category = isset($validated['category']) ? trim((string) $validated['category']) : '';

        return [
            'barcode' => $validated['barcode'],
            'name' => trim((string) $validated['name']),
            'category' => $category !== '' ? $category : 'Без категории',
            'volume_ml' => $validated['volume_ml'] ?? null,
            'package_type' => isset($validated['package_type'])
                ? (trim((string) $validated['package_type']) ?: null)
                : null,
            'width_mm' => $validated['width_mm'] ?? null,
            'height_mm' => $validated['height_mm'] ?? null,
            'depth_mm' => $validated['depth_mm'] ?? null,
            'weight_g' => $validated['weight_g'] ?? null,
        ];
    }

    /**
     * @param  list<string|null>  $row
     * @return list<string>
     */
    private function normalizeRow(array $row): array
    {
        return array_map(static function ($value): string {
            $value = (string) ($value ?? '');
            $value = preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;

            return trim($value);
        }, $row);
    }

    /**
     * @param  list<string>  $row
     */
    private function looksLikeHeader(array $row): bool
    {
        $first = strtolower($row[0] ?? '');

        return $first === 'barcode' || $first === self::HEADERS[0];
    }

    /**
     * @param  list<string|null>  $row
     */
    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) ($cell ?? '')) !== '') {
                return false;
            }
        }

        return true;
    }
}
