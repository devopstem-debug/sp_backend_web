<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Tenant;
use App\Services\TenantQuotaService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\Rule;

class ProductController extends Controller implements HasMiddleware
{
    use AuthorizesResourcePermissions;

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return self::resourcePermissionMiddleware(
            Permissions::VIEW_PRODUCTS,
            Permissions::CREATE_PRODUCTS,
            Permissions::EDIT_PRODUCTS,
            Permissions::DELETE_PRODUCTS,
        );
    }

    public function index(Request $request): JsonResponse
    {
        $products = Product::query()
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';
                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('name', 'ilike', $search)
                        ->orWhere('barcode', 'ilike', $search)
                        ->orWhere('category', 'ilike', $search);
                });
            })
            ->orderBy('name')
            ->paginate(20);

        return response()->json($products);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => [
                'required',
                'string',
                'size:13',
                Rule::unique('products', 'barcode')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'volume_ml' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:0'],
            'height_mm' => ['nullable', 'integer', 'min:0'],
            'depth_mm' => ['nullable', 'integer', 'min:0'],
            'weight_g' => ['nullable', 'integer', 'min:0'],
            'checked' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $tenantId = $user?->tenant_id;

        if (! $tenantId && $user?->isSuperAdmin()) {
            $tenantId = Tenant::query()->where('is_active', true)->value('id');
        }

        abort_unless($tenantId, 403, 'Tenant is not assigned to your account.');

        $tenant = Tenant::query()->findOrFail($tenantId);
        $quotas = app(TenantQuotaService::class);

        abort_unless(
            $quotas->canAddProduct($tenant),
            Response::HTTP_UNPROCESSABLE_ENTITY,
            $quotas->productLimitMessage($tenant),
        );

        $product = Product::query()->create([
            ...$validated,
            'checked' => (bool) ($validated['checked'] ?? false),
            'tenant_id' => $tenantId,
        ]);

        return response()->json($product, Response::HTTP_CREATED);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => [
                'sometimes',
                'string',
                'size:13',
                Rule::unique('products', 'barcode')
                    ->whereNull('deleted_at')
                    ->ignore($product->id),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'volume_ml' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:0'],
            'height_mm' => ['nullable', 'integer', 'min:0'],
            'depth_mm' => ['nullable', 'integer', 'min:0'],
            'weight_g' => ['nullable', 'integer', 'min:0'],
            'checked' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('checked', $validated)) {
            $validated['checked'] = (bool) $validated['checked'];
        }

        $product->update($validated);

        return response()->json($product);
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
