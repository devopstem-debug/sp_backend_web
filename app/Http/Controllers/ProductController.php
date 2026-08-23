<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Services\OpenFoodFactsService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
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
        return [
            ...self::resourcePermissionMiddleware(
                Permissions::VIEW_PRODUCTS,
                Permissions::CREATE_PRODUCTS,
                Permissions::EDIT_PRODUCTS,
                Permissions::DELETE_PRODUCTS,
            ),
            new Middleware('permission:'.Permissions::CREATE_PRODUCTS, only: ['lookupBarcode']),
            new Middleware('permission:'.Permissions::EDIT_PRODUCTS, only: ['approveUnchecked', 'approve']),
        ];
    }

    public function __construct(
        private readonly OpenFoodFactsService $openFoodFacts,
    ) {}

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');
        $uncheckedOnly = $request->boolean('unchecked');

        $products = Product::query()
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($uncheckedOnly && ! $trashed, fn ($query) => $query->where('checked', false))
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
                'unchecked' => $uncheckedOnly,
            ],
            'trashedCount' => Product::onlyTrashed()->count(),
            'uncheckedCount' => Product::query()->where('checked', false)->count(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Products/Create');
    }

    public function lookupBarcode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'barcode' => ['required', 'string', 'regex:/^\d{8,14}$/'],
        ], [
            'barcode.required' => 'Укажите штрихкод.',
            'barcode.regex' => 'Штрихкод должен содержать от 8 до 14 цифр.',
        ]);

        $barcode = preg_replace('/\D+/', '', $validated['barcode']) ?? '';

        if (strlen($barcode) === 13 && ! preg_match('/^\d{13}$/', $barcode)) {
            throw ValidationException::withMessages([
                'barcode' => 'Штрихкод EAN-13 должен состоять из 13 цифр.',
            ]);
        }

        $local = Product::query()
            ->where('barcode', $barcode)
            ->first();

        if ($local) {
            return response()->json([
                'barcode' => $barcode,
                'exists_locally' => true,
                'local_product' => [
                    'id' => $local->id,
                    'name' => $local->name,
                    'category' => $local->category,
                    'edit_url' => route('products.edit', $local->id),
                ],
                'open_food_facts' => null,
            ]);
        }

        $off = $this->openFoodFacts->lookup($barcode);

        return response()->json([
            'barcode' => $barcode,
            'exists_locally' => false,
            'local_product' => null,
            'open_food_facts' => $off['found'] ? $off : null,
        ]);
    }

    public function store(ProductRequest $request): RedirectResponse
    {
        Product::query()->create([
            ...$request->productAttributes(),
            'owner_tenant_id' => $this->resolveOwnerTenantId($request),
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
        $user = Auth::user();

        if ($model->isGlobal() && ! $user?->isSuperAdmin()) {
            return back()->with(
                'error',
                'Глобальный товар каталога может удалить только Super Admin.',
            );
        }

        if (
            $model->owner_tenant_id
            && $user
            && ! $user->isSuperAdmin()
            && $model->owner_tenant_id !== $user->tenant_id
        ) {
            return back()->with('error', 'Нельзя удалить чужой приватный товар.');
        }

        $model->delete();

        return redirect()
            ->route('products.index')
            ->with('success', 'Товар перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $product->restore();

        return redirect()
            ->route('products.index', ['trashed' => 1])
            ->with('success', 'Товар восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        $product = Product::onlyTrashed()->findOrFail($id);
        $user = Auth::user();

        if ($product->isGlobal() && ! $user?->isSuperAdmin()) {
            return back()->with(
                'error',
                'Глобальный товар каталога может удалить только Super Admin.',
            );
        }

        $product->forceDelete();

        return redirect()
            ->route('products.index', ['trashed' => 1])
            ->with('success', 'Товар удалён безвозвратно.');
    }

    public function approveUnchecked(): RedirectResponse
    {
        $updated = Product::query()
            ->where('checked', false)
            ->update(['checked' => true]);

        if ($updated === 0) {
            return redirect()
                ->route('products.index')
                ->with('success', 'Непроверенных товаров нет.');
        }

        return redirect()
            ->route('products.index')
            ->with('success', "Подтверждено товаров: {$updated}.");
    }

    public function approve(string $product): RedirectResponse
    {
        $model = Product::query()->findOrFail($product);

        if (! $model->checked) {
            $model->update(['checked' => true]);
        }

        return back()->with('success', 'Товар отмечен как проверенный.');
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
            'is_global' => $product->owner_tenant_id === null,
            'is_private' => $product->owner_tenant_id !== null,
            'created_at' => $product->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $product->deleted_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['owner_tenant_id'] = $product->owner_tenant_id;
            $data['is_private'] = $product->owner_tenant_id !== null;
            $data['is_global'] = $product->owner_tenant_id === null;
        }

        return $data;
    }

    private function resolveOwnerTenantId(ProductRequest $request): ?string
    {
        if (! $request->wantsPrivate()) {
            return null;
        }

        $user = $request->user();

        if ($user?->tenant_id) {
            return $user->tenant_id;
        }

        abort_unless($user?->isSuperAdmin() === true, 403, 'Нельзя создать приватный товар без арендатора.');

        // Super Admin without tenant context cannot mark as private without an owner.
        abort(422, 'Для приватного товара войдите под арендатором или укажите владельца.');
    }
}
