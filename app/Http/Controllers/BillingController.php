<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmPaymentRequest;
use App\Http\Requests\SubscribeRequest;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Tenant;
use App\Services\BillingService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly BillingService $billing,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('auth'),
        ];
    }

    public function index(): Response
    {
        $tenant = $this->requireTenant();
        $user = Auth::user();
        $canManage = (bool) $user?->can(Permissions::MANAGE_BILLING);

        return Inertia::render('Billing/Index', [
            ...$this->billing->dashboard($tenant),
            'canManage' => $canManage,
        ]);
    }

    public function subscribe(SubscribeRequest $request): RedirectResponse
    {
        $tenant = $this->requireTenant();
        $plan = Plan::query()->findOrFail($request->string('plan_id')->toString());

        $subscription = $this->billing->subscribe(
            $tenant,
            $plan,
            $request->string('interval')->toString(),
            $request->boolean('auto_renew', true),
        );

        $message = $subscription->isActive()
            ? 'Тариф активирован.'
            : 'Тариф выбран. Переведите оплату по реквизитам и нажмите «Я оплатил».';

        return redirect()
            ->route('billing.index')
            ->with('success', $message);
    }

    public function confirmPayment(ConfirmPaymentRequest $request): RedirectResponse
    {
        $tenant = $this->requireTenant();

        $paymentId = $request->input('payment_id');
        $payment = $paymentId
            ? Payment::query()->where('tenant_id', $tenant->id)->findOrFail($paymentId)
            : $tenant->payments()
                ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_AWAITING])
                ->latest()
                ->first();

        if (! $payment) {
            return back()->with('error', 'Нет платежа для подтверждения.');
        }

        $this->billing->markPaidByTenant(
            $tenant,
            $payment,
            $request->input('transaction_id'),
        );

        return back()->with('success', 'Заявка отправлена. Мы подтвердим оплату после проверки.');
    }

    public function showBankDetails(): Response
    {
        $tenant = $this->requireTenant();
        $user = Auth::user();

        return Inertia::render('Billing/Index', [
            ...$this->billing->dashboard($tenant),
            'canManage' => (bool) $user?->can(Permissions::MANAGE_BILLING),
            'focus' => 'bank',
        ]);
    }

    private function requireTenant(): Tenant
    {
        $user = Auth::user();
        $tenant = $user?->tenant;

        abort_unless($tenant !== null, 403, 'Оплата доступна только для арендатора.');

        return $tenant;
    }
}
