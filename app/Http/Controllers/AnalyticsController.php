<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use App\Support\Permissions;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly AnalyticsService $analytics,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_ANALYTICS),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('Analytics/Index', $this->analytics->build());
    }
}
