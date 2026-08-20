<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\BillingService;
use App\Support\Permissions;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class PricingController extends Controller
{
    public function __construct(
        private readonly BillingService $billing,
    ) {}

    public function index(): Response
    {
        $user = Auth::user();

        return Inertia::render('Plans/Index', [
            'plans' => $this->billing->catalog(activeOnly: true),
            'canSubscribe' => (bool) ($user?->tenant_id && $user->can(Permissions::MANAGE_BILLING)),
            'currentPlanSlug' => $user?->tenant?->plan,
            'authenticated' => $user !== null,
        ]);
    }
}
