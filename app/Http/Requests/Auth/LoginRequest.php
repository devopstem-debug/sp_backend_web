<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Models\UserLoginLog;
use App\Services\AuthActivityService;
use App\Services\NotificationService;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    public const MAX_ATTEMPTS = 3;

    public const LOCKOUT_SECONDS = 900;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $email = $this->string('email')->toString();
        $matchedUser = User::query()->where('email', $email)->first();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            app(AuthActivityService::class)->logLogin($this, $matchedUser, 'failed');

            if ($matchedUser) {
                $failedToday = UserLoginLog::query()
                    ->where('user_id', $matchedUser->id)
                    ->where('status', 'failed')
                    ->where('created_at', '>=', now()->subDay())
                    ->count();

                if ($failedToday === 5 && $matchedUser->tenant_id) {
                    app(NotificationService::class)->notify(
                        $matchedUser->tenant_id,
                        'warning',
                        'Подозрительный вход',
                        '5 неудачных попыток входа',
                        $matchedUser->id,
                    );
                }
            }

            RateLimiter::hit($this->throttleKey(), self::LOCKOUT_SECONDS);

            $attempts = RateLimiter::attempts($this->throttleKey());
            $attemptsLeft = self::MAX_ATTEMPTS - $attempts;

            if ($attemptsLeft <= 0) {
                event(new Lockout($this));
                $this->activateLockout(self::LOCKOUT_SECONDS);

                throw ValidationException::withMessages([
                    'email' => 'Слишком много неудачных попыток. Вход заблокирован на 15 минут.',
                    'locked' => '1',
                    'lockout_seconds' => (string) self::LOCKOUT_SECONDS,
                ]);
            }

            throw ValidationException::withMessages([
                'email' => sprintf(
                    'Неверный email или пароль. Осталось попыток: %d.',
                    max(0, $attemptsLeft)
                ),
                'attempts_left' => (string) max(0, $attemptsLeft),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
        $this->session()->forget('login_lockout_until');
    }

    /**
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), self::MAX_ATTEMPTS)) {
            return;
        }

        event(new Lockout($this));

        $seconds = max(1, RateLimiter::availableIn($this->throttleKey()));
        $this->activateLockout($seconds);

        throw ValidationException::withMessages([
            'email' => sprintf(
                'Слишком много неудачных попыток. Повторите через %d мин.',
                max(1, (int) ceil($seconds / 60))
            ),
            'locked' => '1',
            'lockout_seconds' => (string) $seconds,
        ]);
    }

    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')->toString()).'|'.$this->ip());
    }

    private function activateLockout(int $seconds): void
    {
        $this->session()->put(
            'login_lockout_until',
            now()->addSeconds($seconds)->getTimestamp(),
        );
    }
}
