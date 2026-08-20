<?php

declare(strict_types=1);

namespace App\Services;

use App\Events\NotificationCreated;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * @param  array{action_url?: string|null}  $extra
     */
    public function notify(
        string $tenantId,
        string $type,
        string $title,
        string $message,
        ?string $userId = null,
        ?string $actionUrl = null,
    ): Notification {
        $notification = Notification::query()->create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'action_url' => $actionUrl,
            'is_read' => false,
        ]);

        try {
            event(new NotificationCreated($notification));
        } catch (\Throwable $exception) {
            report($exception);
        }

        return $notification;
    }

    public function unreadCountFor(User $user): int
    {
        return Notification::query()
            ->forUser($user)
            ->unread()
            ->count();
    }
}
