<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\InvoiceRequest;
use App\Models\Invoice;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\InvoiceService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InvoiceController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly InvoiceService $invoices,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::MANAGE_INVOICES),
        ];
    }

    public function index(Request $request): InertiaResponse
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $invoices = $this->invoices
            ->paginate(
                in_array($status, Invoice::statuses(), true) ? $status : null,
                $search !== '' ? $search : null,
            )
            ->through(fn (Invoice $invoice) => $this->invoices->toListItem($invoice));

        return Inertia::render('Billing/Invoices/Index', [
            'invoices' => $invoices,
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('Billing/Invoices/Create', [
            'tenants' => Tenant::query()
                ->orderBy('name')
                ->get(['id', 'name', 'domain'])
                ->map(fn (Tenant $tenant) => [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'domain' => $tenant->domain,
                ])
                ->values()
                ->all(),
            'plans' => Plan::query()
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->get(['id', 'name', 'slug', 'price_monthly', 'price_yearly'])
                ->map(fn (Plan $plan) => [
                    'id' => $plan->id,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price_monthly' => (float) $plan->price_monthly,
                    'price_yearly' => (float) $plan->price_yearly,
                ])
                ->values()
                ->all(),
        ]);
    }

    public function store(InvoiceRequest $request): RedirectResponse
    {
        $invoice = $this->invoices->create($request->invoiceAttributes());

        return redirect()
            ->route('admin.invoices.index')
            ->with('success', 'Счёт '.$invoice->invoice_number.' создан.');
    }

    public function generatePdf(string $invoice): StreamedResponse|Response
    {
        $model = Invoice::query()->findOrFail($invoice);

        return $this->invoices->download($model);
    }

    public function markAsPaid(string $invoice): RedirectResponse
    {
        $model = Invoice::query()->findOrFail($invoice);
        $actor = request()->user();
        abort_unless($actor instanceof User, 403);

        $this->invoices->markAsPaid($model, $actor);

        return back()->with('success', 'Счёт отмечен как оплаченный.');
    }

    public function sendToEmail(string $invoice): RedirectResponse
    {
        $model = Invoice::query()->findOrFail($invoice);
        $this->invoices->sendToEmail($model);

        return back()->with('success', 'Счёт отправлен на email.');
    }
}
