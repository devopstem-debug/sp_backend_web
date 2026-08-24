<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use App\Support\Permissions;
use Illuminate\Database\Seeder;

class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        // Use config() — env() is empty when config is cached (typical on VPS).
        $email = trim((string) config('services.super_admin.email', ''));
        $password = (string) config('services.super_admin.password', '');
        $name = trim((string) config('services.super_admin.name', 'Super Admin'));

        if ($email === '' || $password === '') {
            $this->command?->warn(
                'SUPER_ADMIN_EMAIL и SUPER_ADMIN_PASSWORD не заданы в .env — администратор не создан.',
            );
            $this->command?->warn(
                'Если переменные есть в .env: выполните php artisan config:clear && php artisan config:cache, затем снова db:seed.',
            );

            return;
        }

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name !== '' ? $name : 'Super Admin',
                'tenant_id' => null,
                'department_id' => null,
                'email_verified_at' => now(),
                'password' => $password,
                'timezone' => 'Europe/Minsk',
                'locale' => 'ru',
                'is_active' => true,
            ],
        );

        $user->syncRoles([Permissions::ROLE_SUPER_ADMIN]);

        $this->command?->info("Super Admin создан/обновлён: {$email}");
    }
}
