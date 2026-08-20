<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Plan;
use App\Models\Tenant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PlanService
{
    /**
     * @return Collection<int, Plan>
     */
    public function all(): Collection
    {
        return Plan::query()
            ->withCount('subscriptions')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data): Plan
    {
        $data['slug'] = $this->uniqueSlug((string) ($data['slug'] ?? $data['name']));

        return Plan::query()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Plan $plan, array $data): Plan
    {
        if (isset($data['slug'])) {
            $data['slug'] = $this->uniqueSlug((string) $data['slug'], $plan->id);
        }

        $plan->update($data);

        return $plan->refresh();
    }

    public function delete(Plan $plan): void
    {
        if ($plan->subscriptions()->exists()) {
            $plan->update(['is_active' => false]);
            $plan->delete();

            return;
        }

        $plan->forceDelete();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function createBankAccount(array $data): BankAccount
    {
        return DB::transaction(function () use ($data): BankAccount {
            $account = BankAccount::query()->create($data);

            if ($account->is_default) {
                $this->makeDefault($account);
            }

            return $account->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateBankAccount(BankAccount $account, array $data): BankAccount
    {
        return DB::transaction(function () use ($account, $data): BankAccount {
            $account->update($data);

            if ($account->is_default) {
                $this->makeDefault($account);
            }

            return $account->refresh();
        });
    }

    public function makeDefault(BankAccount $account): void
    {
        BankAccount::query()
            ->whereKeyNot($account->id)
            ->update(['is_default' => false]);

        $account->update(['is_default' => true]);
    }

    public function deleteBankAccount(BankAccount $account): void
    {
        $wasDefault = $account->is_default;
        $account->delete();

        if ($wasDefault) {
            $next = BankAccount::query()->orderBy('created_at')->first();
            $next?->update(['is_default' => true]);
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function bankAccountsPayload(): array
    {
        return BankAccount::query()
            ->orderByDesc('is_default')
            ->orderBy('account_name')
            ->get()
            ->map(fn (BankAccount $account): array => [
                'id' => $account->id,
                'account_name' => $account->account_name,
                'bank_name' => $account->bank_name,
                'iban' => $account->iban,
                'unp' => $account->unp,
                'payment_purpose' => $account->payment_purpose,
                'is_default' => (bool) $account->is_default,
            ])
            ->all();
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    public function optionsForTenants(): array
    {
        $options = Plan::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Plan $plan) => [
                'value' => $plan->slug,
                'label' => $plan->name,
            ])
            ->values()
            ->all();

        return $options !== []
            ? $options
            : collect(Tenant::planLabels())
                ->map(fn (string $label, string $value) => ['value' => $value, 'label' => $label])
                ->values()
                ->all();
    }

    private function uniqueSlug(string $source, ?string $ignoreId = null): string
    {
        $base = Str::slug($source) ?: 'plan';
        $slug = $base;
        $i = 1;

        while (
            Plan::query()
                ->where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $base.'-'.$i;
            $i++;
        }

        return $slug;
    }
}
