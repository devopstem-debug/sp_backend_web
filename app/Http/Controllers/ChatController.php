<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreChatMessageRequest;
use App\Http\Requests\StoreDirectChatRequest;
use App\Models\ChatConversation;
use App\Models\User;
use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function __construct(
        private readonly ChatService $chat,
    ) {}

    public function conversations(Request $request): JsonResponse
    {
        $user = $this->chatUser($request);

        return response()->json([
            'data' => $this->chat->conversationsFor($user)->values(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $user = $this->chatUser($request);

        return response()->json([
            'data' => $this->chat->colleagues($user)->values(),
        ]);
    }

    public function heartbeat(Request $request): JsonResponse
    {
        $user = $this->chatUser($request);
        $this->chat->touchSeen($user);

        return response()->json([
            'last_seen_at' => $user->fresh()?->last_seen_at?->toIso8601String(),
        ]);
    }

    public function storeDirect(StoreDirectChatRequest $request): JsonResponse
    {
        $user = $this->chatUser($request);
        $peer = User::query()->findOrFail((string) $request->validated('user_id'));
        $conversation = $this->chat->directWith($user, $peer);

        return response()->json([
            'data' => $this->chat->transformConversation($conversation, $user),
        ], 201);
    }

    public function messages(Request $request, string $conversationId): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->conversationFor($user, $conversationId);

        return response()->json([
            'data' => $this->chat->messages($conversation)->map(
                fn ($message) => $this->chat->transform($message),
            )->values(),
        ]);
    }

    public function store(StoreChatMessageRequest $request, string $conversationId): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->conversationFor($user, $conversationId);
        $message = $this->chat->send($user, $conversation, (string) $request->validated('body'));

        return response()->json([
            'data' => $this->chat->transform($message),
        ], 201);
    }

    public function markRead(Request $request, string $conversationId): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->conversationFor($user, $conversationId);

        return response()->json([
            'unread_count' => $this->chat->markRead($user, $conversation),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->chat->ensureGeneral((string) $user->chatTenantId());

        return response()->json([
            'data' => $this->chat->messages($conversation)->map(
                fn ($message) => $this->chat->transform($message),
            )->values(),
            'conversation_id' => $conversation->id,
        ]);
    }

    public function storeGeneral(StoreChatMessageRequest $request): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->chat->ensureGeneral((string) $user->chatTenantId());
        $message = $this->chat->send($user, $conversation, (string) $request->validated('body'));

        return response()->json([
            'data' => $this->chat->transform($message),
        ], 201);
    }

    public function markGeneralRead(Request $request): JsonResponse
    {
        $user = $this->chatUser($request);
        $conversation = $this->chat->ensureGeneral((string) $user->chatTenantId());

        return response()->json([
            'unread_count' => $this->chat->markRead($user, $conversation),
        ]);
    }

    private function chatUser(Request $request): User
    {
        $user = $request->user();
        abort_unless($user?->canUseChat(), 403, 'Нет доступа к чату.');

        return $user;
    }

    private function conversationFor(User $user, string $conversationId): ChatConversation
    {
        $conversation = ChatConversation::query()->findOrFail($conversationId);
        abort_unless($this->chat->userCanAccess($user, $conversation), 403, 'Нет доступа к этому чату.');

        return $conversation;
    }
}
