<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToStoreTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Stand extends Model
{
    use BelongsToStoreTenant, HasUuids, LogsActivity, SoftDeletes;

    public const STAND_TYPES = [
        'gondola' => 'Гондола',
        'endcap' => 'Торцевая',
        'island' => 'Остров',
        'wall' => 'Пристенная',
        'other' => 'Другое',
    ];

    protected $fillable = [
        'store_id',
        'department_id',
        'code',
        'display_name',
        'stand_type',
        'width_mm',
        'height_mm',
        'depth_mm',
        'shelf_count',
        'has_back',
        'sort_order',
        'pos_x',
        'pos_y',
        'rotation',
    ];

    protected function casts(): array
    {
        return [
            'display_name' => 'array',
            'width_mm' => 'integer',
            'height_mm' => 'integer',
            'depth_mm' => 'integer',
            'shelf_count' => 'integer',
            'has_back' => 'boolean',
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
        return $this->hasMany(StandShelfLevel::class)->orderBy('sort_order')->orderBy('level_number');
    }

    public function displayLabel(): string
    {
        $name = is_array($this->display_name)
            ? ($this->display_name['ru'] ?? $this->display_name['en'] ?? '')
            : (string) $this->display_name;

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
