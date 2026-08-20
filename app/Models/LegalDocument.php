<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\LegalDocumentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

class LegalDocument extends Model
{
    /** @use HasFactory<LegalDocumentFactory> */
    use HasFactory, HasUuids, LogsActivity, SoftDeletes;

    public const TYPE_OFERTA = 'oferta';

    public const TYPE_PRIVACY = 'privacy_policy';

    protected $fillable = [
        'type',
        'title',
        'content',
        'version',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @return list<string>
     */
    public static function types(): array
    {
        return [
            self::TYPE_OFERTA,
            self::TYPE_PRIVACY,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function typeLabels(): array
    {
        return [
            self::TYPE_OFERTA => 'Публичная оферта',
            self::TYPE_PRIVACY => 'Политика конфиденциальности',
        ];
    }

    public function typeLabel(): string
    {
        return self::typeLabels()[$this->type] ?? $this->type;
    }

    public function publicPath(): string
    {
        return $this->type === self::TYPE_PRIVACY ? '/privacy-policy' : '/oferta';
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
