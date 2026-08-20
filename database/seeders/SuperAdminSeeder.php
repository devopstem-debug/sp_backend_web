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
        $email = (string) env('SUPER_ADMIN_EMAIL', '');
        $password = (string) env('SUPER_ADMIN_PASSWORD', '');
        $name = (string) env('SUPER_ADMIN_NAME', 'Super Admin');

        if ($email === '' || $password === '') {
            $this->command?->warn(
                'SUPER_ADMIN_EMAIL и SUPER_ADMIN_PASSWORD не заданы в .env — администратор не создан.',
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
    }
}
