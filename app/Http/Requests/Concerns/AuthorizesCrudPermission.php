<?php

declare(strict_types=1);

namespace App\Http\Requests\Concerns;

trait AuthorizesCrudPermission
{
    protected function authorizeCrud(string $create, string $edit): bool
    {
        $user = $this->user();

        if ($user === null) {
            return false;
        }

        return $this->isMethod('POST')
            ? $user->can($create)
            : $user->can($edit);
    }

    protected function constrainHeadToOwnScope(): void
    {
        $user = $this->user();

        if (! $user?->restrictsToOwnDepartment()) {
            return;
        }

        $payload = [];

        if ($user->ownedDepartmentId()) {
            $payload['department_id'] = $user->ownedDepartmentId();
        }

        if ($user->ownedStoreId()) {
            $payload['store_id'] = $user->ownedStoreId();
        }

        if ($payload !== []) {
            $this->merge($payload);
        }
    }

    protected function headOwnsDepartment(?string $departmentId): bool
    {
        $user = $this->user();

        if (! $user?->restrictsToOwnDepartment()) {
            return true;
        }

        $owned = $user->ownedDepartmentId();

        return $owned !== null && $departmentId === $owned;
    }
}
