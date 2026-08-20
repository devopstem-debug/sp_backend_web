<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckUserActive
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($request->routeIs('account.deactivated', 'account.locked', 'logout')) {
            return $next($request);
        }

        if (! $user->is_active) {
            return redirect()->route('account.deactivated');
        }

        if ($user->isLocked()) {
            return redirect()->route('account.locked', [
                'until' => $user->locked_until?->timestamp,
            ]);
        }

        return $next($request);
    }
}
