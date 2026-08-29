<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBotTrainingRule extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'keyword',
        'volume_ml_min',
        'volume_ml_max',
        'package_type',
        'width_mm',
        'height_mm',
        'depth_mm',
        'priority',
        'is_active',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'volume_ml_min' => 'integer',
            'volume_ml_max' => 'integer',
            'width_mm' => 'integer',
            'height_mm' => 'integer',
            'depth_mm' => 'integer',
            'priority' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
