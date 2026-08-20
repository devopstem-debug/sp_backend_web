<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Notification extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    public const TYPE_SUCCESS = 'success';

    public const TYPE_INFO = 'info';

    public const TYPE_WARNING = 'warning';

    public const TYPE_ERROR = 'error';

    public const TYPE_CHAT = 'chat';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'type',
        'title',
        'message',
        'action_url',
        'is_read',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeForUser(Builder $query, User $user): Builder
    {
        return $query->where(function (Builder $builder) use ($user): void {
            $builder
                ->where('user_id', $user->id)
                ->orWhereNull('user_id');
        });
    }
}
