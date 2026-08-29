<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreLayoutMarker extends Model
{
    use HasUuids;

    public const TYPES = [
        'cash_register' => 'Касса',
        'entrance' => 'Вход',
        'exit' => 'Выход',
        'beacon' => 'Маяк',
    ];

    public const DEFAULTS = [
        'cash_register' => ['width' => 1.2, 'depth' => 0.8, 'color' => '#eab308'],
        'entrance' => ['width' => 1.5, 'depth' => 0.4, 'color' => '#22c55e'],
        'exit' => ['width' => 1.5, 'depth' => 0.4, 'color' => '#f97316'],
        'beacon' => ['width' => 0.4, 'depth' => 0.4, 'color' => '#a855f7'],
    ];

    protected $fillable = [
        'store_id',
        'marker_type',
        'code',
        'pos_x',
        'pos_y',
        'rotation',
        'width_meters',
        'depth_meters',
        'color',
    ];

    protected function casts(): array
    {
        return [
            'pos_x' => 'decimal:2',
            'pos_y' => 'decimal:2',
            'rotation' => 'integer',
            'width_meters' => 'decimal:2',
            'depth_meters' => 'decimal:2',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
