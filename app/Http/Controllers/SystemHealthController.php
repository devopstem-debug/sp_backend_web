<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\SystemMetricsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class SystemHealthController extends Controller
{
    public function __construct(
        private readonly SystemMetricsService $metrics,
    ) {}

    public function index(): Response
    {
        $this->ensureSuperAdmin();

        return Inertia::render('SystemHealth/Index', [
            'metrics' => $this->metrics->snapshot(),
            'pollIntervalMs' => 3000,
        ]);
    }

    public function metrics(): JsonResponse
    {
        $this->ensureSuperAdmin();

        return response()->json($this->metrics->snapshot());
    }

    private function ensureSuperAdmin(): void
    {
        abort_unless(
            Auth::user()?->isSuperAdmin() === true,
            403,
            'Доступ только для Super Admin.',
        );
    }
}
