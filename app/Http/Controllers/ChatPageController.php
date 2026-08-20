<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\ChatService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChatPageController extends Controller
{
    public function __construct(
        private readonly ChatService $chat,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user?->canUseChat(), 403);

        $this->chat->touchSeen($user);

        return Inertia::render('Chat/Index', [
            'tenantId' => $user->chatTenantId(),
        ]);
    }
}
