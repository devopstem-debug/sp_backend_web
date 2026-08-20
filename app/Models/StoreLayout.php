<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoreLayout extends Model
{
    use HasUuids;

    protected $fillable = [
        'store_id',
        'width_meters',
        'height_meters',
        'grid_size_cm',
    ];

    protected function casts(): array
    {
        return [
            'width_meters' => 'decimal:2',
            'height_meters' => 'decimal:2',
            'grid_size_cm' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
