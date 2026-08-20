<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Requests\StoreRequest;
use App\Models\Store;
use App\Models\Tenant;
use App\Services\TenantQuotaService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StoreController extends Controller implements HasMiddleware
{
    use AuthorizesResourcePermissions;

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return self::resourcePermissionMiddleware(
            Permissions::VIEW_STORES,
            Permissions::CREATE_STORES,
            Permissions::EDIT_STORES,
            Permissions::DELETE_STORES,
            Permissions::RESTORE_STORES,
        );
    }

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $stores = Store::query()
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';

                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('name->ru', 'ilike', $search)
                        ->orWhere('name->en', 'ilike', $search)
                        ->orWhere('city', 'ilike', $search)
                        ->orWhere('address', 'ilike', $search);
                });
            })
            ->when(
                $request->filled('status') && in_array($request->string('status')->toString(), ['active', 'repair', 'decommissioned'], true),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Store $store) => $this->transformStore($store));

        return Inertia::render('Stores/Index', [
            'stores' => $stores,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Store::onlyTrashed()->count(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Stores/Create', [
            'tenants' => $this->tenantsForSelect(),
            'defaultTenantId' => $request->string('tenant_id')->toString() ?: null,
        ]);
    }

    public function store(StoreRequest $request): RedirectResponse
    {
        Store::query()->create([
            ...$request->storeAttributes(),
            'tenant_id' => $this->resolveTenantId($request),
        ]);

        return redirect()
            ->route('stores.index')
            ->with('success', 'Магазин успешно создан.');
    }

    public function edit(string $store): Response
    {
        $model = Store::query()->findOrFail($store);

        return Inertia::render('Stores/Edit', [
            'store' => $this->transformStore($model, detailed: true),
            'tenants' => $this->tenantsForSelect(),
        ]);
    }

    public function update(StoreRequest $request, string $store): RedirectResponse
    {
        $model = Store::query()->findOrFail($store);
        $model->update($request->storeAttributes());

        return redirect()
            ->route('stores.index')
            ->with('success', 'Магазин успешно обновлён.');
    }

    public function destroy(string $store): RedirectResponse
    {
        $model = Store::query()->findOrFail($store);
        $model->delete();

        return redirect()
            ->route('stores.index')
            ->with('success', 'Магазин перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        $store = Store::onlyTrashed()->findOrFail($id);
        $tenant = $store->tenant_id ? Tenant::query()->find($store->tenant_id) : null;
        $quotas = app(TenantQuotaService::class);

        if ($tenant && ! $quotas->canAddStore($tenant)) {
            return back()->with('error', $quotas->storeLimitMessage($tenant));
        }

        $store->restore();

        return redirect()
            ->route('stores.index', ['trashed' => 1])
            ->with('success', 'Магазин восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        $store = Store::onlyTrashed()->findOrFail($id);
        $store->forceDelete();

        return redirect()
            ->route('stores.index', ['trashed' => 1])
            ->with('success', 'Магазин удалён безвозвратно.');
    }

    /**
     * @return array<string, mixed>
     */
    private function transformStore(Store $store, bool $detailed = false): array
    {
        $name = is_array($store->name) ? $store->name : [];

        $data = [
            'id' => $store->id,
            'name' => $name['ru'] ?? $name['en'] ?? '',
            'name_i18n' => $name,
            'city' => $store->city,
            'status' => $store->status,
            'created_at' => $store->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $store->deleted_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data = [
                ...$data,
                'tenant_id' => $store->tenant_id,
                'address' => $store->address,
                'latitude' => $store->latitude,
                'longitude' => $store->longitude,
                'radius_meters' => $store->radius_meters,
                'area_sqm' => $store->area_sqm,
                'working_hours' => $store->working_hours,
                'contact_info' => $store->contact_info,
            ];
        }

        return $data;
    }

    private function resolveTenantId(StoreRequest $request): string
    {
        $user = $request->user();

        if ($user?->tenant_id) {
            return $user->tenant_id;
        }

        abort_unless($user?->isSuperAdmin() === true, 403, 'Tenant is not assigned to your account.');

        return $request->validated('tenant_id');
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function tenantsForSelect(): array
    {
        $user = Auth::user();

        if (! $user?->isSuperAdmin()) {
            return [];
        }

        return Tenant::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->name,
            ])
            ->all();
    }
}
