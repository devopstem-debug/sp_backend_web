<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\BankAccountRequest;
use App\Http\Requests\PlanRequest;
use App\Models\BankAccount;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PlanService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class PlanController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly PlanService $plans,
        private readonly BillingService $billing,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::MANAGE_PLANS),
        ];
    }

    public function index(): Response
    {
        return Inertia::render('Admin/Plans/Index', [
            'plans' => $this->plans->all()->map(fn (Plan $plan) => [
                ...$this->billing->planPayload($plan),
                'subscriptions_count' => (int) ($plan->subscriptions_count ?? 0),
            ])->values()->all(),
            'bankAccounts' => $this->plans->bankAccountsPayload(),
            'pendingPayments' => $this->billing->pendingPayments(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Admin/Plans/Create');
    }

    public function store(PlanRequest $request): RedirectResponse
    {
        $this->plans->create($request->planAttributes());

        return redirect()
            ->route('admin.plans.index')
            ->with('success', 'Тариф создан.');
    }

    public function edit(string $plan): Response
    {
        $model = Plan::query()->findOrFail($plan);

        return Inertia::render('Admin/Plans/Edit', [
            'plan' => $this->billing->planPayload($model),
        ]);
    }

    public function update(PlanRequest $request, string $plan): RedirectResponse
    {
        $model = Plan::query()->findOrFail($plan);
        $this->plans->update($model, $request->planAttributes());

        return redirect()
            ->route('admin.plans.index')
            ->with('success', 'Тариф обновлён.');
    }

    public function destroy(string $plan): RedirectResponse
    {
        $model = Plan::query()->findOrFail($plan);
        $this->plans->delete($model);

        return redirect()
            ->route('admin.plans.index')
            ->with('success', 'Тариф удалён.');
    }

    public function storeBankAccount(BankAccountRequest $request): RedirectResponse
    {
        $this->plans->createBankAccount($request->accountAttributes());

        return back()->with('success', 'Реквизиты сохранены.');
    }

    public function updateBankAccount(BankAccountRequest $request, string $bankAccount): RedirectResponse
    {
        $account = BankAccount::query()->findOrFail($bankAccount);
        $this->plans->updateBankAccount($account, $request->accountAttributes());

        return back()->with('success', 'Реквизиты обновлены.');
    }

    public function destroyBankAccount(string $bankAccount): RedirectResponse
    {
        $account = BankAccount::query()->findOrFail($bankAccount);
        $this->plans->deleteBankAccount($account);

        return back()->with('success', 'Реквизиты удалены.');
    }

    public function approvePayment(string $payment): RedirectResponse
    {
        $actor = request()->user();
        abort_unless($actor instanceof User, 403);

        $model = Payment::query()->findOrFail($payment);
        $this->billing->approvePayment($model, $actor);

        return back()->with('success', 'Оплата подтверждена, подписка активирована.');
    }

    public function rejectPayment(string $payment): RedirectResponse
    {
        $actor = request()->user();
        abort_unless($actor instanceof User, 403);

        $model = Payment::query()->findOrFail($payment);
        $this->billing->rejectPayment($model, $actor);

        return back()->with('success', 'Оплата отклонена.');
    }
}
