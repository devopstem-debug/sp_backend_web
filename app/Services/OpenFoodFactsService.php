<?php

declare(strict_types=1);

namespace App\Services;

use App\Support\ProductPackageTypes;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

final class OpenFoodFactsService
{
    private const PRODUCT_ENDPOINT = 'https://world.openfoodfacts.org/api/v2/product/%s.json';

    private const SEARCH_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

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
     *     source_url: string|null,
     *     match_by: string|null
     * }
     */
    public function lookup(string $barcode): array
    {
        $barcode = preg_replace('/\D+/', '', $barcode) ?? '';
        $empty = $this->emptyResult($barcode);

        if ($barcode === '' || ! preg_match('/^\d{8,14}$/', $barcode)) {
            return $empty;
        }

        try {
            $response = $this->http()
                ->get(sprintf(self::PRODUCT_ENDPOINT, $barcode));

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

            $mapped = $this->mapProduct($product, $barcode);
            $mapped['match_by'] = 'barcode';

            return $mapped;
        } catch (Throwable $exception) {
            Log::warning('Open Food Facts lookup failed', [
                'barcode' => $barcode,
                'message' => $exception->getMessage(),
            ]);

            return $empty;
        }
    }

    /**
     * Search OFF by product name (useful when CIS/US barcodes differ).
     *
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
     *     source_url: string|null,
     *     match_by: string|null
     * }
     */
    public function searchByName(string $query, ?int $preferVolumeMl = null): array
    {
        $query = trim(preg_replace('/\s+/u', ' ', $query) ?? '');
        $empty = $this->emptyResult('');

        if (mb_strlen($query) < 3) {
            return $empty;
        }

        try {
            $response = $this->http()
                ->get(self::SEARCH_ENDPOINT, [
                    'search_terms' => $query,
                    'search_simple' => 1,
                    'action' => 'process',
                    'json' => 1,
                    'page_size' => 8,
                    'fields' => 'code,product_name,product_name_ru,product_name_en,generic_name,brands,categories,categories_ru,categories_tags,quantity,product_quantity,packaging,packaging_tags,image_front_small_url,image_small_url,image_url',
                ]);

            if (! $response->successful()) {
                return $empty;
            }

            $payload = $response->json();
            $products = is_array($payload) ? ($payload['products'] ?? []) : [];
            if (! is_array($products) || $products === []) {
                return $empty;
            }

            $best = null;
            $bestScore = -1.0;

            foreach ($products as $product) {
                if (! is_array($product)) {
                    continue;
                }

                $score = $this->scoreNameMatch($query, $product, $preferVolumeMl);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $best = $product;
                }
            }

            // Require a reasonable name similarity to avoid junk matches.
            if ($best === null || $bestScore < 0.35) {
                return $empty;
            }

            $code = preg_replace('/\D+/', '', (string) ($best['code'] ?? '')) ?? '';
            $mapped = $this->mapProduct($best, $code);
            $mapped['match_by'] = 'name';
            $mapped['found'] = $mapped['found'] || ($mapped['package_type'] !== null || $mapped['volume_ml'] !== null);

            return $mapped;
        } catch (Throwable $exception) {
            Log::warning('Open Food Facts name search failed', [
                'query' => $query,
                'message' => $exception->getMessage(),
            ]);

            return $empty;
        }
    }

    /**
     * Barcode first, then name fallback / gap fill.
     *
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
     *     source_url: string|null,
     *     match_by: string|null
     * }
     */
    public function lookupProduct(?string $barcode, ?string $name, ?int $volumeMl = null): array
    {
        $byBarcode = $barcode ? $this->lookup($barcode) : $this->emptyResult('');

        $needsMore = ! ($byBarcode['found'] ?? false)
            || empty($byBarcode['package_type'])
            || empty($byBarcode['volume_ml']);

        if (! $needsMore || $name === null || trim($name) === '') {
            return $byBarcode;
        }

        $byName = $this->searchByName($name, $volumeMl ?? ($byBarcode['volume_ml'] ?? null));

        if (! ($byName['found'] ?? false)) {
            return $byBarcode;
        }

        if (! ($byBarcode['found'] ?? false)) {
            return $byName;
        }

        // Merge: keep barcode hit, fill missing fields from name search.
        foreach (['name', 'category', 'brand', 'quantity', 'volume_ml', 'weight_g', 'package_type', 'image_url', 'source_url'] as $field) {
            if (empty($byBarcode[$field]) && ! empty($byName[$field])) {
                $byBarcode[$field] = $byName[$field];
            }
        }

        $byBarcode['match_by'] = 'barcode+name';

        return $byBarcode;
    }

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
     *     source_url: string|null,
     *     match_by: string|null
     * }
     */
    private function emptyResult(string $barcode): array
    {
        return [
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
            'match_by' => null,
        ];
    }

    private function http()
    {
        return Http::acceptJson()
            ->timeout(8)
            ->withHeaders([
                'User-Agent' => 'SmartPlanogramControlCenter/1.0 (product-bot; contact=admin@localhost)',
            ]);
    }

    /**
     * @param  array<string, mixed>  $product
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
     *     source_url: string|null,
     *     match_by: string|null
     * }
     */
    private function mapProduct(array $product, string $barcode): array
    {
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

        [$volumeMl, $weightG] = $this->parseQuantity(is_string($quantity) || is_numeric($quantity) ? (string) $quantity : null);

        return [
            'found' => $name !== null && $name !== '',
            'barcode' => $barcode,
            'name' => $name,
            'category' => $category,
            'brand' => $brand,
            'quantity' => $quantity,
            'volume_ml' => $volumeMl,
            'weight_g' => $weightG,
            'package_type' => ProductPackageTypes::normalize($this->firstNonEmpty([
                $product['packaging'] ?? null,
                is_array($product['packaging_tags'] ?? null)
                    ? ($product['packaging_tags'][0] ?? null)
                    : null,
            ])),
            'image_url' => $this->firstNonEmpty([
                $product['image_front_small_url'] ?? null,
                $product['image_small_url'] ?? null,
                $product['image_url'] ?? null,
            ]),
            'source_url' => $barcode !== ''
                ? 'https://world.openfoodfacts.org/product/'.$barcode
                : null,
            'match_by' => null,
        ];
    }

    /**
     * @param  array<string, mixed>  $product
     */
    private function scoreNameMatch(string $query, array $product, ?int $preferVolumeMl): float
    {
        $candidate = mb_strtolower((string) $this->firstNonEmpty([
            $product['product_name_ru'] ?? null,
            $product['product_name'] ?? null,
            $product['product_name_en'] ?? null,
            $product['generic_name'] ?? null,
        ]));

        $needle = mb_strtolower($query);
        if ($candidate === '') {
            return 0.0;
        }

        similar_text($needle, $candidate, $percent);
        $score = $percent / 100;

        if (str_contains($candidate, $needle) || str_contains($needle, $candidate)) {
            $score = max($score, 0.72);
        }

        // Boost shared significant tokens (brand / product words).
        $queryTokens = $this->tokens($needle);
        $candTokens = $this->tokens($candidate);
        if ($queryTokens !== [] && $candTokens !== []) {
            $overlap = count(array_intersect($queryTokens, $candTokens)) / max(count($queryTokens), 1);
            $score = max($score, $overlap * 0.9);
        }

        if ($preferVolumeMl !== null) {
            $quantity = $this->firstNonEmpty([
                $product['quantity'] ?? null,
                $product['product_quantity'] ?? null,
            ]);
            [$volumeMl] = $this->parseQuantity($quantity);
            if ($volumeMl !== null && abs($volumeMl - $preferVolumeMl) <= 50) {
                $score += 0.15;
            }
        }

        return min(1.0, $score);
    }

    /**
     * @return list<string>
     */
    private function tokens(string $value): array
    {
        $parts = preg_split('/[^\p{L}\p{N}]+/u', $value) ?: [];

        return array_values(array_filter(
            array_map(static fn (string $part): string => mb_strtolower($part), $parts),
            static fn (string $part): bool => mb_strlen($part) >= 3,
        ));
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
