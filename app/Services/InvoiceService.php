<?php

declare(strict_types=1);

namespace App\Services;

use App\Mail\InvoiceIssuedMail;
use App\Models\BankAccount;
use App\Models\Invoice;
use App\Models\Notification;
use App\Models\Payment;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Support\Permissions;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceService
{
    public function __construct(
        private readonly BillingService $billing,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * @return LengthAwarePaginator<int, Invoice>
     */
    public function paginate(?string $status, ?string $search): LengthAwarePaginator
    {
        return Invoice::query()
            ->with(['tenant:id,name,domain', 'subscription.plan'])
            ->when(
                $status && in_array($status, Invoice::statuses(), true),
                fn ($query) => $query->where('status', $status),
            )
            ->when($search, function ($query) use ($search): void {
                $term = '%'.$search.'%';
                $query->where(function ($builder) use ($term): void {
                    $builder
                        ->where('invoice_number', 'ilike', $term)
                        ->orWhereHas('tenant', function ($tenantQuery) use ($term): void {
                            $tenantQuery
                                ->where('name', 'ilike', $term)
                                ->orWhere('domain', 'ilike', $term);
                        });
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString();
    }

    /**
     * @param  array{tenant_id: string, plan_id: string, period_start: string, amount?: float|string|null}  $data
     */
    public function create(array $data): Invoice
    {
        $tenant = Tenant::query()->findOrFail($data['tenant_id']);
        $plan = Plan::query()->findOrFail($data['plan_id']);
        $periodStart = Carbon::parse($data['period_start'])->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();
        $amount = isset($data['amount']) && $data['amount'] !== null && $data['amount'] !== ''
            ? (string) $data['amount']
            : $plan->priceForInterval(Subscription::INTERVAL_MONTHLY);

        $subscription = $this->resolveSubscription($tenant, $plan, $periodStart, $periodEnd);

        $invoice = Invoice::query()->create([
            'invoice_number' => $this->nextNumber(),
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'amount' => $amount,
            'currency' => Payment::CURRENCY_BYN,
            'period_start' => $periodStart->toDateString(),
            'period_end' => $periodEnd->toDateString(),
            'status' => Invoice::STATUS_DRAFT,
        ]);

        $this->generatePdf($invoice);

        return $invoice->refresh()->load(['tenant', 'subscription.plan']);
    }

    public function generatePdf(Invoice $invoice): Invoice
    {
        $invoice->loadMissing(['tenant', 'subscription.plan']);

        $pdf = Pdf::loadView('pdf.invoice', $this->pdfPayload($invoice))
            ->setPaper('a4');

        $path = 'invoices/'.$invoice->invoice_number.'.pdf';
        Storage::disk('local')->put($path, $pdf->output());

        $invoice->update(['pdf_path' => $path]);

        return $invoice->refresh();
    }

    public function download(Invoice $invoice): StreamedResponse|Response
    {
        if (! $invoice->pdf_path || ! Storage::disk('local')->exists($invoice->pdf_path)) {
            $this->generatePdf($invoice);
            $invoice->refresh();
        }

        return Storage::disk('local')->download(
            (string) $invoice->pdf_path,
            $invoice->invoice_number.'.pdf',
        );
    }

    public function markAsPaid(Invoice $invoice, User $actor): Invoice
    {
        if ($invoice->status === Invoice::STATUS_CANCELLED) {
            throw ValidationException::withMessages([
                'invoice' => 'Отменённый счёт нельзя отметить оплаченным.',
            ]);
        }

        $invoice->loadMissing(['tenant', 'subscription.plan']);
        $subscription = $invoice->subscription;
        $plan = $subscription?->plan;
        $tenant = $invoice->tenant;

        if ($subscription && $plan && $tenant) {
            $subscription->update([
                'status' => Subscription::STATUS_ACTIVE,
                'starts_at' => $invoice->period_start?->startOfDay() ?? now(),
                'ends_at' => $invoice->period_end?->endOfDay() ?? now()->addMonth(),
            ]);

            $this->billing->applyPlanToTenant($tenant, $plan, $subscription->ends_at);
        }

        $invoice->update(['status' => Invoice::STATUS_PAID]);

        if ($tenant) {
            $this->notifyTenant(
                $tenant,
                Notification::TYPE_SUCCESS,
                'Счёт оплачен',
                sprintf('Счёт %s отмечен как оплаченный.', $invoice->invoice_number),
                route('billing.index'),
            );
        }

        return $invoice->refresh();
    }

    public function sendToEmail(Invoice $invoice): Invoice
    {
        $invoice->loadMissing(['tenant.users', 'subscription.plan']);
        $tenant = $invoice->tenant;

        abort_unless($tenant !== null, 422, 'Арендатор не найден.');

        $emails = $tenant->users
            ->filter(fn (User $user): bool => $user->is_active && filled($user->email))
            ->pluck('email')
            ->unique()
            ->values()
            ->all();

        if ($emails === []) {
            throw ValidationException::withMessages([
                'invoice' => 'У арендатора нет активных пользователей с email.',
            ]);
        }

        if (! $invoice->pdf_path || ! Storage::disk('local')->exists($invoice->pdf_path)) {
            $this->generatePdf($invoice);
            $invoice->refresh();
        }

        Mail::to($emails)->send(new InvoiceIssuedMail($invoice));

        if ($invoice->status === Invoice::STATUS_DRAFT) {
            $invoice->update(['status' => Invoice::STATUS_SENT]);
        }

        $this->notifyTenant(
            $tenant,
            Notification::TYPE_INFO,
            'Выставлен счёт',
            sprintf('Счёт %s отправлен на email.', $invoice->invoice_number),
            route('billing.index'),
        );

        return $invoice->refresh();
    }

    /**
     * @return array<string, mixed>
     */
    public function toListItem(Invoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'amount' => (float) $invoice->amount,
            'currency' => $invoice->currency,
            'period_start' => $invoice->period_start?->toDateString(),
            'period_end' => $invoice->period_end?->toDateString(),
            'status' => $invoice->status,
            'status_label' => $invoice->statusLabel(),
            'pdf_path' => $invoice->pdf_path,
            'tenant_id' => $invoice->tenant_id,
            'tenant_name' => $invoice->tenant?->name,
            'plan_name' => $invoice->subscription?->plan?->name,
            'created_at' => $invoice->created_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function pdfPayload(Invoice $invoice): array
    {
        $plan = $invoice->subscription?->plan;
        $bank = BankAccount::query()->where('is_default', true)->first()
            ?? BankAccount::query()->orderBy('created_at')->first();

        return [
            'invoice' => $invoice,
            'tenant' => $invoice->tenant,
            'plan' => $plan,
            'bank' => $bank,
            'issuedAt' => $invoice->created_at?->timezone('UTC')->format('d.m.Y') ?? now()->format('d.m.Y'),
        ];
    }

    private function nextNumber(): string
    {
        $year = now()->year;
        $prefix = 'SP-'.$year.'-';

        $last = Invoice::query()
            ->withTrashed()
            ->where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $seq = 1;
        if (is_string($last) && preg_match('/(\d+)$/', $last, $matches) === 1) {
            $seq = ((int) $matches[1]) + 1;
        }

        return $prefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }

    private function resolveSubscription(Tenant $tenant, Plan $plan, Carbon $start, Carbon $end): Subscription
    {
        $existing = $tenant->subscriptions()
            ->where('plan_id', $plan->id)
            ->whereIn('status', [
                Subscription::STATUS_PENDING,
                Subscription::STATUS_ACTIVE,
                Subscription::STATUS_PAST_DUE,
            ])
            ->latest()
            ->first();

        if ($existing) {
            return $existing;
        }

        return Subscription::query()->create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => Subscription::STATUS_PENDING,
            'billing_interval' => Subscription::INTERVAL_MONTHLY,
            'starts_at' => $start,
            'ends_at' => $end->copy()->endOfDay(),
            'auto_renew' => true,
        ]);
    }

    private function notifyTenant(
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
}
