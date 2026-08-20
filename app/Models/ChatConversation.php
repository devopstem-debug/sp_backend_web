<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ChatConversation extends Model
{
    use BelongsToTenant, HasUuids, SoftDeletes;

    public const TYPE_GENERAL = 'general';

    public const TYPE_DIRECT = 'direct';

    protected $fillable = [
        'tenant_id',
        'type',
        'direct_key',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'conversation_id')->latest('created_at');
    }

    public function participants(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'chat_conversation_user',
            'conversation_id',
            'user_id',
        )
            ->withPivot(['id', 'last_read_at'])
            ->withTimestamps();
    }

    public function isGeneral(): bool
    {
        return $this->type === self::TYPE_GENERAL;
    }

    public function isDirect(): bool
    {
        return $this->type === self::TYPE_DIRECT;
    }

    public static function directKey(string $userIdA, string $userIdB): string
    {
        $ids = [$userIdA, $userIdB];
        sort($ids);

        return $ids[0].'_'.$ids[1];
    }
}
