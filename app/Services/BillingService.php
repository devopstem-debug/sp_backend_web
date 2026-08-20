<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\BankAccount;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Permissions;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BillingService
{
    public function __construct(
        private readonly NotificationService $notifications,
    ) {}

    public function tenantHasActiveSubscription(Tenant $tenant): bool
    {
        return $tenant->hasActiveSubscription();
    }

    /**
     * @return array<string, mixed>
     */
    public function dashboard(Tenant $tenant): array
    {
        $subscription = $tenant->subscriptions()
            ->with('plan')
            ->orderByRaw("case status when 'active' then 0 when 'pending' then 1 when 'past_due' then 2 else 3 end")
            ->orderByDesc('ends_at')
            ->first();

        $pendingPayment = $tenant->payments()
            ->with('subscription.plan')
            ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_AWAITING])
            ->latest()
            ->first();

        return [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'plan' => $tenant->plan,
                'plan_label' => $tenant->planLabel(),
                'subscription_until' => $tenant->subscription_until?->toDateString(),
                'max_stores' => $tenant->max_stores,
                'max_users' => $tenant->max_users,
                'max_products' => $tenant->max_products,
                'has_active_subscription' => $tenant->hasActiveSubscription(),
            ],
            'subscription' => $subscription ? $this->subscriptionPayload($subscription) : null,
            'pending_payment' => $pendingPayment ? $this->paymentPayload($pendingPayment) : null,
            'bank_account' => $this->defaultBankPayload($subscription?->plan, $subscription?->billing_interval),
            'payments' => $tenant->payments()
                ->with('subscription.plan')
                ->latest()
                ->limit(50)
                ->get()
                ->map(fn (Payment $payment) => $this->paymentPayload($payment))
                ->values()
                ->all(),
            'plans' => $this->catalog(activeOnly: true),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function catalog(bool $activeOnly = true): array
    {
        return Plan::query()
            ->when($activeOnly, fn ($query) => $query->where('is_active', true))
            ->orderBy('sort_order')
            ->orderBy('price_monthly')
            ->get()
            ->map(fn (Plan $plan) => $this->planPayload($plan))
            ->values()
            ->all();
    }

    public function subscribe(Tenant $tenant, Plan $plan, string $interval, bool $autoRenew = true): Subscription
    {
        if (! $plan->is_active) {
            throw ValidationException::withMessages([
                'plan_id' => 'Этот тариф недоступен.',
            ]);
        }

        if (! in_array($interval, Subscription::intervals(), true)) {
            throw ValidationException::withMessages([
                'interval' => 'Выберите период оплаты.',
            ]);
        }

        return DB::transaction(function () use ($tenant, $plan, $interval, $autoRenew): Subscription {
            $existing = $tenant->subscriptions()
                ->where('plan_id', $plan->id)
                ->where('billing_interval', $interval)
                ->whereIn('status', [Subscription::STATUS_PENDING, Subscription::STATUS_PAST_DUE])
                ->latest()
                ->first();

            if ($existing) {
                $this->ensurePendingPayment($existing, $plan, $interval);

                return $existing->refresh()->load('plan');
            }

            $tenant->subscriptions()
                ->whereIn('status', [Subscription::STATUS_PENDING, Subscription::STATUS_PAST_DUE])
                ->update(['status' => Subscription::STATUS_CANCELLED]);

            $isFree = $plan->isFree() || (float) $plan->priceForInterval($interval) <= 0;
            $now = now();

            $subscription = Subscription::query()->create([
                'tenant_id' => $tenant->id,
                'plan_id' => $plan->id,
                'status' => $isFree ? Subscription::STATUS_ACTIVE : Subscription::STATUS_PENDING,
                'billing_interval' => $interval,
                'starts_at' => $isFree ? $now : null,
                'ends_at' => $isFree ? $this->periodEnd($now, $interval) : null,
                'auto_renew' => $autoRenew,
            ]);

            $payment = $this->createPayment(
                $tenant,
                $subscription,
                $plan->priceForInterval($interval),
                $isFree ? Payment::STATUS_PAID : Payment::STATUS_PENDING,
            );

            if ($isFree) {
                $payment->update(['paid_at' => $now]);
                $this->applyPlanToTenant($tenant, $plan, $subscription->ends_at);
            }

            return $subscription->load('plan');
        });
    }

    public function markPaidByTenant(Tenant $tenant, Payment $payment, ?string $transactionId = null): Payment
    {
        if ($payment->tenant_id !== $tenant->id) {
            abort(403);
        }

        if (! in_array($payment->status, [Payment::STATUS_PENDING, Payment::STATUS_AWAITING], true)) {
            throw ValidationException::withMessages([
                'payment' => 'Этот платёж уже обработан.',
            ]);
        }

        $payment->update([
            'status' => Payment::STATUS_AWAITING,
            'transaction_id' => $transactionId ?: $payment->transaction_id,
        ]);

        $this->notifySuperAdmins(
            $tenant,
            'Ожидается подтверждение оплаты',
            sprintf(
                'Арендатор «%s» сообщил об оплате тарифа «%s».',
                $tenant->name,
                $payment->subscription?->plan?->name ?? $tenant->planLabel(),
            ),
            route('admin.plans.index'),
        );

        return $payment->refresh();
    }

    public function approvePayment(Payment $payment, User $actor): Payment
    {
        if ($payment->status === Payment::STATUS_PAID) {
            return $payment;
        }

        return DB::transaction(function () use ($payment, $actor): Payment {
            $subscription = $payment->subscription()->with('plan')->firstOrFail();
            $plan = $subscription->plan;
            $tenant = $payment->tenant()->firstOrFail();
            $now = now();

            $tenant->subscriptions()
                ->whereKeyNot($subscription->id)
                ->where('status', Subscription::STATUS_ACTIVE)
                ->update(['status' => Subscription::STATUS_CANCELLED]);

            $startsAt = $subscription->starts_at && $subscription->starts_at->isFuture()
                ? $subscription->starts_at
                : $now;

            $subscription->update([
                'status' => Subscription::STATUS_ACTIVE,
                'starts_at' => $startsAt,
                'ends_at' => $this->periodEnd($startsAt, $subscription->billing_interval),
            ]);

            $payment->update([
                'status' => Payment::STATUS_PAID,
                'paid_at' => $now,
                'confirmed_by' => $actor->id,
            ]);

            $this->applyPlanToTenant($tenant, $plan, $subscription->ends_at);

            $this->notifyTenantManagers(
                $tenant,
                Notification::TYPE_SUCCESS,
                'Оплата подтверждена',
                sprintf('Тариф «%s» активен до %s.', $plan->name, $subscription->ends_at?->timezone('UTC')->format('d.m.Y')),
                route('billing.index'),
            );

            return $payment->refresh()->load('subscription.plan');
        });
    }

    public function rejectPayment(Payment $payment, User $actor): Payment
    {
        $payment->update([
            'status' => Payment::STATUS_REJECTED,
            'confirmed_by' => $actor->id,
        ]);

        $payment->subscription?->update(['status' => Subscription::STATUS_CANCELLED]);

        $tenant = $payment->tenant;

        if ($tenant) {
            $this->notifyTenantManagers(
                $tenant,
                Notification::TYPE_ERROR,
                'Оплата отклонена',
                'Платёж не подтверждён. Проверьте реквизиты и повторите оплату.',
                route('billing.index'),
            );
        }

        return $payment->refresh();
    }

    public function processExpiringAndExpired(): int
    {
        $processed = 0;
        $processed += $this->notifyExpiringSoon();
        $processed += $this->expireOverdue();

        return $processed;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function pendingPayments(): array
    {
        return Payment::query()
            ->with(['tenant:id,name,domain', 'subscription.plan'])
            ->where('status', Payment::STATUS_AWAITING)
            ->latest()
            ->get()
            ->map(fn (Payment $payment) => [
                ...$this->paymentPayload($payment),
                'tenant_name' => $payment->tenant?->name,
                'tenant_domain' => $payment->tenant?->domain,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public function defaultBankPayload(?Plan $plan = null, ?string $interval = null): ?array
    {
        $account = BankAccount::query()->where('is_default', true)->first()
            ?? BankAccount::query()->orderBy('created_at')->first();

        if (! $account) {
            return null;
        }

        return [
            'id' => $account->id,
            'account_name' => $account->account_name,
            'bank_name' => $account->bank_name,
            'iban' => $account->iban,
            'unp' => $account->unp,
            'payment_purpose' => $plan
                ? $account->purposeFor($plan, $interval ?: Subscription::INTERVAL_MONTHLY)
                : $account->payment_purpose,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function planPayload(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'price_monthly' => (float) $plan->price_monthly,
            'price_yearly' => (float) $plan->price_yearly,
            'max_stores' => $plan->max_stores,
            'max_users' => $plan->max_users,
            'max_products' => $plan->max_products,
            'features' => $plan->featureList(),
            'is_active' => (bool) $plan->is_active,
            'is_free' => $plan->isFree(),
            'sort_order' => $plan->sort_order,
        ];
    }

    public function applyPlanToTenant(Tenant $tenant, Plan $plan, ?Carbon $endsAt): void
    {
        $tenant->update([
            'plan' => $plan->slug,
            'max_stores' => $plan->max_stores,
            'max_users' => $plan->max_users,
            'max_products' => $plan->max_products,
            'subscription_until' => $endsAt?->toDateString(),
        ]);
    }

    private function notifyExpiringSoon(): int
    {
        $until = now()->addDays(7);
        $count = 0;

        Subscription::query()
            ->with(['tenant', 'plan'])
            ->where('status', Subscription::STATUS_ACTIVE)
            ->whereNull('reminder_sent_at')
            ->where('ends_at', '>', now())
            ->where('ends_at', '<=', $until)
            ->each(function (Subscription $subscription) use (&$count): void {
                $tenant = $subscription->tenant;

                if (! $tenant) {
                    return;
                }

                $this->notifyTenantManagers(
                    $tenant,
                    Notification::TYPE_WARNING,
                    'Подписка истекает через 7 дней',
                    sprintf(
                        'Тариф «%s» действует до %s. Продлите оплату, чтобы не потерять доступ.',
                        $subscription->plan?->name ?? $tenant->planLabel(),
                        $subscription->ends_at?->timezone('UTC')->format('d.m.Y'),
                    ),
                    route('billing.index'),
                );

                $subscription->update(['reminder_sent_at' => now()]);
                $count++;
            });

        return $count;
    }

    private function expireOverdue(): int
    {
        $count = 0;

        Subscription::query()
            ->with(['tenant', 'plan'])
            ->whereIn('status', [Subscription::STATUS_ACTIVE, Subscription::STATUS_PAST_DUE])
            ->whereNotNull('ends_at')
            ->where('ends_at', '<=', now())
            ->each(function (Subscription $subscription) use (&$count): void {
                $subscription->update(['status' => Subscription::STATUS_EXPIRED]);

                $tenant = $subscription->tenant;

                if ($tenant) {
                    $this->notifyTenantManagers(
                        $tenant,
                        Notification::TYPE_ERROR,
                        'Доступ ограничен: подписка истекла',
                        'Оплатите тариф, чтобы снова пользоваться системой.',
                        route('billing.index'),
                    );
                }

                $count++;
            });

        return $count;
    }

    private function ensurePendingPayment(Subscription $subscription, Plan $plan, string $interval): Payment
    {
        $existing = $subscription->payments()
            ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_AWAITING])
            ->latest()
            ->first();

        if ($existing) {
            return $existing;
        }

        return $this->createPayment(
            $subscription->tenant,
            $subscription,
            $plan->priceForInterval($interval),
            Payment::STATUS_PENDING,
        );
    }

    private function createPayment(Tenant $tenant, Subscription $subscription, string $amount, string $status): Payment
    {
        return Payment::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'currency' => Payment::CURRENCY_BYN,
            'status' => $status,
            'payment_method' => Payment::METHOD_BANK_TRANSFER,
        ]);
    }

    private function periodEnd(Carbon $from, string $interval): Carbon
    {
        return $interval === Subscription::INTERVAL_YEARLY
            ? $from->copy()->addYear()
            : $from->copy()->addMonth();
    }

    /**
     * @return array<string, mixed>
     */
    private function subscriptionPayload(Subscription $subscription): array
    {
        $plan = $subscription->plan;

        return [
            'id' => $subscription->id,
            'status' => $subscription->status,
            'billing_interval' => $subscription->billing_interval,
            'starts_at' => $subscription->starts_at?->toIso8601String(),
            'ends_at' => $subscription->ends_at?->toIso8601String(),
            'auto_renew' => (bool) $subscription->auto_renew,
            'is_active' => $subscription->isActive(),
            'plan' => $plan ? $this->planPayload($plan) : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function paymentPayload(Payment $payment): array
    {
        return [
            'id' => $payment->id,
            'amount' => (float) $payment->amount,
            'currency' => $payment->currency,
            'status' => $payment->status,
            'payment_method' => $payment->payment_method,
            'transaction_id' => $payment->transaction_id,
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'created_at' => $payment->created_at?->toIso8601String(),
            'plan_name' => $payment->subscription?->plan?->name,
        ];
    }

    private function notifyTenantManagers(
        Tenant $tenant,
        string $type,
        string $title,
        string $message,
        ?string $actionUrl = null,
    ): void {
        $users = User::query()
            ->where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->get()
            ->filter(fn (User $user): bool => $user->can(Permissions::MANAGE_BILLING));

        if ($users->isEmpty()) {
            $this->notifications->notify($tenant->id, $type, $title, $message, null, $actionUrl);

            return;
        }

        $users->each(function (User $user) use ($tenant, $type, $title, $message, $actionUrl): void {
            $this->notifications->notify($tenant->id, $type, $title, $message, $user->id, $actionUrl);
        });
    }

    private function notifySuperAdmins(Tenant $tenant, string $title, string $message, ?string $actionUrl = null): void
    {
        /** @var Collection<int, User> $admins */
        $admins = User::query()
            ->role(Permissions::ROLE_SUPER_ADMIN)
            ->where('is_active', true)
            ->get();

        if ($admins->isEmpty()) {
            $this->notifications->notify(
                $tenant->id,
                Notification::TYPE_INFO,
                $title,
                $message,
                null,
                $actionUrl,
            );

            return;
        }

        $admins->each(function (User $admin) use ($tenant, $title, $message, $actionUrl): void {
            $this->notifications->notify(
                $tenant->id,
                Notification::TYPE_INFO,
                $title,
                $message,
                $admin->id,
                $actionUrl,
            );
        });
    }
}
