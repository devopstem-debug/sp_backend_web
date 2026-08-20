<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use App\Models\UserLoginLog;
use App\Models\UserSession;
use Illuminate\Http\Request;

class AuthActivityService
{
    public function logLogin(Request $request, ?User $user, string $status): void
    {
        UserLoginLog::query()->create([
            'user_id' => $user?->id,
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'status' => $status,
            'created_at' => now(),
        ]);
    }

    public function startSession(Request $request, User $user): void
    {
        $sessionId = $request->session()->getId();

        UserSession::query()->updateOrCreate(
            ['session_id' => $sessionId],
            [
                'user_id' => $user->id,
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'last_activity_at' => now(),
                'created_at' => now(),
            ],
        );
    }

    public function endSession(Request $request): void
    {
        $sessionId = $request->session()->getId();

        UserSession::query()
            ->where('session_id', $sessionId)
            ->delete();
    }

    public function touchSession(Request $request): void
    {
        $sessionId = $request->session()->getId();

        UserSession::query()
            ->where('session_id', $sessionId)
            ->update([
                'last_activity_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => (string) $request->userAgent(),
            ]);
    }
}
