<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountStatusController extends Controller
{
    public function deactivated(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user?->is_active) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Errors/AccountDeactivated');
    }

    public function locked(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user?->isLocked()) {
            return redirect()->route('dashboard');
        }

        $until = $request->integer('until') ?: $user->locked_until?->timestamp;

        return Inertia::render('Errors/AccountLocked', [
            'lockedUntil' => (int) $until,
        ]);
    }
}
