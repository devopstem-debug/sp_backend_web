<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuthActivityService;
use App\Services\TwoFactorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function __construct(
        private readonly AuthActivityService $authActivity,
    ) {}

    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = Auth::user();

        if ($user && app(TwoFactorService::class)->isEnabled($user)) {
            $remember = $request->boolean('remember');
            Auth::logout();

            $request->session()->put('login.id', $user->id);
            $request->session()->put('login.remember', $remember);
            $request->session()->regenerate();

            return redirect()->route('two-factor.login');
        }

        $request->session()->regenerate();

        if ($user) {
            $user->forceFill([
                'last_login_at' => now(),
            ])->save();

            $this->authActivity->logLogin($request, $user, 'success');
            $this->authActivity->startSession($request, $user);
        }

        return redirect()->route('dashboard');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $this->authActivity->endSession($request);

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
