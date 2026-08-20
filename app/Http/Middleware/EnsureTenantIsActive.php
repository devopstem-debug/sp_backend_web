<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantIsActive
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

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user->tenant_id === null) {
            abort(403, 'Tenant is not assigned to your account.');
        }

        $tenant = $user->tenant;

        if (! $tenant || ! $tenant->is_active) {
            abort(403, 'Your organization is inactive.');
        }

        return $next($request);
    }
}
