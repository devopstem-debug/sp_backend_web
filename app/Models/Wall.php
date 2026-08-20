<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wall extends Model
{
    use HasUuids;

    public const TYPES = [
        'wall' => 'Стена',
        'door' => 'Дверь',
        'window' => 'Окно',
    ];

    protected $fillable = [
        'store_id',
        'start_x',
        'start_y',
        'end_x',
        'end_y',
        'wall_type',
    ];

    protected function casts(): array
    {
        return [
            'start_x' => 'decimal:2',
            'start_y' => 'decimal:2',
            'end_x' => 'decimal:2',
            'end_y' => 'decimal:2',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
