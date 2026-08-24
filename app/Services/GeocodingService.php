<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class GeocodingService
{
    private const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

    /**
     * @return list<array{
     *     latitude: float,
     *     longitude: float,
     *     display_name: string,
     *     address: string|null,
     *     city: string|null
     * }>
     */
    public function search(string $address, ?string $city = null, int $limit = 5): array
    {
        $address = trim($address);

        if ($address === '') {
            throw new RuntimeException('Укажите адрес для поиска на карте.');
        }

        $query = $city && trim($city) !== ''
            ? trim($city).', '.$address
            : $address;

        $response = Http::timeout(12)
            ->withHeaders([
                'User-Agent' => $this->userAgent(),
                'Accept-Language' => 'ru,en',
            ])
            ->get(self::NOMINATIM_URL, [
                'q' => $query,
                'format' => 'json',
                'addressdetails' => 1,
                'limit' => max(1, min($limit, 10)),
            ]);

        if (! $response->successful()) {
            Log::warning('Geocoding request failed', [
                'status' => $response->status(),
                'query' => $query,
            ]);

            throw new RuntimeException('Сервис геокодирования временно недоступен.');
        }

        /** @var list<array<string, mixed>> $rows */
        $rows = $response->json() ?? [];

        if ($rows === []) {
            return [];
        }

        $results = [];

        foreach ($rows as $row) {
            $lat = isset($row['lat']) ? (float) $row['lat'] : null;
            $lon = isset($row['lon']) ? (float) $row['lon'] : null;

            if ($lat === null || $lon === null) {
                continue;
            }

            /** @var array<string, mixed> $details */
            $details = is_array($row['address'] ?? null) ? $row['address'] : [];

            $resolvedCity = $this->pickCity($details) ?? ($city ? trim($city) : null);

            $results[] = [
                'latitude' => $lat,
                'longitude' => $lon,
                'display_name' => (string) ($row['display_name'] ?? $query),
                'address' => $address,
                'city' => $resolvedCity,
            ];
        }

        return $results;
    }

    private function userAgent(): string
    {
        $name = (string) config('app.name', 'Smart Planogram');

        return $name.' Geocoder/1.0 ('.(string) config('app.url', 'http://localhost').')';
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function pickCity(array $details): ?string
    {
        foreach (['city', 'town', 'village', 'municipality', 'county', 'state'] as $key) {
            if (! empty($details[$key]) && is_string($details[$key])) {
                return $details[$key];
            }
        }

        return null;
    }
}
