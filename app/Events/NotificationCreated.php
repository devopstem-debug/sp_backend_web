<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Notification;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NotificationCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Notification $notification,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new Channel('tenant.'.$this->notification->tenant_id),
        ];

        if ($this->notification->user_id) {
            $channels[] = new PrivateChannel('user.'.$this->notification->user_id);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'notification.created';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->notification->id,
            'tenant_id' => $this->notification->tenant_id,
            'user_id' => $this->notification->user_id,
            'type' => $this->notification->type,
            'title' => $this->notification->title,
            'message' => $this->notification->message,
            'action_url' => $this->notification->action_url,
            'is_read' => (bool) $this->notification->is_read,
            'created_at' => $this->notification->created_at?->toIso8601String(),
        ];
    }
}
