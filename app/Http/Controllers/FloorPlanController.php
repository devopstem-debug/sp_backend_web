<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\SaveFloorPlanRequest;
use App\Http\Requests\SetupFloorPlanRequest;
use App\Http\Requests\StoreWallRequest;
use App\Models\Store;
use App\Models\StoreLayout;
use App\Models\Wall;
use App\Services\FloorPlanService;
use App\Support\Permissions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use Throwable;

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
            new Middleware('permission:'.Permissions::VIEW_PLANOGRAMS, only: ['stores', 'index', 'edit', 'create']),
            new Middleware('permission:'.Permissions::MANAGE_PLANOGRAMS, only: ['save', 'storeSetup', 'addWall', 'removeWall']),
        ];
    }

    public function stores(): Response
    {
        $user = request()->user();
        $canCreateStore = $user?->can(Permissions::CREATE_STORES) === true;
        $canManagePlan = $user?->can(Permissions::MANAGE_PLANOGRAMS) === true
            && $user->canSetupFloorPlanMap();

        $stores = Store::query()
            ->with('layout:id,store_id,width_meters,height_meters')
            ->orderBy('city')
            ->orderBy('name')
            ->get(['id', 'name', 'city'])
            ->map(fn (Store $store) => [
                'id' => $store->id,
                'name' => is_array($store->name)
                    ? ($store->name['ru'] ?? $store->name['en'] ?? '')
                    : (string) $store->name,
                'city' => $store->city,
                'has_layout' => $store->layout !== null,
                'width_meters' => $store->layout?->width_meters,
                'height_meters' => $store->layout?->height_meters,
            ])
            ->values()
            ->all();

        return Inertia::render('FloorPlan/Stores', [
            'stores' => $stores,
            'canCreateStore' => $canCreateStore,
            'canManagePlan' => $canManagePlan,
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()?->canSetupFloorPlanMap() === true, 403, 'Доступ только для Super Admin и Network Manager.');

        $preselect = $request->string('store_id')->toString();

        $stores = Store::query()
            ->orderBy('city')
            ->orderBy('name')
            ->get(['id', 'name', 'city', 'address', 'latitude', 'longitude'])
            ->map(fn (Store $store) => [
                'id' => $store->id,
                'name' => is_array($store->name)
                    ? ($store->name['ru'] ?? $store->name['en'] ?? '')
                    : (string) $store->name,
                'city' => $store->city,
                'address' => $store->address,
                'latitude' => $store->latitude,
                'longitude' => $store->longitude,
            ])
            ->values()
            ->all();

        return Inertia::render('FloorPlan/Create', [
            'stores' => $stores,
            'sides' => StoreLayout::SIDES,
            'defaults' => [
                'store_id' => $preselect !== '' ? $preselect : ($stores[0]['id'] ?? ''),
                'width_meters' => 20,
                'height_meters' => 15,
                'entrance_side' => 'south',
                'entrance_offset_m' => 0,
                'entrance_width_m' => 2,
                'has_cash_registers' => true,
                'cash_side' => 'south',
                'cash_count' => 3,
                'grid_size_cm' => 50,
                'replace_existing' => true,
            ],
        ]);
    }

    public function storeSetup(SetupFloorPlanRequest $request): RedirectResponse
    {
        abort_unless($request->user()?->canSetupFloorPlanMap() === true, 403, 'Доступ только для Super Admin и Network Manager.');

        $data = $request->validated();

        try {
            $store = $this->floorPlans->resolveStore($data['store_id']);
            $this->floorPlans->setupHall($store, $data);
        } catch (InvalidArgumentException $exception) {
            return redirect()
                ->route('floor-plan.create')
                ->with('error', $exception->getMessage());
        } catch (Throwable $exception) {
            Log::error('floor-plan.setup failed', [
                'store_id' => $data['store_id'] ?? null,
                'message' => $exception->getMessage(),
                'exception' => $exception,
            ]);

            $message = 'Не удалось сохранить зал. Проверьте подключение к базе данных и попробуйте снова.';
            if (config('app.debug')) {
                $message .= ' '.$exception->getMessage();
            }

            return redirect()
                ->route('floor-plan.create')
                ->withInput()
                ->with('error', $message);
        }

        $store = $this->floorPlans->resolveStore($data['store_id']);

        return redirect()
            ->route('floor-plan.edit', $store->id)
            ->with('success', 'Зал настроен по карте. Можно размещать оборудование.');
    }

    public function index(string $storeId): RedirectResponse
    {
        return redirect()->route('floor-plan.edit', $storeId);
    }

    public function edit(string $storeId): Response
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

        $store = $this->floorPlans->resolveStore($storeId);

        return response()->json([
            'success' => true,
            'message' => 'Карта зала сохранена.',
            'payload' => $this->floorPlans->editorPayload($store),
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
