<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Support\Permissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        $this->renameLegacyRoles();

        $permissions = [];
        foreach (Permissions::all() as $name) {
            $permissions[$name] = Permission::query()->firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
            );
        }

        $registrar->forgetCachedPermissions();

        $superAdmin = Role::findOrCreate(Permissions::ROLE_SUPER_ADMIN, 'web');
        $deputy = Role::findOrCreate(Permissions::ROLE_DEPUTY, 'web');
        $head = Role::findOrCreate(Permissions::ROLE_HEAD, 'web');
        $programmer = Role::findOrCreate(Permissions::ROLE_PROGRAMMER, 'web');
        $merchandiser = Role::findOrCreate(Permissions::ROLE_MERCHANDISER, 'web');

        $superAdmin->syncPermissions(array_values($permissions));
        $deputy->syncPermissions($this->models(Permissions::forDeputy(), $permissions));
        $head->syncPermissions($this->models(Permissions::forHead(), $permissions));
        $programmer->syncPermissions($this->models(Permissions::forProgrammer(), $permissions));
        $merchandiser->syncPermissions($this->models(Permissions::forMerchandiser(), $permissions));

        Permission::query()
            ->where('guard_name', 'web')
            ->whereNotIn('name', Permissions::all())
            ->delete();

        Role::query()
            ->where('guard_name', 'web')
            ->whereNotIn('name', Permissions::roles())
            ->delete();

        $registrar->forgetCachedPermissions();
    }

    /**
     * @param  list<string>  $names
     * @param  array<string, Permission>  $permissions
     * @return list<Permission>
     */
    private function models(array $names, array $permissions): array
    {
        return array_values(array_map(
            static fn (string $name): Permission => $permissions[$name],
            $names,
        ));
    }

    private function renameLegacyRoles(): void
    {
        $map = [
            'Network Manager' => Permissions::ROLE_DEPUTY,
            'Store Manager' => Permissions::ROLE_HEAD,
            'Merchandiser' => Permissions::ROLE_MERCHANDISER,
        ];

        foreach ($map as $legacy => $current) {
            $role = Role::query()
                ->where('guard_name', 'web')
                ->where('name', $legacy)
                ->first();

            if (! $role) {
                continue;
            }

            $existing = Role::query()
                ->where('guard_name', 'web')
                ->where('name', $current)
                ->first();

            if ($existing && $existing->id !== $role->id) {
                DB::table('model_has_roles')
                    ->where('role_id', $role->id)
                    ->update(['role_id' => $existing->id]);

                $role->delete();

                continue;
            }

            $role->name = $current;
            $role->save();
        }
    }
}
