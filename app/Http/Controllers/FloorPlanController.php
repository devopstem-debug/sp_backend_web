<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SaveFloorPlanRequest;
use App\Http\Requests\StoreWallRequest;
use App\Models\Store;
use App\Models\Wall;
use App\Services\FloorPlanService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class FloorPlanController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly FloorPlanService $floorPlans,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_PLANOGRAMS, only: ['stores', 'index']),
            new Middleware('permission:'.Permissions::MANAGE_PLANOGRAMS, only: ['save', 'addWall', 'removeWall']),
        ];
    }

    public function stores(): Response
    {
        $stores = Store::query()
            ->orderBy('city')
            ->orderBy('name')
            ->get(['id', 'name', 'city'])
            ->map(fn (Store $store) => [
                'id' => $store->id,
                'name' => is_array($store->name)
                    ? ($store->name['ru'] ?? $store->name['en'] ?? '')
                    : (string) $store->name,
                'city' => $store->city,
            ])
            ->values()
            ->all();

        return Inertia::render('FloorPlan/Stores', [
            'stores' => $stores,
        ]);
    }

    public function index(string $storeId): Response
    {
        try {
            $store = $this->floorPlans->resolveStore($storeId);
        } catch (InvalidArgumentException $exception) {
            abort(404, $exception->getMessage());
        }

        return Inertia::render('FloorPlan/Editor', $this->floorPlans->editorPayload($store));
    }

    public function save(SaveFloorPlanRequest $request, string $storeId): JsonResponse
    {
        try {
            $store = $this->floorPlans->resolveStore($storeId);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 404);
        }

        $this->floorPlans->save($store, $request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Карта зала сохранена.',
        ]);
    }

    public function addWall(StoreWallRequest $request, string $storeId): JsonResponse
    {
        try {
            $store = $this->floorPlans->resolveStore($storeId);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 404);
        }

        $wall = $this->floorPlans->addWall($store, $request->validated());

        return response()->json([
            'success' => true,
            'wall' => $wall,
        ]);
    }

    public function removeWall(Wall $wall): JsonResponse
    {
        $this->floorPlans->removeWall($wall);

        return response()->json([
            'success' => true,
        ]);
    }
}
