<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToStoreTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Shelf extends Model
{
    use BelongsToStoreTenant, HasUuids, LogsActivity, SoftDeletes;

    protected $fillable = [
        'store_id',
        'department_id',
        'code',
        'name',
        'width_mm',
        'height_mm',
        'depth_mm',
        'shelf_count',
        'width_cm',
        'sort_order',
        'pos_x',
        'pos_y',
        'rotation',
    ];

    protected function casts(): array
    {
        return [
            'name' => 'array',
            'width_mm' => 'integer',
            'height_mm' => 'integer',
            'depth_mm' => 'integer',
            'shelf_count' => 'integer',
            'width_cm' => 'integer',
            'sort_order' => 'integer',
            'pos_x' => 'decimal:2',
            'pos_y' => 'decimal:2',
            'rotation' => 'integer',
        ];
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function levels(): HasMany
    {
        return $this->hasMany(ShelfLevel::class)->orderBy('sort_order')->orderBy('level_number');
    }

    public function placements(): HasManyThrough
    {
        return $this->hasManyThrough(Placement::class, ShelfLevel::class);
    }

    public function displayLabel(): string
    {
        $name = is_array($this->name) ? ($this->name['ru'] ?? $this->name['en'] ?? '') : (string) $this->name;

        return $name !== '' ? $name : (string) $this->code;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
