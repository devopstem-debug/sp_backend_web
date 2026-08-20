<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Concerns\ProvidesStoreDepartmentOptions;
use App\Http\Requests\StandRequest;
use App\Models\Department;
use App\Models\Stand;
use App\Services\StandService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class StandController extends Controller implements HasMiddleware
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
                Permissions::VIEW_STANDS,
                Permissions::CREATE_STANDS,
                Permissions::EDIT_STANDS,
                Permissions::DELETE_STANDS,
            ),
            new Middleware('permission:'.Permissions::CREATE_STANDS, only: ['previewCode']),
        ];
    }

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $stands = Stand::query()
            ->with(['store:id,name,city', 'department:id,code,name'])
            ->withCount('levels')
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($request->filled('store_id'), fn ($query) => $query->where('store_id', $request->string('store_id')))
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';
                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('code', 'ilike', $search)
                        ->orWhere('display_name->ru', 'ilike', $search)
                        ->orWhere('display_name->en', 'ilike', $search);
                });
            })
            ->orderBy('sort_order')
            ->orderBy('code')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Stand $stand) => $this->transform($stand));

        return Inertia::render('Stands/Index', [
            'stands' => $stands,
            'stores' => $this->storesForSelect(),
            'standTypes' => Stand::STAND_TYPES,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'store_id' => $request->string('store_id')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Stand::onlyTrashed()->count(),
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
                $suggestedCode = app(StandService::class)->previewCode($department);
                $storeId = $department->store_id;
            }
        }

        return Inertia::render('Stands/Create', [
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($storeId),
            'standTypes' => Stand::STAND_TYPES,
            'selectedStoreId' => $storeId,
            'selectedDepartmentId' => $departmentId,
            'suggestedCode' => $suggestedCode,
        ]);
    }

    public function store(StandRequest $request, StandService $service): RedirectResponse
    {
        $service->create($request->validated());

        return redirect()->route('stands.index')->with('success', 'Стойка создана.');
    }

    public function edit(string $stand): Response
    {
        $model = Stand::query()->withCount('levels')->findOrFail($stand);

        return Inertia::render('Stands/Edit', [
            'stand' => $this->transform($model, true),
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($model->store_id),
            'standTypes' => Stand::STAND_TYPES,
        ]);
    }

    public function update(StandRequest $request, string $stand, StandService $service): RedirectResponse
    {
        $model = Stand::query()->findOrFail($stand);
        $service->update($model, $request->validated());

        return redirect()->route('stands.index')->with('success', 'Стойка обновлена.');
    }

    public function destroy(string $stand): RedirectResponse
    {
        Stand::query()->findOrFail($stand)->delete();

        return redirect()->route('stands.index')->with('success', 'Стойка перемещена в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        Stand::onlyTrashed()->findOrFail($id)->restore();

        return redirect()->route('stands.index', ['trashed' => 1])->with('success', 'Стойка восстановлена.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        Stand::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()->route('stands.index', ['trashed' => 1])->with('success', 'Стойка удалена безвозвратно.');
    }

    public function previewCode(Request $request, StandService $service): JsonResponse
    {
        $department = Department::query()->findOrFail($request->string('department_id'));

        return response()->json(['code' => $service->previewCode($department)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Stand $stand, bool $detailed = false): array
    {
        return [
            'id' => $stand->id,
            'store_id' => $stand->store_id,
            'department_id' => $stand->department_id,
            'code' => $stand->code,
            'display_name' => $this->localized($stand->display_name),
            'stand_type' => $stand->stand_type,
            'stand_type_label' => Stand::STAND_TYPES[$stand->stand_type] ?? $stand->stand_type,
            'width_mm' => (int) $stand->width_mm,
            'height_mm' => (int) $stand->height_mm,
            'depth_mm' => (int) $stand->depth_mm,
            'shelf_count' => (int) $stand->shelf_count,
            'has_back' => (bool) $stand->has_back,
            'sort_order' => (int) $stand->sort_order,
            'levels_count' => (int) ($stand->levels_count ?? $stand->levels()->count()),
            'store_name' => $this->localized($stand->store?->name),
            'department_name' => $stand->department
                ? ($stand->department->code.' — '.$this->localized($stand->department->name))
                : '—',
            'created_at' => $stand->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $stand->deleted_at?->toIso8601String(),
            'detailed' => $detailed,
        ];
    }
}
