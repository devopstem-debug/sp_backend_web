<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\BillingService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscriptionActive
{
    public function __construct(
        private readonly BillingService $billing,
    ) {}

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->isSuperAdmin()) {
            return $next($request);
        }

        if ($request->routeIs(
            'billing.*',
            'plans.index',
            'logout',
            'account.*',
        )) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if (! $tenant) {
            abort(403, 'Tenant is not assigned to your account.');
        }

        if ($this->billing->tenantHasActiveSubscription($tenant)) {
            return $next($request);
        }

        return redirect()
            ->route('billing.index')
            ->with('error', 'Подписка истекла или не оформлена. Оплатите тариф, чтобы продолжить работу.');
    }
}
