<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductBotJob extends Model
{
    use HasUuids;

    public const STATUS_PENDING = 'pending';

    public const STATUS_ACCEPTED = 'accepted';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_SKIPPED = 'skipped';

    protected $fillable = [
        'product_id',
        'status',
        'suggested_name',
        'suggested_category',
        'suggested_package_type',
        'suggested_width_mm',
        'suggested_height_mm',
        'suggested_depth_mm',
        'suggested_volume_ml',
        'confidence',
        'source',
        'reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'suggested_width_mm' => 'integer',
            'suggested_height_mm' => 'integer',
            'suggested_depth_mm' => 'integer',
            'suggested_volume_ml' => 'integer',
            'confidence' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
