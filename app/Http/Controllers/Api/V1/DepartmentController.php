<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\AuthorizesResourcePermissions;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Store;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;

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
    public function index(Request $request): JsonResponse
    {
        $departments = Department::query()
            ->when($request->filled('store_id'), fn ($query) => $query->where('store_id', $request->string('store_id')))
            ->with('store:id,name,city')
            ->orderBy('sort_order')
            ->paginate(20);

        return response()->json($departments);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'code' => ['required', 'string', 'max:10'],
            'name' => ['required', 'array'],
            'name.ru' => ['required', 'string', 'max:255'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:7'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        Store::query()->findOrFail($validated['store_id']);

        $department = Department::query()->create($validated);

        return response()->json($department, Response::HTTP_CREATED);
    }

    public function show(Department $department): JsonResponse
    {
        $department->load('store');

        return response()->json($department);
    }

    public function update(Request $request, Department $department): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => ['sometimes', 'uuid', 'exists:stores,id'],
            'code' => ['sometimes', 'string', 'max:10'],
            'name' => ['sometimes', 'array'],
            'name.ru' => ['required_with:name', 'string', 'max:255'],
            'name.en' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'max:7'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['store_id'])) {
            Store::query()->findOrFail($validated['store_id']);
        }

        $department->update($validated);

        return response()->json($department);
    }

    public function destroy(Department $department): JsonResponse
    {
        $department->delete();

        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
