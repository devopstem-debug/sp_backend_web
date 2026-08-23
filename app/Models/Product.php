<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToProductCatalog;
use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class Product extends Model
{
    /** @use HasFactory<ProductFactory> */
    use BelongsToProductCatalog, HasFactory, HasUuids, LogsActivity, SoftDeletes;

    protected $fillable = [
        'owner_tenant_id',
        'barcode',
        'name',
        'category',
        'volume_ml',
        'package_type',
        'width_mm',
        'height_mm',
        'depth_mm',
        'weight_g',
        'checked',
    ];

    protected function casts(): array
    {
        return [
            'checked' => 'boolean',
            'volume_ml' => 'integer',
            'width_mm' => 'integer',
            'height_mm' => 'integer',
            'depth_mm' => 'integer',
            'weight_g' => 'integer',
        ];
    }

    public function ownerTenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'owner_tenant_id');
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
