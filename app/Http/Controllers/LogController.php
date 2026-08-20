<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserLoginLog;
use App\Services\SystemLogReader;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class LogController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly SystemLogReader $systemLogs,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware(
                'permission:'.Permissions::VIEW_AUDIT_LOGS.'|'.Permissions::VIEW_LOGIN_LOGS.'|'.Permissions::VIEW_SYSTEM_LOGS,
                only: ['index'],
            ),
            new Middleware('permission:'.Permissions::VIEW_AUDIT_LOGS, only: ['audit']),
            new Middleware('permission:'.Permissions::VIEW_LOGIN_LOGS, only: ['logins']),
            new Middleware('permission:'.Permissions::VIEW_SYSTEM_LOGS, only: ['system', 'clearSystem']),
        ];
    }

    public function index(Request $request): Response
    {
        $tab = $this->resolveTab($request->string('tab')->toString());
        $user = Auth::user();
        $map = [
            'audit' => Permissions::VIEW_AUDIT_LOGS,
            'logins' => Permissions::VIEW_LOGIN_LOGS,
            'system' => Permissions::VIEW_SYSTEM_LOGS,
        ];

        if (! $user?->can($map[$tab])) {
            $tab = collect($map)
                ->filter(fn (string $permission) => $user?->can($permission))
                ->keys()
                ->first() ?? 'audit';
        }

        abort_unless($user?->can($map[$tab] ?? ''), 403);

        return match ($tab) {
            'logins' => $this->logins($request),
            'system' => $this->system($request),
            default => $this->audit($request),
        };
    }

    public function audit(Request $request): Response
    {
        abort_unless(Auth::user()?->can(Permissions::VIEW_AUDIT_LOGS), 403);

        $actor = Auth::user();
        $timezone = $actor?->timezone ?? 'UTC';

        $query = Activity::query()
            ->with(['causer:id,name,email,tenant_id'])
            ->latest('id');

        if ($actor && ! $actor->isSuperAdmin()) {
            $tenantUserIds = User::query()
                ->where('tenant_id', $actor->tenant_id)
                ->pluck('id');

            $query->where(function ($builder) use ($tenantUserIds): void {
                $builder
                    ->whereIn('causer_id', $tenantUserIds)
                    ->orWhereNull('causer_id');
            });
        }

        if ($request->filled('user_id')) {
            $query->where('causer_id', $request->string('user_id'));
        }

        if ($request->filled('event')) {
            $query->where('event', $request->string('event'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to'));
        }

        $logs = $query
            ->paginate(20)
            ->withQueryString()
            ->through(function (Activity $activity) use ($timezone): array {
                $changes = $activity->attribute_changes?->toArray() ?? [];
                $properties = $activity->properties?->toArray() ?? [];

                $attributes = $changes['attributes'] ?? $properties['attributes'] ?? [];
                $old = $changes['old'] ?? $properties['old'] ?? [];

                return [
                    'id' => $activity->id,
                    'description' => $activity->description,
                    'event' => $activity->event,
                    'event_label' => $this->eventLabel($activity->event),
                    'subject_type' => class_basename((string) $activity->subject_type),
                    'subject_id' => $activity->subject_id,
                    'causer_id' => $activity->causer_id,
                    'causer_name' => $activity->causer?->name ?? 'Система',
                    'causer_email' => $activity->causer?->email,
                    'created_at' => $activity->created_at?->timezone($timezone)->toIso8601String(),
                    'changes' => [
                        'attributes' => $attributes,
                        'old' => $old,
                    ],
                ];
            });

        return Inertia::render('Logs/Index', [
            'tab' => 'audit',
            'auditLogs' => $logs,
            'loginLogs' => null,
            'systemLogs' => null,
            'filters' => [
                'user_id' => $request->string('user_id')->toString(),
                'event' => $request->string('event')->toString(),
                'date_from' => $request->string('date_from')->toString(),
                'date_to' => $request->string('date_to')->toString(),
                'status' => '',
                'level' => '',
                'search' => '',
            ],
            'users' => $this->usersForSelect(),
            'events' => $this->eventOptions(),
            'levels' => $this->levelOptions(),
            'can' => $this->logPermissions(),
        ]);
    }

    public function logins(Request $request): Response
    {
        abort_unless(Auth::user()?->can(Permissions::VIEW_LOGIN_LOGS), 403);

        $actor = Auth::user();
        $timezone = $actor?->timezone ?? 'UTC';

        $query = UserLoginLog::query()
            ->with(['user:id,name,email,tenant_id'])
            ->latest('created_at');

        if ($actor && ! $actor->isSuperAdmin()) {
            $query->whereHas('user', fn ($builder) => $builder->where('tenant_id', $actor->tenant_id));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->string('user_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->string('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->string('date_to'));
        }

        $logs = $query
            ->paginate(20)
            ->withQueryString()
            ->through(fn (UserLoginLog $log) => [
                'id' => $log->id,
                'user_id' => $log->user_id,
                'user_name' => $log->user?->name ?? 'Неизвестный',
                'user_email' => $log->user?->email,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'status' => $log->status,
                'created_at' => $log->created_at?->timezone($timezone)->toIso8601String(),
            ]);

        return Inertia::render('Logs/Index', [
            'tab' => 'logins',
            'auditLogs' => null,
            'loginLogs' => $logs,
            'systemLogs' => null,
            'filters' => [
                'user_id' => $request->string('user_id')->toString(),
                'event' => '',
                'date_from' => $request->string('date_from')->toString(),
                'date_to' => $request->string('date_to')->toString(),
                'status' => $request->string('status')->toString(),
                'level' => '',
                'search' => '',
            ],
            'users' => $this->usersForSelect(),
            'events' => $this->eventOptions(),
            'levels' => $this->levelOptions(),
            'can' => $this->logPermissions(),
        ]);
    }

    public function system(Request $request): Response
    {
        abort_unless(Auth::user()?->can(Permissions::VIEW_SYSTEM_LOGS), 403);

        $path = storage_path('logs/laravel.log');
        $level = $request->string('level')->toString();
        $search = $request->string('search')->toString();

        $entries = $this->systemLogs->read(
            $path,
            200,
            $level !== '' ? $level : null,
            $search !== '' ? $search : null,
        );

        return Inertia::render('Logs/Index', [
            'tab' => 'system',
            'auditLogs' => null,
            'loginLogs' => null,
            'systemLogs' => [
                'entries' => $entries,
                'path' => 'storage/logs/laravel.log',
                'total' => count($entries),
                'exists' => file_exists($path),
                'size' => file_exists($path) ? filesize($path) : 0,
            ],
            'filters' => [
                'user_id' => '',
                'event' => '',
                'date_from' => '',
                'date_to' => '',
                'status' => '',
                'level' => $level,
                'search' => $search,
            ],
            'users' => $this->usersForSelect(),
            'events' => $this->eventOptions(),
            'levels' => $this->levelOptions(),
            'can' => $this->logPermissions(),
        ]);
    }

    public function clearSystem(): RedirectResponse
    {
        abort_unless(Auth::user()?->can(Permissions::VIEW_SYSTEM_LOGS), 403);

        $this->systemLogs->clear(storage_path('logs/laravel.log'));

        return redirect()
            ->route('logs.index', ['tab' => 'system'])
            ->with('success', 'Системный лог очищен.');
    }

    /**
     * @return array{audit: bool, logins: bool, system: bool}
     */
    private function logPermissions(): array
    {
        $user = Auth::user();

        return [
            'audit' => (bool) $user?->can(Permissions::VIEW_AUDIT_LOGS),
            'logins' => (bool) $user?->can(Permissions::VIEW_LOGIN_LOGS),
            'system' => (bool) $user?->can(Permissions::VIEW_SYSTEM_LOGS),
        ];
    }

    private function resolveTab(string $tab): string
    {
        return in_array($tab, ['audit', 'logins', 'system'], true) ? $tab : 'audit';
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

    /**
     * @return list<array{value: string, label: string}>
     */
    private function eventOptions(): array
    {
        return [
            ['value' => 'created', 'label' => 'Создание'],
            ['value' => 'updated', 'label' => 'Обновление'],
            ['value' => 'deleted', 'label' => 'Удаление'],
            ['value' => 'restored', 'label' => 'Восстановление'],
        ];
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function levelOptions(): array
    {
        return [
            ['value' => 'ERROR', 'label' => 'ERROR'],
            ['value' => 'WARNING', 'label' => 'WARNING'],
            ['value' => 'INFO', 'label' => 'INFO'],
            ['value' => 'DEBUG', 'label' => 'DEBUG'],
            ['value' => 'CRITICAL', 'label' => 'CRITICAL'],
        ];
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function usersForSelect(): array
    {
        $actor = Auth::user();

        $query = User::query()->orderBy('name');

        if ($actor && ! $actor->isSuperAdmin()) {
            $query->where('tenant_id', $actor->tenant_id);
        }

        return $query
            ->get(['id', 'name', 'email'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => "{$user->name} ({$user->email})",
            ])
            ->values()
            ->all();
    }
}
