<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Validation\Rule;

class ProductController extends Controller implements HasMiddleware
{
    use AuthorizesResourcePermissions;

    /**
     * @return list<\Illuminate\Routing\Controllers\Middleware>
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
            'category' => ['nullable', 'string', 'max:100'],
            'volume_ml' => ['nullable', 'integer', 'min:0'],
            'package_type' => ['nullable', 'string', 'max:50'],
            'width_mm' => ['nullable', 'integer', 'min:0'],
            'height_mm' => ['nullable', 'integer', 'min:0'],
            'depth_mm' => ['nullable', 'integer', 'min:0'],
            'weight_g' => ['nullable', 'integer', 'min:0'],
            'checked' => ['sometimes', 'boolean'],
            'is_private' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();
        $isPrivate = (bool) ($validated['is_private'] ?? false);
        unset($validated['is_private']);

        $ownerTenantId = null;
        if ($isPrivate) {
            abort_unless($user?->tenant_id, 422, 'Приватный товар доступен только пользователю арендатора.');
            $ownerTenantId = $user->tenant_id;
        }

        $product = Product::query()->create([
            ...$validated,
            'checked' => (bool) ($validated['checked'] ?? false),
            'owner_tenant_id' => $ownerTenantId,
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
            'category' => ['nullable', 'string', 'max:100'],
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

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $user = $request->user();

        if ($product->isGlobal() && ! $user?->isSuperAdmin()) {
            abort(403, 'Глобальный товар каталога может удалить только Super Admin.');
        }

        $product->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
