<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;

class TenantQuotaService
{
    public function storeCount(Tenant $tenant): int
    {
        return $tenant->stores()->count();
    }

    public function userCount(Tenant $tenant): int
    {
        return $tenant->users()->count();
    }

    public function canAddStore(Tenant $tenant): bool
    {
        return $this->storeCount($tenant) < $tenant->max_stores;
    }

    public function canAddUser(Tenant $tenant): bool
    {
        return $this->userCount($tenant) < $tenant->max_users;
    }

    public function productCount(Tenant $tenant): int
    {
        return $tenant->products()->count();
    }

    public function canAddProduct(Tenant $tenant): bool
    {
        return $this->productCount($tenant) < $tenant->max_products;
    }

    public function storeLimitMessage(Tenant $tenant): string
    {
        return sprintf(
            'Достигнут лимит магазинов: %d из %d. Увеличьте max_stores у арендатора.',
            $this->storeCount($tenant),
            $tenant->max_stores,
        );
    }

    public function userLimitMessage(Tenant $tenant): string
    {
        return sprintf(
            'Достигнут лимит пользователей: %d из %d. Увеличьте max_users у арендатора.',
            $this->userCount($tenant),
            $tenant->max_users,
        );
    }

    public function productLimitMessage(Tenant $tenant): string
    {
        return sprintf(
            'Достигнут лимит товаров: %d из %d. Перейдите на другой тариф или увеличьте max_products.',
            $this->productCount($tenant),
            $tenant->max_products,
        );
    }
}
