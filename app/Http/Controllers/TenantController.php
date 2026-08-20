<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TenantRequest;
use App\Models\Tenant;
use App\Services\TenantService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly TenantService $tenants,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::MANAGE_TENANTS),
        ];
    }

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();
        $search = $request->string('search')->toString();

        $tenants = $this->tenants
            ->paginate(
                in_array($status, ['active', 'blocked'], true) ? $status : null,
                $search !== '' ? $search : null,
            )
            ->through(fn (Tenant $tenant) => $this->tenants->toListItem($tenant));

        return Inertia::render('Tenants/Index', [
            'tenants' => $tenants,
            'filters' => [
                'search' => $search,
                'status' => $status,
            ],
            'plans' => $this->tenants->planOptions(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Tenants/Create', [
            'plans' => $this->tenants->planOptions(),
        ]);
    }

    public function store(TenantRequest $request): RedirectResponse
    {
        $tenant = $this->tenants->create($request->tenantAttributes());

        return redirect()
            ->route('tenants.show', $tenant->id)
            ->with('success', 'Арендатор создан.');
    }

    public function show(string $tenant): Response
    {
        $model = Tenant::query()->findOrFail($tenant);

        return Inertia::render('Tenants/Show', [
            'tenant' => $this->tenants->toDetails($model),
        ]);
    }

    public function edit(string $tenant): Response
    {
        $model = Tenant::query()->findOrFail($tenant);

        return Inertia::render('Tenants/Edit', [
            'tenant' => $this->tenants->toSummary($model),
            'plans' => $this->tenants->planOptions(),
        ]);
    }

    public function update(TenantRequest $request, string $tenant): RedirectResponse
    {
        $model = Tenant::query()->findOrFail($tenant);
        $this->tenants->update($model, $request->tenantAttributes());

        return redirect()
            ->route('tenants.show', $model->id)
            ->with('success', 'Арендатор обновлён.');
    }

    public function toggleActive(string $tenant): RedirectResponse
    {
        $model = Tenant::query()->findOrFail($tenant);
        $this->tenants->toggleActive($model);

        return back()->with(
            'success',
            $model->is_active ? 'Арендатор разблокирован.' : 'Арендатор заблокирован.',
        );
    }
}
