<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Cooler;
use App\Models\Department;
use App\Models\Placement;
use App\Models\Product;
use App\Models\Shelf;
use App\Models\Stand;
use App\Models\Store;
use App\Models\User;
use App\Models\UserLoginLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\Models\Activity;

class DashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function build(): array
    {
        $timezone = Auth::user()?->timezone ?? 'UTC';
        $now = Carbon::now('UTC');

        return [
            'stats' => $this->stats(),
            'stores_growth' => $this->weeklyGrowth(Store::query(), $now),
            'products_growth' => $this->weeklyGrowth(Product::query(), $now),
            'products_by_category' => $this->productsByCategory(),
            'shelf_fill_rate' => $this->shelfFillRate(),
            'recent_activity' => $this->recentActivity($timezone),
            'recent_logins' => $this->recentLogins($timezone),
            'activity_by_day' => $this->activityByDay($now, $timezone),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function stats(): array
    {
        return [
            'stores' => Store::query()->count(),
            'departments' => Department::query()->count(),
            'products' => Product::query()->count(),
            'shelves' => Shelf::query()->count(),
            'coolers' => Cooler::query()->count(),
            'stands' => Stand::query()->count(),
            'placements' => Placement::query()->count(),
        ];
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Illuminate\Database\Eloquent\Model>  $query
     * @return array{delta: int, this_week: int, previous_week: int}
     */
    private function weeklyGrowth($query, Carbon $now): array
    {
        $thisWeekStart = $now->copy()->subDays(7);
        $previousWeekStart = $now->copy()->subDays(14);

        $thisWeek = (clone $query)
            ->where('created_at', '>=', $thisWeekStart)
            ->count();

        $previousWeek = (clone $query)
            ->where('created_at', '>=', $previousWeekStart)
            ->where('created_at', '<', $thisWeekStart)
            ->count();

        return [
            'delta' => $thisWeek - $previousWeek,
            'this_week' => $thisWeek,
            'previous_week' => $previousWeek,
        ];
    }

    /**
     * @return list<array{category: string, count: int}>
     */
    private function productsByCategory(): array
    {
        return Product::query()
            ->select('category', DB::raw('COUNT(*) as count'))
            ->groupBy('category')
            ->orderByDesc('count')
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'category' => (string) ($row->category ?: 'Без категории'),
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array{code: string, fillRate: float}>
     */
    private function shelfFillRate(): array
    {
        $shelves = Shelf::query()
            ->with(['levels.placements:id,shelf_level_id,start_cm,end_cm'])
            ->orderBy('code')
            ->limit(12)
            ->get(['id', 'code', 'width_cm', 'shelf_count']);

        return $shelves
            ->map(function (Shelf $shelf): array {
                $levelsCount = max(1, (int) ($shelf->levels->count() ?: $shelf->shelf_count ?: 1));
                $widthCm = max(1, (int) ($shelf->width_cm ?: 0));
                $capacity = $widthCm * $levelsCount;

                $occupied = $shelf->levels->sum(function ($level): float {
                    return $level->placements->sum(function (Placement $placement): float {
                        $start = (float) $placement->start_cm;
                        $end = (float) $placement->end_cm;

                        return max(0, $end - $start);
                    });
                });

                $fillRate = $capacity > 0
                    ? min(100, round(($occupied / $capacity) * 100, 1))
                    : 0.0;

                return [
                    'code' => (string) $shelf->code,
                    'fillRate' => $fillRate,
                ];
            })
            ->sortByDesc('fillRate')
            ->values()
            ->take(8)
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentActivity(string $timezone): array
    {
        $query = Activity::query()
            ->with(['causer:id,name,email'])
            ->latest('id')
            ->limit(8);

        $this->scopeActivityToTenant($query);

        return $query
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'description' => $activity->description,
                'event' => $activity->event,
                'event_label' => $this->eventLabel($activity->event),
                'subject_type' => class_basename((string) $activity->subject_type),
                'causer_name' => $activity->causer?->name ?? 'Система',
                'created_at' => $activity->created_at?->timezone($timezone)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recentLogins(string $timezone): array
    {
        $query = UserLoginLog::query()
            ->with(['user:id,name,email,tenant_id'])
            ->latest('created_at')
            ->limit(8);

        $actor = Auth::user();
        if ($actor && ! $actor->isSuperAdmin()) {
            $query->whereHas('user', fn ($builder) => $builder->where('tenant_id', $actor->tenant_id));
        }

        return $query
            ->get()
            ->map(fn (UserLoginLog $log) => [
                'id' => $log->id,
                'user_name' => $log->user?->name ?? 'Неизвестный',
                'user_email' => $log->user?->email,
                'ip_address' => $log->ip_address,
                'status' => $log->status,
                'created_at' => $log->created_at?->timezone($timezone)->toIso8601String(),
            ])
            ->all();
    }

    /**
     * @return list<array{date: string, count: int}>
     */
    private function activityByDay(Carbon $now, string $timezone): array
    {
        $start = $now->copy()->subDays(6)->startOfDay();

        $query = Activity::query()
            ->where('created_at', '>=', $start);

        $this->scopeActivityToTenant($query);

        /** @var \Illuminate\Support\Collection<string, int> $counts */
        $counts = $query
            ->get(['created_at'])
            ->groupBy(fn (Activity $activity) => $activity->created_at
                ?->timezone($timezone)
                ->format('Y-m-d') ?? '')
            ->map->count();

        $days = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = $now->copy()->timezone($timezone)->subDays($i)->format('Y-m-d');
            $days[] = [
                'date' => $day,
                'count' => (int) ($counts[$day] ?? 0),
            ];
        }

        return $days;
    }

    /**
     * @param  \Illuminate\Database\Eloquent\Builder<\Spatie\Activitylog\Models\Activity>  $query
     */
    private function scopeActivityToTenant($query): void
    {
        $actor = Auth::user();

        if (! $actor || $actor->isSuperAdmin()) {
            return;
        }

        $tenantUserIds = User::query()
            ->where('tenant_id', $actor->tenant_id)
            ->pluck('id');

        $query->where(function ($builder) use ($tenantUserIds): void {
            $builder
                ->whereIn('causer_id', $tenantUserIds)
                ->orWhereNull('causer_id');
        });
    }

    private function eventLabel(?string $event): string
    {
        return match ($event) {
            'created' => 'Создание',
            'updated' => 'Обновление',
            'deleted' => 'Удаление',
            'restored' => 'Восстановление',
            default => $event ?: 'Действие',
        };
    }
}
