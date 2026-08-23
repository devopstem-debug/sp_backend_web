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

    /**
     * Private-label SKUs only (global catalog is shared and unlimited).
     */
    public function productCount(Tenant $tenant): int
    {
        return $tenant->products()->count();
    }

    public function canAddProduct(Tenant $tenant): bool
    {
        // Shared product catalog — no per-tenant SKU quota.
        return true;
    }

    public function storeLimitMessage(Tenant $tenant): string
    {
        return sprintf(
            'Лимит магазинов исчерпан (%d из %d). Чтобы добавить новый магазин, смените тариф или обратитесь к администратору.',
            $this->storeCount($tenant),
            $tenant->max_stores,
        );
    }

    public function userLimitMessage(Tenant $tenant): string
    {
        return sprintf(
            'Лимит пользователей исчерпан (%d из %d). Чтобы добавить сотрудника, смените тариф или обратитесь к администратору.',
            $this->userCount($tenant),
            $tenant->max_users,
        );
    }

    public function productLimitMessage(Tenant $tenant): string
    {
        return 'Лимит товаров для арендатора не применяется: каталог общий.';
    }

    /**
     * @return array{
     *     used: int,
     *     max: int,
     *     remaining: int,
     *     can_add: bool,
     *     message: string|null
     * }
     */
    public function userQuotaSummary(Tenant $tenant): array
    {
        $used = $this->userCount($tenant);
        $max = (int) $tenant->max_users;
        $canAdd = $used < $max;

        return [
            'used' => $used,
            'max' => $max,
            'remaining' => max(0, $max - $used),
            'can_add' => $canAdd,
            'message' => $canAdd ? null : $this->userLimitMessage($tenant),
        ];
    }

    /**
     * @return array{
     *     used: int,
     *     max: int,
     *     remaining: int,
     *     can_add: bool,
     *     message: string|null
     * }
     */
    public function storeQuotaSummary(Tenant $tenant): array
    {
        $used = $this->storeCount($tenant);
        $max = (int) $tenant->max_stores;
        $canAdd = $used < $max;

        return [
            'used' => $used,
            'max' => $max,
            'remaining' => max(0, $max - $used),
            'can_add' => $canAdd,
            'message' => $canAdd ? null : $this->storeLimitMessage($tenant),
        ];
    }
}
