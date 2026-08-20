<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Concerns\ProvidesStoreDepartmentOptions;
use App\Http\Requests\CoolerRequest;
use App\Models\Cooler;
use App\Models\Department;
use App\Services\CoolerService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CoolerController extends Controller implements HasMiddleware
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
                Permissions::VIEW_COOLERS,
                Permissions::CREATE_COOLERS,
                Permissions::EDIT_COOLERS,
                Permissions::DELETE_COOLERS,
            ),
            new Middleware('permission:'.Permissions::CREATE_COOLERS, only: ['previewCode']),
        ];
    }

    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $coolers = Cooler::query()
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
            ->through(fn (Cooler $cooler) => $this->transform($cooler));

        return Inertia::render('Coolers/Index', [
            'coolers' => $coolers,
            'stores' => $this->storesForSelect(),
            'temperatureZones' => Cooler::TEMPERATURE_ZONES,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'store_id' => $request->string('store_id')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Cooler::onlyTrashed()->count(),
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
                $suggestedCode = app(CoolerService::class)->previewCode($department);
                $storeId = $department->store_id;
            }
        }

        return Inertia::render('Coolers/Create', [
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($storeId),
            'temperatureZones' => Cooler::TEMPERATURE_ZONES,
            'selectedStoreId' => $storeId,
            'selectedDepartmentId' => $departmentId,
            'suggestedCode' => $suggestedCode,
        ]);
    }

    public function store(CoolerRequest $request, CoolerService $service): RedirectResponse
    {
        $service->create($request->validated());

        return redirect()->route('coolers.index')->with('success', 'Холодильник создан.');
    }

    public function edit(string $cooler): Response
    {
        $model = Cooler::query()->withCount('levels')->findOrFail($cooler);

        return Inertia::render('Coolers/Edit', [
            'cooler' => $this->transform($model, true),
            'stores' => $this->storesForSelect(),
            'departments' => $this->departmentsForSelect($model->store_id),
            'temperatureZones' => Cooler::TEMPERATURE_ZONES,
        ]);
    }

    public function update(CoolerRequest $request, string $cooler, CoolerService $service): RedirectResponse
    {
        $model = Cooler::query()->findOrFail($cooler);
        $service->update($model, $request->validated());

        return redirect()->route('coolers.index')->with('success', 'Холодильник обновлён.');
    }

    public function destroy(string $cooler): RedirectResponse
    {
        Cooler::query()->findOrFail($cooler)->delete();

        return redirect()->route('coolers.index')->with('success', 'Холодильник перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        Cooler::onlyTrashed()->findOrFail($id)->restore();

        return redirect()->route('coolers.index', ['trashed' => 1])->with('success', 'Холодильник восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        Cooler::onlyTrashed()->findOrFail($id)->forceDelete();

        return redirect()->route('coolers.index', ['trashed' => 1])->with('success', 'Холодильник удалён безвозвратно.');
    }

    public function previewCode(Request $request, CoolerService $service): JsonResponse
    {
        $department = Department::query()->findOrFail($request->string('department_id'));

        return response()->json(['code' => $service->previewCode($department)]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Cooler $cooler, bool $detailed = false): array
    {
        return [
            'id' => $cooler->id,
            'store_id' => $cooler->store_id,
            'department_id' => $cooler->department_id,
            'code' => $cooler->code,
            'display_name' => $this->localized($cooler->display_name),
            'width_mm' => (int) $cooler->width_mm,
            'height_mm' => (int) $cooler->height_mm,
            'depth_mm' => (int) $cooler->depth_mm,
            'door_count' => (int) $cooler->door_count,
            'shelf_count' => (int) $cooler->shelf_count,
            'temperature_zone' => $cooler->temperature_zone,
            'temperature_zone_label' => Cooler::TEMPERATURE_ZONES[$cooler->temperature_zone] ?? $cooler->temperature_zone,
            'sort_order' => (int) $cooler->sort_order,
            'levels_count' => (int) ($cooler->levels_count ?? $cooler->levels()->count()),
            'store_name' => $this->localized($cooler->store?->name),
            'department_name' => $cooler->department
                ? ($cooler->department->code.' — '.$this->localized($cooler->department->name))
                : '—',
            'created_at' => $cooler->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $cooler->deleted_at?->toIso8601String(),
            'detailed' => $detailed,
        ];
    }
}
