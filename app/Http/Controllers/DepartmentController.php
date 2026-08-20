<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Requests\DepartmentRequest;
use App\Models\Department;
use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller implements HasMiddleware
{
    use AuthorizesResourcePermissions;

    /**
     * @return list<\Illuminate\Routing\Controllers\Middleware>
     */
    public static function middleware(): array
    {
        return self::resourcePermissionMiddleware(
            Permissions::VIEW_DEPARTMENTS,
            Permissions::CREATE_DEPARTMENTS,
            Permissions::EDIT_DEPARTMENTS,
            Permissions::DELETE_DEPARTMENTS,
        );
    }
    public function index(Request $request): Response
    {
        $trashed = $request->boolean('trashed');

        $departments = Department::query()
            ->with('store:id,name,city')
            ->when($trashed, fn ($query) => $query->onlyTrashed())
            ->when($request->filled('store_id'), fn ($query) => $query->where('store_id', $request->string('store_id')))
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
            ->through(fn (Department $department) => $this->transformDepartment($department));

        return Inertia::render('Departments/Index', [
            'departments' => $departments,
            'stores' => $this->storesForSelect(),
            'filters' => [
                'search' => $request->string('search')->toString(),
                'store_id' => $request->string('store_id')->toString(),
                'trashed' => $trashed,
            ],
            'trashedCount' => Department::onlyTrashed()->count(),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Departments/Create', [
            'stores' => $this->storesForSelect(),
            'selectedStoreId' => $request->string('store_id')->toString() ?: null,
        ]);
    }

    public function store(DepartmentRequest $request): RedirectResponse
    {
        Store::query()->findOrFail($request->validated('store_id'));

        Department::query()->create($request->departmentAttributes());

        return redirect()
            ->route('departments.index')
            ->with('success', 'Отдел успешно создан.');
    }

    public function edit(string $department): Response
    {
        $model = Department::query()->findOrFail($department);

        return Inertia::render('Departments/Edit', [
            'department' => $this->transformDepartment($model, detailed: true),
            'stores' => $this->storesForSelect(),
        ]);
    }

    public function update(DepartmentRequest $request, string $department): RedirectResponse
    {
        $model = Department::query()->findOrFail($department);
        Store::query()->findOrFail($request->validated('store_id'));

        $model->update($request->departmentAttributes());

        return redirect()
            ->route('departments.index')
            ->with('success', 'Отдел успешно обновлён.');
    }

    public function destroy(string $department): RedirectResponse
    {
        $model = Department::query()->findOrFail($department);
        $model->delete();

        return redirect()
            ->route('departments.index')
            ->with('success', 'Отдел перемещён в корзину.');
    }

    public function restore(string $id): RedirectResponse
    {
        $department = Department::onlyTrashed()->findOrFail($id);
        $department->restore();

        return redirect()
            ->route('departments.index', ['trashed' => 1])
            ->with('success', 'Отдел восстановлен.');
    }

    public function forceDelete(string $id): RedirectResponse
    {
        $department = Department::onlyTrashed()->findOrFail($id);
        $department->forceDelete();

        return redirect()
            ->route('departments.index', ['trashed' => 1])
            ->with('success', 'Отдел удалён безвозвратно.');
    }

    /**
     * @return array<string, mixed>
     */
    private function transformDepartment(Department $department, bool $detailed = false): array
    {
        $store = $department->relationLoaded('store')
            ? $department->store
            : $department->store()->first();

        $name = is_array($department->name) ? $department->name : [];
        $storeName = null;

        if ($store) {
            $storeNameI18n = is_array($store->name) ? $store->name : [];
            $storeName = $storeNameI18n['ru'] ?? $storeNameI18n['en'] ?? null;
        }

        $data = [
            'id' => $department->id,
            'store_id' => $department->store_id,
            'code' => $department->code,
            'name' => $name['ru'] ?? $name['en'] ?? '',
            'name_i18n' => $name,
            'color' => $department->color ?: '#CCCCCC',
            'sort_order' => (int) $department->sort_order,
            'store_name' => $storeName,
            'created_at' => $department->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'deleted_at' => $department->deleted_at?->toIso8601String(),
        ];

        if ($detailed) {
            $data['store_city'] = $store?->city;
        }

        return $data;
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function storesForSelect(): array
    {
        return Store::query()
            ->orderBy('city')
            ->get(['id', 'name', 'city'])
            ->map(function (Store $store) {
                $name = is_array($store->name) ? $store->name : [];
                $label = $name['ru'] ?? $name['en'] ?? 'Без названия';

                if ($store->city) {
                    $label .= ' — '.$store->city;
                }

                return [
                    'id' => $store->id,
                    'name' => $label,
                ];
            })
            ->values()
            ->all();
    }
}
