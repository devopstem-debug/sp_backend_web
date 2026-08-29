<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreLayout extends Model
{
    use HasUuids;

    public const SIDES = [
        'north' => 'Север',
        'south' => 'Юг',
        'west' => 'Запад',
        'east' => 'Восток',
    ];

    protected $fillable = [
        'store_id',
        'width_meters',
        'height_meters',
        'grid_size_cm',
        'entrance_side',
        'entrance_offset_m',
        'entrance_width_m',
        'has_cash_registers',
        'cash_side',
        'cash_count',
        'origin',
        'geo_polygon',
        'geo_center_lat',
        'geo_center_lng',
        'geo_address',
        'area_sqm_geo',
        'bearing_degrees',
    ];

    protected function casts(): array
    {
        return [
            'width_meters' => 'decimal:2',
            'height_meters' => 'decimal:2',
            'grid_size_cm' => 'integer',
            'entrance_offset_m' => 'decimal:2',
            'entrance_width_m' => 'decimal:2',
            'has_cash_registers' => 'boolean',
            'cash_count' => 'integer',
            'geo_polygon' => 'array',
            'geo_center_lat' => 'decimal:7',
            'geo_center_lng' => 'decimal:7',
            'area_sqm_geo' => 'decimal:2',
            'bearing_degrees' => 'decimal:2',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
