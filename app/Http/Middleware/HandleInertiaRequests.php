<?php

namespace App\Http\Middleware;

use App\Models\Notification;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
                'roles' => $request->user()?->getRoleNames()->values()->all() ?? [],
                'permissions' => $request->user()?->getAllPermissions()->pluck('name')->values()->all() ?? [],
                'is_super_admin' => $request->user()?->isSuperAdmin() === true,
            ],
            'unread_count' => function () use ($request): int {
                $user = $request->user();

                if (! $user) {
                    return 0;
                }

                return Notification::query()
                    ->forUser($user)
                    ->unread()
                    ->count();
            },
            'can_chat' => function () use ($request): bool {
                $user = $request->user();

                if (! $user) {
                    return false;
                }

                if ($user->last_seen_at === null || $user->last_seen_at->lt(now()->subMinute())) {
                    $user->forceFill(['last_seen_at' => now()])->saveQuietly();
                }

                return $user->canUseChat();
            },
            'chat_tenant_id' => function () use ($request): ?string {
                return $request->user()?->chatTenantId();
            },
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'two_factor_setup' => fn () => $request->session()->get('two_factor_setup'),
                'two_factor_recovery_codes' => fn () => $request->session()->get('two_factor_recovery_codes'),
            ],
            'loginLockoutUntil' => function () use ($request): ?int {
                $until = $request->session()->get('login_lockout_until');

                if (! is_numeric($until)) {
                    return null;
                }

                $until = (int) $until;

                if ($until <= time()) {
                    $request->session()->forget('login_lockout_until');

                    return null;
                }

                return $until;
            },
        ];
    }
}
