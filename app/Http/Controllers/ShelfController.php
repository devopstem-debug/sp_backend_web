<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Concerns\ProvidesStoreDepartmentOptions;
use App\Http\Requests\ShelfRequest;
use App\Models\Department;
use App\Models\Shelf;
use App\Services\ShelfService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ShelfController extends Controller implements HasMiddleware
{
    use AuthorizesResourcePermissions;
    use ProvidesStoreDepartmentOptions;

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            ...self::resourcePermissionMiddleware(
                Permissions::VIEW_SHELVES,
                Permissions::CREATE_SHELVES,
                Permissions::EDIT_SHELVES,
                Permissions::DELETE_SHELVES,
            ),
            new Middleware('permission:'.Permissions::CREATE_SHELVES, only: ['previewCode']),
        ];
    }

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $shelves = Shelf::query()
            ->with(['store:id,name,city', 'department:id,code,name'])
            ->withCount('levels')
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($request->filled('store_id'), fn ($query) => $query->where('store_id', $request->string('store_id')))
            ->when($request->filled('department_id'), fn ($query) => $query->where('department_id', $request->string('department_id')))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';
                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('code', 'ilike', $search)
                        ->orWhere('name->ru', 'ilike', $search)
                        ->orWhere('name->en', 'ilike', $search);
                });
            })
            ->orderBy('sort_order')
            ->orderBy('code')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Shelf $shelf) => $this->transform($shelf));

        return Inertia::render('Shelves/Index', [
            'shelves' => $shelves,
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($request->string('store_id')->toString() ?: null),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'store_id' => $request->string('store_id')->toString(),
                'department_id' => $request->string('department_id')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Shelf::onlyTrashed()->count(),
        ]);
    }

    public function create(Request $request): Response
    {
        $storeId = $request->string('store_id')->toString() ?: null;
        $departmentId = $request->string('department_id')->toString() ?: null;
        $suggestedCode = null;

        if ($departmentId) {
            $department = Department::query()->find($departmentId);
            if ($department) {
                $suggestedCode = app(ShelfService::class)->previewCode($department);
                $storeId = $department->store_id;
            }
        }

        return Inertia::render('Shelves/Create', [
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($storeId),
            'selectedStoreId' => $storeId,
            'selectedDepartmentId' => $departmentId,
            'suggestedCode' => $suggestedCode,
        ]);
    }

    public function store(ShelfRequest $request, ShelfService $service): RedirectResponse
    {
        $service->create($request->validated());

        return redirect()
            ->route('shelves.index')
            ->with('success', 'Стеллаж создан.');
    }

    public function edit(string $shelf): Response
    {
        $model = Shelf::query()->withCount('levels')->findOrFail($shelf);

        return Inertia::render('Shelves/Edit', [
            'shelf' => $this->transform($model, true),
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($model->store_id),
        ]);
    }

    public function update(ShelfRequest $request, string $shelf, ShelfService $service): RedirectResponse
    {
        $model = Shelf::query()->findOrFail($shelf);
        $service->update($model, $request->validated());

        return redirect()
            ->route('shelves.index')
            ->with('success', 'Стеллаж обновлён.');
    }

    public function destroy(string $shelf): RedirectResponse
    {
        Shelf::query()->findOrFail($shelf)->delete();

        return redirect()
            ->route('shelves.index')
            ->with('success', 'Стеллаж перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        Shelf::onlyTrashed()->findOrFail($id)->restore();

        return redirect()
            ->route('shelves.index', ['trashed' => 1])
            ->with('success', 'Стеллаж восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        Shelf::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()
            ->route('shelves.index', ['trashed' => 1])
            ->with('success', 'Стеллаж удалён безвозвратно.');
    }

    public function previewCode(Request $request, ShelfService $service): JsonResponse
    {
        $department = Department::query()->findOrFail($request->string('department_id'));

        return response()->json(['code' => $service->previewCode($department)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Shelf $shelf, bool $detailed = false): array
    {
        $data = [
            'id' => $shelf->id,
            'store_id' => $shelf->store_id,
            'department_id' => $shelf->department_id,
            'code' => $shelf->code,
            'name' => $this->localized($shelf->name),
            'width_mm' => (int) $shelf->width_mm,
            'height_mm' => (int) $shelf->height_mm,
            'depth_mm' => (int) $shelf->depth_mm,
            'shelf_count' => (int) $shelf->shelf_count,
            'width_cm' => (int) $shelf->width_cm,
            'sort_order' => (int) $shelf->sort_order,
            'levels_count' => (int) ($shelf->levels_count ?? $shelf->levels()->count()),
            'store_name' => $this->localized($shelf->store?->name),
            'department_name' => $shelf->department
                ? ($shelf->department->code.' — '.$this->localized($shelf->department->name))
                : '—',
            'created_at' => $shelf->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $shelf->deleted_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['has_placements'] = $shelf->placements()->exists();
        }

        return $data;
    }
}
