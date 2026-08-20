<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\Tenant;
use App\Services\TenantQuotaService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

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
        );
    }

    public function index(): JsonResponse
    {
        $stores = Store::query()
            ->withCount('departments')
            ->latest()
            ->paginate(20);

        return response()->json($stores);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'array'],
            'name.ru' => ['required', 'string', 'max:255'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'radius_meters' => ['nullable', 'integer', 'min:1'],
            'area_sqm' => ['nullable', 'numeric', 'min:0'],
            'working_hours' => ['nullable', 'array'],
            'contact_info' => ['nullable', 'array'],
            'status' => ['nullable', 'in:active,repair,decommissioned'],
            'seo_title' => ['nullable', 'array'],
            'seo_description' => ['nullable', 'array'],
        ]);

        $tenantId = $this->resolveTenantId($request);
        $tenant = Tenant::query()->findOrFail($tenantId);
        $quotas = app(TenantQuotaService::class);

        abort_unless(
            $quotas->canAddStore($tenant),
            Response::HTTP_UNPROCESSABLE_ENTITY,
            $quotas->storeLimitMessage($tenant),
        );

        $store = Store::query()->create([
            ...$validated,
            'tenant_id' => $tenantId,
        ]);

        return response()->json($store, Response::HTTP_CREATED);
    }

    public function show(Store $store): JsonResponse
    {
        $store->load('departments');

        return response()->json($store);
    }

    public function update(Request $request, Store $store): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'array'],
            'name.ru' => ['required_with:name', 'string', 'max:255'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:100'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'radius_meters' => ['nullable', 'integer', 'min:1'],
            'area_sqm' => ['nullable', 'numeric', 'min:0'],
            'working_hours' => ['nullable', 'array'],
            'contact_info' => ['nullable', 'array'],
            'status' => ['nullable', 'in:active,repair,decommissioned'],
            'seo_title' => ['nullable', 'array'],
            'seo_description' => ['nullable', 'array'],
        ]);

        $store->update($validated);

        return response()->json($store);
    }

    public function destroy(Store $store): JsonResponse
    {
        $store->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    private function resolveTenantId(Request $request): string
    {
        $tenantId = $request->user()?->tenant_id;

        if ($tenantId) {
            return $tenantId;
        }

        return $request->validate([
            'tenant_id' => ['required', 'uuid', 'exists:tenants,id'],
        ])['tenant_id'];
    }
}
