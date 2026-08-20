<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $items = Notification::query()
            ->forUser($user)
            ->latest('created_at')
            ->limit(20)
            ->get()
            ->map(fn (Notification $notification) => $this->transform($notification))
            ->values();

        return response()->json([
            'data' => $items,
            'unread_count' => $this->notifications->unreadCountFor($user),
        ]);
    }

    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        $notification = Notification::query()
            ->forUser($user)
            ->findOrFail($id);

        if (! $notification->is_read) {
            $notification->update(['is_read' => true]);
        }

        return response()->json([
            'data' => $this->transform($notification->fresh()),
            'unread_count' => $this->notifications->unreadCountFor($user),
        ]);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        Notification::query()
            ->forUser($user)
            ->unread()
            ->update(['is_read' => true]);

        return response()->json([
            'unread_count' => 0,
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user !== null, 401);

        return response()->json([
            'unread_count' => $this->notifications->unreadCountFor($user),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Notification $notification): array
    {
        return [
            'id' => $notification->id,
            'type' => $notification->type,
            'title' => $notification->title,
            'message' => $notification->message,
            'action_url' => $notification->action_url,
            'is_read' => (bool) $notification->is_read,
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
