<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\Crypt;
use PragmaRX\Google2FA\Google2FA;
use RuntimeException;

final class TwoFactorService
{
    public function __construct(
        private readonly Google2FA $google2fa = new Google2FA,
    ) {}

    public function isEnabled(User $user): bool
    {
        return $user->two_factor_confirmed_at !== null
            && filled($user->two_factor_secret);
    }

    /**
     * @return array{secret: string, qr_svg: string, otpauth_url: string}
     */
    public function beginSetup(User $user): array
    {
        $secret = $this->google2fa->generateSecretKey(32);
        $user->forceFill([
            'two_factor_secret' => Crypt::encryptString($secret),
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ])->save();

        $otpauthUrl = $this->google2fa->getQRCodeUrl(
            (string) config('app.name', 'Smart Planogram'),
            (string) $user->email,
            $secret,
        );

        return [
            'secret' => $secret,
            'qr_svg' => $this->qrSvg($otpauthUrl),
            'otpauth_url' => $otpauthUrl,
        ];
    }

    /**
     * @return list<string>
     */
    public function confirmSetup(User $user, string $code): array
    {
        if (! $this->verify($user, $code, allowUnconfirmed: true)) {
            throw new RuntimeException('Неверный код подтверждения.');
        }

        $recoveryCodes = $this->generateRecoveryCodes();

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => Crypt::encryptString(json_encode($recoveryCodes, JSON_THROW_ON_ERROR)),
        ])->save();

        return $recoveryCodes;
    }

    public function disable(User $user): void
    {
        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();
    }

    public function verify(User $user, string $code, bool $allowUnconfirmed = false): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';

        if ($code === '' || ! filled($user->two_factor_secret)) {
            return false;
        }

        if (! $allowUnconfirmed && $user->two_factor_confirmed_at === null) {
            return false;
        }

        try {
            $secret = Crypt::decryptString((string) $user->two_factor_secret);
        } catch (\Throwable) {
            return false;
        }

        if ($this->google2fa->verifyKey($secret, $code, 1)) {
            return true;
        }

        return $this->consumeRecoveryCode($user, $code);
    }

    private function consumeRecoveryCode(User $user, string $code): bool
    {
        if (! filled($user->two_factor_recovery_codes)) {
            return false;
        }

        try {
            /** @var list<string> $codes */
            $codes = json_decode(
                Crypt::decryptString((string) $user->two_factor_recovery_codes),
                true,
                512,
                JSON_THROW_ON_ERROR,
            );
        } catch (\Throwable) {
            return false;
        }

        $matchIndex = null;

        foreach ($codes as $index => $recoveryCode) {
            if (hash_equals((string) $recoveryCode, $code)) {
                $matchIndex = $index;
                break;
            }
        }

        if ($matchIndex === null) {
            return false;
        }

        unset($codes[$matchIndex]);

        $user->forceFill([
            'two_factor_recovery_codes' => Crypt::encryptString(
                json_encode(array_values($codes), JSON_THROW_ON_ERROR),
            ),
        ])->save();

        return true;
    }

    /**
     * @return list<string>
     */
    private function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $codes[] = strtoupper(bin2hex(random_bytes(4)).'-'.bin2hex(random_bytes(4)));
        }

        return $codes;
    }

    private function qrSvg(string $otpauthUrl): string
    {
        $renderer = new ImageRenderer(
            new RendererStyle(220),
            new SvgImageBackEnd,
        );

        return (new Writer($renderer))->writeString($otpauthUrl);
    }
}
