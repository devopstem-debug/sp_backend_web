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

class Cooler extends Model
{
    use BelongsToStoreTenant, HasUuids, LogsActivity, SoftDeletes;

    public const TEMPERATURE_ZONES = [
        'chilled' => 'Охлаждение',
        'frozen' => 'Заморозка',
        'ambient' => 'Комнатная',
    ];

    protected $fillable = [
        'store_id',
        'department_id',
        'code',
        'display_name',
        'width_mm',
        'height_mm',
        'depth_mm',
        'door_count',
        'shelf_count',
        'temperature_zone',
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
            'door_count' => 'integer',
            'shelf_count' => 'integer',
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
        return $this->hasMany(CoolerShelfLevel::class)->orderBy('sort_order')->orderBy('level_number');
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
