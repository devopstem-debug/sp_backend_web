<?php

declare(strict_types=1);

use App\Models\ChatConversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function (User $user, string $id): bool {
    return $user->id === $id;
});

Broadcast::channel('tenant.{tenantId}.chat', function (User $user, string $tenantId): bool {
    return $user->canUseChat()
        && $user->chatTenantId() === $tenantId;
});

Broadcast::channel('tenant.{tenantId}.presence', function (User $user, string $tenantId): array|false {
    if (! $user->canUseChat() || $user->chatTenantId() !== $tenantId) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'role' => $user->roleLabel(),
    ];
});

Broadcast::channel('chat.conversation.{conversationId}', function (User $user, string $conversationId): bool {
    $conversation = ChatConversation::query()->find($conversationId);

    if (! $conversation) {
        return false;
    }

    return app(ChatService::class)->userCanAccess($user, $conversation);
});
