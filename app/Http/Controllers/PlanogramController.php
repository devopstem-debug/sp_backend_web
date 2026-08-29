<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StorePlacementRequest;
use App\Models\Cooler;
use App\Models\Department;
use App\Models\Placement;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Services\PlacementService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class PlanogramController extends Controller implements HasMiddleware
{
    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_PLANOGRAMS, only: ['index', 'show']),
            new Middleware('permission:'.Permissions::CREATE_PLANOGRAMS.'|'.Permissions::EDIT_PLANOGRAMS, only: ['storePlacement']),
            new Middleware('permission:'.Permissions::DELETE_PLANOGRAMS, only: ['destroyPlacement']),
        ];
    }
    public function index(Request $request): Response
    {
        $stores = $this->storesForSelect();
        $storeId = $request->string('store_id')->toString();
        $shelfId = $request->string('shelf_id')->toString();
        $coolerId = $request->string('cooler_id')->toString();
        $standId = $request->string('stand_id')->toString();

        if ($storeId === '' && $stores !== []) {
            $storeId = $stores[0]['id'];
        }

        $activeEquipment = null;

        if ($shelfId !== '') {
            $model = Shelf::query()
                ->with([
                    'store:id,name,city',
                    'department:id,name,code,color',
                    'levels.placements.product:id,barcode,name,category,volume_ml,package_type,width_mm,height_mm,depth_mm',
                ])
                ->find($shelfId);

            if ($model) {
                $activeEquipment = $this->transformShelfDetail($model);
                $storeId = $storeId !== '' ? $storeId : $model->store_id;
            }
        } elseif ($coolerId !== '') {
            $model = Cooler::query()
                ->with(['store:id,name,city', 'department:id,name,code', 'levels'])
                ->find($coolerId);

            if ($model) {
                $activeEquipment = $this->transformCoolerDetail($model);
                $storeId = $storeId !== '' ? $storeId : $model->store_id;
            }
        } elseif ($standId !== '') {
            $model = Stand::query()
                ->with(['store:id,name,city', 'department:id,name,code', 'levels'])
                ->find($standId);

            if ($model) {
                $activeEquipment = $this->transformStandDetail($model);
                $storeId = $storeId !== '' ? $storeId : $model->store_id;
            }
        }

        return Inertia::render('Planograms/Index', [
            'stores' => $stores,
            'tree' => $this->buildDepartmentTree($storeId),
            'activeEquipment' => $activeEquipment,
            // backward-compatible alias for shelf tabs already in localStorage
            'activeShelf' => $activeEquipment && ($activeEquipment['type'] ?? null) === 'shelf'
                ? $activeEquipment
                : null,
            'filters' => [
                'store_id' => $storeId,
                'shelf_id' => $shelfId,
                'cooler_id' => $coolerId,
                'stand_id' => $standId,
            ],
        ]);
    }

    public function show(string $shelf): RedirectResponse
    {
        $model = Shelf::query()->findOrFail($shelf);

        return redirect()->route('planograms.index', [
            'store_id' => $model->store_id,
            'shelf_id' => $model->id,
        ]);
    }

    public function storePlacement(
        StorePlacementRequest $request,
        string $shelf,
        PlacementService $placements,
    ): RedirectResponse {
        $model = Shelf::query()->findOrFail($shelf);

        $placements->create($model, $request->validated());

        return redirect()
            ->route('planograms.index', [
                'store_id' => $model->store_id,
                'shelf_id' => $model->id,
            ])
            ->with('success', 'Товар размещён');
    }

    public function destroyPlacement(string $id): RedirectResponse
    {
        $placement = Placement::query()
            ->with('shelfLevel.shelf:id,store_id')
            ->findOrFail($id);

        $shelf = $placement->shelfLevel?->shelf;
        $shelfId = $shelf?->id;
        $storeId = $shelf?->store_id;

        $placement->delete();

        return redirect()
            ->route('planograms.index', array_filter([
                'store_id' => $storeId,
                'shelf_id' => $shelfId,
            ]))
            ->with('success', 'Размещение удалено.');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function buildDepartmentTree(string $storeId): array
    {
        if ($storeId === '') {
            return [];
        }

        $shelves = Shelf::query()
            ->withCount(['levels', 'placements'])
            ->where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $coolers = Cooler::query()
            ->withCount('levels')
            ->where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $stands = Stand::query()
            ->withCount('levels')
            ->where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get();

        $departments = Department::query()
            ->where('store_id', $storeId)
            ->orderBy('sort_order')
            ->orderBy('code')
            ->get(['id', 'code', 'name', 'color']);

        $shelvesByDept = $shelves->groupBy(fn (Shelf $item) => $item->department_id ?? 'none');
        $coolersByDept = $coolers->groupBy(fn (Cooler $item) => $item->department_id ?? 'none');
        $standsByDept = $stands->groupBy(fn (Stand $item) => $item->department_id ?? 'none');

        $deptIds = $departments->pluck('id')
            ->merge($shelvesByDept->keys())
            ->merge($coolersByDept->keys())
            ->merge($standsByDept->keys())
            ->unique()
            ->filter(fn ($id) => $id !== 'none')
            ->values();

        $tree = [];

        foreach ($departments as $department) {
            $node = $this->departmentNode(
                $department->id,
                $department->code,
                $this->localized($department->name),
                $shelvesByDept,
                $coolersByDept,
                $standsByDept,
                $department->color,
            );

            if ($this->nodeHasEquipment($node)) {
                $tree[] = $node;
            }
        }

        foreach ($deptIds as $id) {
            if ($departments->contains('id', $id)) {
                continue;
            }
        }

        $orphan = $this->departmentNode(
            'none',
            '—',
            'Без отдела',
            $shelvesByDept,
            $coolersByDept,
            $standsByDept,
            '#64748b',
        );

        if ($this->nodeHasEquipment($orphan)) {
            $tree[] = $orphan;
        }

        return $tree;
    }

    /**
     * @param  Collection<string, mixed>  $shelvesByDept
     * @param  Collection<string, mixed>  $coolersByDept
     * @param  Collection<string, mixed>  $standsByDept
     * @return array<string, mixed>
     */
    private function departmentNode(
        string $id,
        string $code,
        string $name,
        $shelvesByDept,
        $coolersByDept,
        $standsByDept,
        ?string $color = null,
    ): array {
        return [
            'id' => $id,
            'code' => $code,
            'name' => $name,
            'color' => $color ?: '#6366f1',
            'shelves' => ($shelvesByDept->get($id) ?? collect())
                ->map(fn (Shelf $shelf) => $this->transformShelfNavItem($shelf))
                ->values()
                ->all(),
            'coolers' => ($coolersByDept->get($id) ?? collect())
                ->map(fn (Cooler $cooler) => [
                    'id' => $cooler->id,
                    'type' => 'cooler',
                    'code' => $cooler->code,
                    'name' => $cooler->displayLabel(),
                    'levels_count' => (int) $cooler->levels_count,
                    'meta' => $cooler->temperature_zone,
                ])
                ->values()
                ->all(),
            'stands' => ($standsByDept->get($id) ?? collect())
                ->map(fn (Stand $stand) => [
                    'id' => $stand->id,
                    'type' => 'stand',
                    'code' => $stand->code,
                    'name' => $stand->displayLabel(),
                    'levels_count' => (int) $stand->levels_count,
                    'meta' => $stand->stand_type,
                ])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function nodeHasEquipment(array $node): bool
    {
        return $node['shelves'] !== [] || $node['coolers'] !== [] || $node['stands'] !== [];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformShelfNavItem(Shelf $shelf): array
    {
        $widthCm = (float) ($shelf->width_cm ?: max(1, round(($shelf->width_mm ?? 0) / 10)));

        return [
            'id' => $shelf->id,
            'type' => 'shelf',
            'code' => $shelf->code,
            'name' => $this->localized($shelf->name),
            'width_cm' => $widthCm,
            'width_mm' => $shelf->width_mm ?: (int) round($widthCm * 10),
            'width_m' => round($widthCm / 100, 2),
            'levels_count' => (int) $shelf->levels_count,
            'placements_count' => (int) $shelf->placements_count,
            'department_id' => $shelf->department_id,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformShelfDetail(Shelf $shelf): array
    {
        $zoneColor = $shelf->department?->color ?: '#6366f1';

        $levels = $shelf->levels
            ->sortByDesc('level_number')
            ->values()
            ->map(function ($level) use ($shelf, $zoneColor) {
                $placements = $level->placements->map(function (Placement $placement) use ($zoneColor) {
                    $widthMm = $placement->product?->width_mm;
                    $facings = (int) $placement->facings;
                    $spanCm = max(0, (float) $placement->end_cm - (float) $placement->start_cm);
                    $occupiedCm = $widthMm && $facings > 0
                        ? round(($widthMm / 10) * $facings, 2)
                        : round($spanCm, 2);

                    return [
                        'id' => $placement->id,
                        'product_id' => $placement->product_id,
                        'product_name' => $placement->product?->name,
                        'product_barcode' => $placement->product?->barcode,
                        'product_category' => $placement->product?->category,
                        'product_volume_ml' => $placement->product?->volume_ml,
                        'product_package_type' => $placement->product?->package_type,
                        'width_mm' => $widthMm,
                        'height_mm' => $placement->product?->height_mm,
                        'depth_mm' => $placement->product?->depth_mm,
                        'occupied_cm' => $occupiedCm,
                        'start_cm' => $placement->start_cm,
                        'end_cm' => $placement->end_cm,
                        'facings' => $facings,
                        'zone_color' => $zoneColor,
                    ];
                })->values();

                $usedCm = round((float) $placements->sum('occupied_cm'), 2);
                $shelfWidthCm = (float) ($shelf->width_cm ?: max(1, round(($shelf->width_mm ?? 0) / 10)));
                $fillPercent = $shelfWidthCm > 0
                    ? round(($usedCm / $shelfWidthCm) * 100, 1)
                    : 0;

                return [
                    'id' => $level->id,
                    'level_number' => $level->level_number,
                    'height_cm' => $level->height_cm,
                    'height_from_floor_mm' => $level->height_from_floor_mm,
                    'capacity_mm' => $level->capacity_mm,
                    'used_cm' => $usedCm,
                    'free_cm' => max(0, round($shelfWidthCm - $usedCm, 2)),
                    'fill_percent' => $fillPercent,
                    'overflow' => $usedCm > $shelfWidthCm + 0.01,
                    'placements' => $placements->all(),
                ];
            })
            ->all();

        $widthCm = (float) ($shelf->width_cm ?: max(1, round(($shelf->width_mm ?? 0) / 10)));

        return [
            'type' => 'shelf',
            'id' => $shelf->id,
            'code' => $shelf->code,
            'name' => $this->localized($shelf->name),
            'width_cm' => $widthCm,
            'width_mm' => $shelf->width_mm ?: (int) round($widthCm * 10),
            'width_m' => round($widthCm / 100, 2),
            'height_mm' => $shelf->height_mm,
            'depth_mm' => $shelf->depth_mm,
            'store_id' => $shelf->store_id,
            'store_name' => $this->localized($shelf->store?->name),
            'department_id' => $shelf->department_id,
            'department_name' => $shelf->department
                ? ($shelf->department->code.' — '.$this->localized($shelf->department->name))
                : null,
            'department_color' => $zoneColor,
            'levels' => $levels,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformCoolerDetail(Cooler $cooler): array
    {
        return [
            'type' => 'cooler',
            'id' => $cooler->id,
            'code' => $cooler->code,
            'name' => $cooler->displayLabel(),
            'width_cm' => max(1, (int) round($cooler->width_mm / 10)),
            'width_mm' => $cooler->width_mm,
            'height_mm' => $cooler->height_mm,
            'depth_mm' => $cooler->depth_mm,
            'door_count' => $cooler->door_count,
            'temperature_zone' => $cooler->temperature_zone,
            'temperature_zone_label' => Cooler::TEMPERATURE_ZONES[$cooler->temperature_zone] ?? $cooler->temperature_zone,
            'store_id' => $cooler->store_id,
            'store_name' => $this->localized($cooler->store?->name),
            'department_name' => $cooler->department
                ? ($cooler->department->code.' — '.$this->localized($cooler->department->name))
                : null,
            'levels' => $cooler->levels->sortByDesc('level_number')->values()->map(fn ($level) => [
                'id' => $level->id,
                'level_number' => $level->level_number,
                'height_cm' => max(1, (int) round($level->capacity_mm / 10)),
                'height_from_floor_mm' => $level->height_from_floor_mm,
                'capacity_mm' => $level->capacity_mm,
                'placements' => [],
            ])->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformStandDetail(Stand $stand): array
    {
        return [
            'type' => 'stand',
            'id' => $stand->id,
            'code' => $stand->code,
            'name' => $stand->displayLabel(),
            'width_cm' => max(1, (int) round($stand->width_mm / 10)),
            'width_mm' => $stand->width_mm,
            'height_mm' => $stand->height_mm,
            'depth_mm' => $stand->depth_mm,
            'stand_type' => $stand->stand_type,
            'stand_type_label' => Stand::STAND_TYPES[$stand->stand_type] ?? $stand->stand_type,
            'has_back' => $stand->has_back,
            'store_id' => $stand->store_id,
            'store_name' => $this->localized($stand->store?->name),
            'department_name' => $stand->department
                ? ($stand->department->code.' — '.$this->localized($stand->department->name))
                : null,
            'levels' => $stand->levels->sortByDesc('level_number')->values()->map(fn ($level) => [
                'id' => $level->id,
                'level_number' => $level->level_number,
                'height_cm' => max(1, (int) round($level->capacity_mm / 10)),
                'height_from_floor_mm' => $level->height_from_floor_mm,
                'capacity_mm' => $level->capacity_mm,
                'placements' => [],
            ])->all(),
        ];
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
                $label = $this->localized($store->name) ?: 'Без названия';
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

    private function localized(mixed $value): string
    {
        if (is_array($value)) {
            return (string) ($value['ru'] ?? $value['en'] ?? '');
        }

        return (string) ($value ?? '');
    }
}
