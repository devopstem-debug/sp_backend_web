<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
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

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $products = Product::query()
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->string('category')))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';

                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('name', 'ilike', $search)
                        ->orWhere('barcode', 'ilike', $search)
                        ->orWhere('category', 'ilike', $search)
                        ->orWhere('package_type', 'ilike', $search);
                });
            })
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Product $product) => $this->transformProduct($product));

        $categories = Product::query()
            ->select('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => $categories,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'category' => $request->string('category')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Product::onlyTrashed()->count(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Products/Create');
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        Product::query()->create([
            ...$request->productAttributes(),
            'tenant_id' => $this->resolveTenantId($request),
        ]);

        return redirect()
            ->route('products.index')
            ->with('success', 'Товар успешно создан.');
    }

    public function edit(string $product): Response
    {
        $model = Product::query()->findOrFail($product);

        return Inertia::render('Products/Edit', [
            'product' => $this->transformProduct($model, detailed: true),
        ]);
    }

    public function update(ProductRequest $request, string $product): RedirectResponse
    {
        $model = Product::query()->findOrFail($product);
        $model->update($request->productAttributes());

        return redirect()
            ->route('products.index')
            ->with('success', 'Товар успешно обновлён.');
    }

    public function destroy(string $product): RedirectResponse
    {
        $model = Product::query()->findOrFail($product);
        $model->delete();

        return redirect()
            ->route('products.index')
            ->with('success', 'Товар перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $tenant = $product->tenant_id ? Tenant::query()->find($product->tenant_id) : null;
        $quotas = app(TenantQuotaService::class);

        if ($tenant && ! $quotas->canAddProduct($tenant)) {
            return back()->with('error', $quotas->productLimitMessage($tenant));
        }

        $product->restore();

        return redirect()
            ->route('products.index', ['trashed' => 1])
            ->with('success', 'Товар восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->forceDelete();

        return redirect()
            ->route('products.index', ['trashed' => 1])
            ->with('success', 'Товар удалён безвозвратно.');
    }

    /**
     * @return array<string, mixed>
     */
    private function transformProduct(Product $product, bool $detailed = false): array
    {
        $data = [
            'id' => $product->id,
            'barcode' => $product->barcode,
            'name' => $product->name,
            'category' => $product->category,
            'volume_ml' => $product->volume_ml,
            'package_type' => $product->package_type,
            'width_mm' => $product->width_mm,
            'height_mm' => $product->height_mm,
            'depth_mm' => $product->depth_mm,
            'weight_g' => $product->weight_g,
            'checked' => (bool) $product->checked,
            'created_at' => $product->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $product->deleted_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['tenant_id'] = $product->tenant_id;
        }

        return $data;
    }

    private function resolveTenantId(ProductRequest $request): string
    {
        $user = $request->user();

        if ($user?->tenant_id) {
            return $user->tenant_id;
        }

        abort_unless($user?->isSuperAdmin() === true, 403, 'Tenant is not assigned to your account.');

        $tenantId = Tenant::query()->where('is_active', true)->value('id');

        abort_unless($tenantId, 422, 'Нет активного арендатора для создания товара.');

        return $tenantId;
    }
}
