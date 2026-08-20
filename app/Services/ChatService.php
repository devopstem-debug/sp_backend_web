<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\ChatMessageCreated;
use App\Models\ChatConversation;
use App\Models\ChatMessage;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ChatService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function touchSeen(User $user): void
    {
        $user->forceFill(['last_seen_at' => now()])->saveQuietly();
    }

    public function ensureGeneral(string $tenantId): ChatConversation
    {
        return ChatConversation::query()->firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'type' => ChatConversation::TYPE_GENERAL,
            ],
            [
                'direct_key' => null,
            ],
        );
    }

    public function userCanAccess(User $user, ChatConversation $conversation): bool
    {
        if (! $user->canUseChat() || $user->chatTenantId() !== $conversation->tenant_id) {
            return false;
        }

        if ($conversation->isGeneral()) {
            return true;
        }

        return $conversation->participants()->where('users.id', $user->id)->exists();
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function colleagues(User $actor): Collection
    {
        $tenantId = (string) $actor->chatTenantId();

        return User::query()
            ->where('id', '!=', $actor->id)
            ->where('is_active', true)
            ->where(function ($query) use ($tenantId): void {
                $query
                    ->where('tenant_id', $tenantId)
                    ->orWhereNull('tenant_id');
            })
            ->with('roles:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'tenant_id', 'last_seen_at', 'last_login_at'])
            ->filter(function (User $user) use ($tenantId): bool {
                return $user->tenant_id === $tenantId || $user->isSuperAdmin();
            })
            ->values()
            ->map(fn (User $user) => $this->transformUser($user));
    }

    /**
     * @return Collection<int, array<string, mixed>>
     */
    public function conversationsFor(User $actor): Collection
    {
        $tenantId = (string) $actor->chatTenantId();
        $general = $this->ensureGeneral($tenantId);
        $this->touchParticipant($general, $actor);

        $direct = ChatConversation::query()
            ->where('tenant_id', $tenantId)
            ->where('type', ChatConversation::TYPE_DIRECT)
            ->whereHas('participants', fn ($query) => $query->where('users.id', $actor->id))
            ->with(['participants' => fn ($query) => $query->where('users.id', '!=', $actor->id)])
            ->get();

        return collect([$general, ...$direct])
            ->map(fn (ChatConversation $conversation) => $this->transformConversation($conversation, $actor))
            ->values();
    }

    public function directWith(User $actor, User $peer): ChatConversation
    {
        abort_unless($actor->canUseChat() && $peer->canUseChat(), 403);
        abort_unless($actor->id !== $peer->id, 422, 'Нельзя открыть чат с самим собой.');

        $tenantId = (string) $actor->chatTenantId();
        abort_unless($peer->tenant_id === $tenantId || $peer->isSuperAdmin(), 403);

        $key = ChatConversation::directKey((string) $actor->id, (string) $peer->id);

        $conversation = ChatConversation::query()->firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'direct_key' => $key,
            ],
            [
                'type' => ChatConversation::TYPE_DIRECT,
            ],
        );

        $conversation->participants()->syncWithoutDetaching([
            $actor->id => ['last_read_at' => now()],
            $peer->id => ['last_read_at' => null],
        ]);

        return $conversation->load(['participants']);
    }

    /**
     * @return Collection<int, ChatMessage>
     */
    public function messages(ChatConversation $conversation, int $limit = 100): Collection
    {
        return ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->with(['user:id,name'])
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->sortBy('created_at')
            ->values();
    }

    public function send(User $author, ChatConversation $conversation, string $body): ChatMessage
    {
        abort_unless($this->userCanAccess($author, $conversation), 403);

        $this->touchSeen($author);
        $this->touchParticipant($conversation, $author, markRead: true);

        $message = ChatMessage::query()->create([
            'tenant_id' => $conversation->tenant_id,
            'conversation_id' => $conversation->id,
            'user_id' => $author->id,
            'body' => $body,
        ]);

        $message->load(['user:id,name', 'conversation']);

        try {
            event(new ChatMessageCreated($message));
        } catch (Throwable $exception) {
            report($exception);
        }

        $this->notifyRecipients($author, $conversation, $message);

        return $message;
    }

    public function markRead(User $user, ChatConversation $conversation): int
    {
        abort_unless($this->userCanAccess($user, $conversation), 403);

        $this->touchParticipant($conversation, $user, markRead: true);

        Notification::query()
            ->forUser($user)
            ->unread()
            ->where('type', Notification::TYPE_CHAT)
            ->update(['is_read' => true]);

        return $this->notifications->unreadCountFor($user);
    }

    /**
     * @return array<string, mixed>
     */
    public function transform(ChatMessage $message): array
    {
        return [
            'id' => $message->id,
            'conversation_id' => $message->conversation_id,
            'tenant_id' => $message->tenant_id,
            'user_id' => $message->user_id,
            'user_name' => $message->user?->name ?? 'Пользователь',
            'body' => $message->body,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function transformConversation(ChatConversation $conversation, User $actor): array
    {
        $last = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->with('user:id,name')
            ->latest('created_at')
            ->first();

        $lastReadAt = DB::table('chat_conversation_user')
            ->where('conversation_id', $conversation->id)
            ->where('user_id', $actor->id)
            ->value('last_read_at');

        $unread = ChatMessage::query()
            ->where('conversation_id', $conversation->id)
            ->where('user_id', '!=', $actor->id)
            ->when(
                $lastReadAt,
                fn ($query) => $query->where('created_at', '>', $lastReadAt),
            )
            ->count();

        $peer = $conversation->isDirect()
            ? $conversation->participants->firstWhere('id', '!=', $actor->id)
            : null;

        return [
            'id' => $conversation->id,
            'type' => $conversation->type,
            'title' => $conversation->isGeneral()
                ? 'Общий чат'
                : ($peer?->name ?? 'Личный чат'),
            'peer' => $peer ? $this->transformUser($peer) : null,
            'last_message' => $last ? [
                'body' => $last->body,
                'user_name' => $last->user?->name,
                'created_at' => $last->created_at?->toIso8601String(),
            ] : null,
            'unread_count' => $unread,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function transformUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->roleLabel(),
            'last_seen_at' => $user->last_seen_at?->toIso8601String(),
            'last_login_at' => $user->last_login_at?->toIso8601String(),
            'is_online' => $user->isOnline(),
        ];
    }

    private function touchParticipant(ChatConversation $conversation, User $user, bool $markRead = false): void
    {
        $payload = [];

        if ($markRead) {
            $payload['last_read_at'] = now();
        }

        $exists = $conversation->participants()->where('users.id', $user->id)->exists();

        if (! $exists) {
            $conversation->participants()->attach($user->id, [
                'last_read_at' => $markRead ? now() : null,
            ]);

            return;
        }

        if ($payload !== []) {
            $conversation->participants()->updateExistingPivot($user->id, $payload);
        }
    }

    private function notifyRecipients(User $author, ChatConversation $conversation, ChatMessage $message): void
    {
        $preview = Str::limit($message->body, 120);
        $title = $conversation->isGeneral()
            ? 'Общий чат: '.$author->name
            : 'Чат: '.$author->name;

        $recipientIds = $conversation->isGeneral()
            ? User::query()
                ->where('tenant_id', $conversation->tenant_id)
                ->where('id', '!=', $author->id)
                ->where('is_active', true)
                ->pluck('id')
            : $conversation->participants()
                ->where('users.id', '!=', $author->id)
                ->pluck('users.id');

        foreach ($recipientIds as $recipientId) {
            try {
                $this->notifications->notify(
                    (string) $conversation->tenant_id,
                    Notification::TYPE_CHAT,
                    $title,
                    $preview,
                    (string) $recipientId,
                );
            } catch (Throwable $exception) {
                report($exception);
            }
        }
    }
}
