<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class OpenFoodFactsService
{
    private const ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/%s.json';

    /**
     * @return array{
     *     found: bool,
     *     barcode: string,
     *     name: string|null,
     *     category: string|null,
     *     brand: string|null,
     *     quantity: string|null,
     *     volume_ml: int|null,
     *     weight_g: int|null,
     *     package_type: string|null,
     *     image_url: string|null,
     *     source_url: string|null
     * }
     */
    public function lookup(string $barcode): array
    {
        $barcode = preg_replace('/\D+/', '', $barcode) ?? '';

        $empty = [
            'found' => false,
            'barcode' => $barcode,
            'name' => null,
            'category' => null,
            'brand' => null,
            'quantity' => null,
            'volume_ml' => null,
            'weight_g' => null,
            'package_type' => null,
            'image_url' => null,
            'source_url' => null,
        ];

        if ($barcode === '' || ! preg_match('/^\d{8,14}$/', $barcode)) {
            return $empty;
        }

        try {
            $response = Http::acceptJson()
                ->timeout(6)
                ->withHeaders([
                    'User-Agent' => 'SmartPlanogramControlCenter/1.0 (product-lookup)',
                ])
                ->get(sprintf(self::ENDPOINT, $barcode));

            if (! $response->successful()) {
                return $empty;
            }

            $payload = $response->json();
            if (! is_array($payload) || (int) ($payload['status'] ?? 0) !== 1) {
                return $empty;
            }

            $product = $payload['product'] ?? null;
            if (! is_array($product)) {
                return $empty;
            }

            $name = $this->firstNonEmpty([
                $product['product_name_ru'] ?? null,
                $product['product_name'] ?? null,
                $product['product_name_en'] ?? null,
                $product['generic_name'] ?? null,
            ]);

            $brand = $this->firstNonEmpty([
                $product['brands'] ?? null,
            ]);

            if ($name && $brand && ! str_contains(mb_strtolower($name), mb_strtolower($brand))) {
                $name = trim($brand.' '.$name);
            }

            $category = $this->resolveCategory($product);
            $quantity = $this->firstNonEmpty([
                $product['quantity'] ?? null,
                $product['product_quantity'] ?? null,
            ]);

            [$volumeMl, $weightG] = $this->parseQuantity($quantity);

            return [
                'found' => $name !== null && $name !== '',
                'barcode' => $barcode,
                'name' => $name,
                'category' => $category,
                'brand' => $brand,
                'quantity' => $quantity,
                'volume_ml' => $volumeMl,
                'weight_g' => $weightG,
                'package_type' => $this->firstNonEmpty([
                    $product['packaging'] ?? null,
                    is_array($product['packaging_tags'] ?? null)
                        ? ($product['packaging_tags'][0] ?? null)
                        : null,
                ]),
                'image_url' => $this->firstNonEmpty([
                    $product['image_front_small_url'] ?? null,
                    $product['image_small_url'] ?? null,
                    $product['image_url'] ?? null,
                ]),
                'source_url' => 'https://world.openfoodfacts.org/product/'.$barcode,
            ];
        } catch (Throwable $exception) {
            Log::warning('Open Food Facts lookup failed', [
                'barcode' => $barcode,
                'message' => $exception->getMessage(),
            ]);

            return $empty;
        }
    }

    /**
     * @param  list<mixed>  $values
     */
    private function firstNonEmpty(array $values): ?string
    {
        foreach ($values as $value) {
            if (! is_string($value) && ! is_numeric($value)) {
                continue;
            }

            $trimmed = trim((string) $value);
            if ($trimmed !== '') {
                return $trimmed;
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $product
     */
    private function resolveCategory(array $product): ?string
    {
        $direct = $this->firstNonEmpty([
            $product['categories_ru'] ?? null,
            $product['categories'] ?? null,
        ]);

        if ($direct) {
            $parts = array_values(array_filter(array_map('trim', explode(',', $direct))));

            return $parts[0] ?? $direct;
        }

        $tags = $product['categories_tags'] ?? null;
        if (is_array($tags) && isset($tags[0]) && is_string($tags[0])) {
            return trim(str_replace(['en:', 'ru:', '-'], ['', '', ' '], $tags[0]));
        }

        return null;
    }

    /**
     * @return array{0: int|null, 1: int|null}
     */
    private function parseQuantity(?string $quantity): array
    {
        if ($quantity === null || $quantity === '') {
            return [null, null];
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*m(?:l|л)\b/ui', $quantity, $match)) {
            $ml = (int) round((float) str_replace(',', '.', $match[1]));

            return [$ml > 0 ? $ml : null, null];
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*l(?:\b|ит)/ui', $quantity, $match)) {
            $ml = (int) round(((float) str_replace(',', '.', $match[1])) * 1000);

            return [$ml > 0 ? $ml : null, null];
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*(?:g|гр|г)\b/ui', $quantity, $match)) {
            $grams = (int) round((float) str_replace(',', '.', $match[1]));

            return [null, $grams > 0 ? $grams : null];
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*kg\b/ui', $quantity, $match)) {
            $grams = (int) round(((float) str_replace(',', '.', $match[1])) * 1000);

            return [null, $grams > 0 ? $grams : null];
        }

        return [null, null];
    }
}
