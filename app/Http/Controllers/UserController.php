<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserCommentRequest;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Department;
use App\Models\Tenant;
use App\Models\User;
use App\Models\UserComment;
use App\Services\FirebaseAuthService;
use App\Services\UserFirebaseSyncService;
use App\Support\Permissions;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Spatie\Activitylog\Models\Activity;
use Spatie\Permission\Models\Role;
use Throwable;

class UserController extends Controller implements HasMiddleware
{
    public function __construct(
        private readonly FirebaseAuthService $firebaseAuth,
        private readonly UserFirebaseSyncService $firebaseSync,
    ) {}

    /**
     * @return list<Middleware>
     */
    public static function middleware(): array
    {
        return [
            new Middleware('permission:'.Permissions::VIEW_USERS, only: ['index', 'show']),
            new Middleware('permission:'.Permissions::CREATE_USERS, only: ['create', 'store']),
            new Middleware('permission:'.Permissions::EDIT_USERS, only: ['edit', 'update', 'storeComment', 'syncFirebase', 'deleteFromFirebase']),
            new Middleware('permission:'.Permissions::BLOCK_USERS, only: ['toggleActive']),
            new Middleware('permission:'.Permissions::DELETE_USERS, only: ['destroy']),
        ];
    }

    public function index(Request $request): Response
    {
        $actor = Auth::user();

        $users = User::query()
            ->with(['tenant:id,name,domain', 'roles:id,name', 'department:id,code,name'])
            ->when(! $actor?->isSuperAdmin(), fn ($query) => $query->where('tenant_id', $actor?->tenant_id))
            ->when($request->filled('role'), function ($query) use ($request): void {
                $query->role($request->string('role')->toString());
            })
            ->when($request->filled('status'), function ($query) use ($request): void {
                $status = $request->string('status')->toString();
                if ($status === 'active') {
                    $query->where('is_active', true);
                } elseif ($status === 'blocked') {
                    $query->where('is_active', false);
                }
            })
            ->when($request->filled('tenant_id') && $actor?->isSuperAdmin(), function ($query) use ($request): void {
                $query->where('tenant_id', $request->string('tenant_id'));
            })
            ->when($request->filled('search'), function ($query) use ($request): void {
                $search = '%'.$request->string('search').'%';
                $query->where(function ($builder) use ($search): void {
                    $builder
                        ->where('name', 'ilike', $search)
                        ->orWhere('email', 'ilike', $search)
                        ->orWhere('phone', 'ilike', $search);
                });
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => $this->transformUser($user));

        return Inertia::render('Users/Index', [
            'users' => $users,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'role' => $request->string('role')->toString(),
                'status' => $request->string('status')->toString(),
                'tenant_id' => $request->string('tenant_id')->toString(),
            ],
            'roles' => $this->rolesForSelect(),
            'tenants' => $this->tenantsForSelect(),
            'departments' => $this->departmentsForSelect(),
            'canManageTenants' => (bool) $actor?->isSuperAdmin(),
            'quota' => $this->userQuotaForActor($actor),
            'firebaseErrorsCount' => User::query()
                ->when(! $actor?->isSuperAdmin(), fn ($query) => $query->where('tenant_id', $actor?->tenant_id))
                ->where('firebase_status', User::FIREBASE_STATUS_ERROR)
                ->count(),
        ]);
    }

    public function create(): Response|RedirectResponse
    {
        $actor = Auth::user();
        $requestedTenant = request()->string('tenant_id')->toString();
        $quota = $this->userQuotaForActor($actor);

        if ($quota && ! $quota['can_add'] && ! $actor?->isSuperAdmin()) {
            return redirect()
                ->route('users.index')
                ->with('error', $quota['message'] ?? 'Лимит пользователей исчерпан.');
        }

        return Inertia::render('Users/Create', [
            'roles' => $this->rolesForSelect(),
            'tenants' => $this->tenantsForSelect(),
            'departments' => $this->departmentsForSelect($requestedTenant ?: $actor?->tenant_id),
            'canManageTenants' => (bool) $actor?->isSuperAdmin(),
            'defaultTenantId' => $actor?->isSuperAdmin()
                ? ($requestedTenant ?: null)
                : $actor?->tenant_id,
            'quota' => $quota,
        ]);
    }

    public function store(StoreUserRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $firebaseWarning = null;

        try {
            $user = DB::transaction(function () use ($data): User {
                $user = User::query()->create([
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'password' => $data['password'],
                    'tenant_id' => $data['tenant_id'] ?? null,
                    'department_id' => $data['role'] === Permissions::ROLE_HEAD
                        ? ($data['department_id'] ?? null)
                        : null,
                    'timezone' => $data['timezone'] ?? 'Europe/Minsk',
                    'locale' => $data['locale'] ?? 'ru',
                    'is_active' => (bool) ($data['is_active'] ?? true),
                    'email_verified_at' => now(),
                    'firebase_status' => User::FIREBASE_STATUS_PENDING,
                ]);

                $user->syncRoles([$data['role']]);

                return $user->fresh(['roles', 'department']) ?? $user;
            });

            try {
                $this->firebaseSync->provision($user, $data['password']);
            } catch (RuntimeException $exception) {
                $firebaseWarning = 'Пользователь создан в панели, но синхронизация с Firebase не удалась: '
                    .$exception->getMessage();
            }
        } catch (Throwable $exception) {
            if ($exception instanceof RuntimeException) {
                return back()->withInput()->with('error', $exception->getMessage());
            }

            throw $exception;
        }

        $user->refresh();

        $message = 'Пользователь создан.';
        if ($user->firebase_status === User::FIREBASE_STATUS_SYNCED) {
            $message .= ' Синхронизирован с Firebase.';
        }

        return redirect()
            ->route('users.show', $user->id)
            ->with('success', $message)
            ->with('warning', $firebaseWarning);
    }

    public function show(string $user): Response
    {
        $model = $this->findManagedUser($user);

        $loginLogs = $model->loginLogs()
            ->limit(10)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'ip_address' => $log->ip_address,
                'user_agent' => $log->user_agent,
                'status' => $log->status,
                'created_at' => $log->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            ])
            ->values()
            ->all();

        $activities = Activity::query()
            ->where('causer_type', User::class)
            ->where('causer_id', $model->id)
            ->latest()
            ->limit(20)
            ->get()
            ->map(fn (Activity $activity) => [
                'id' => $activity->id,
                'description' => $activity->description,
                'event' => $activity->event,
                'subject_type' => class_basename((string) $activity->subject_type),
                'subject_id' => $activity->subject_id,
                'created_at' => $activity->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            ])
            ->values()
            ->all();

        $comments = $model->comments()
            ->with('author:id,name,email')
            ->limit(50)
            ->get()
            ->map(fn (UserComment $comment) => [
                'id' => $comment->id,
                'comment' => $comment->comment,
                'author_name' => $comment->author?->name,
                'author_email' => $comment->author?->email,
                'created_at' => $comment->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            ])
            ->values()
            ->all();

        return Inertia::render('Users/Show', [
            'user' => $this->transformUser($model, detailed: true),
            'loginLogs' => $loginLogs,
            'activities' => $activities,
            'comments' => $comments,
            'firebaseConfigured' => $this->firebaseSync->isConfigured($model->tenant_id),
            'stats' => [
                'logins_total' => $model->loginLogs()->count(),
                'logins_success' => $model->loginLogs()->where('status', 'success')->count(),
                'logins_failed' => $model->loginLogs()->where('status', 'failed')->count(),
                'actions_total' => Activity::query()
                    ->where('causer_type', User::class)
                    ->where('causer_id', $model->id)
                    ->count(),
                'comments_total' => $model->comments()->count(),
                'sessions_active' => $model->sessions()->count(),
            ],
        ]);
    }

    public function edit(string $user): Response
    {
        $model = $this->findManagedUser($user);

        return Inertia::render('Users/Edit', [
            'user' => $this->transformUser($model, detailed: true),
            'roles' => $this->rolesForSelect(),
            'tenants' => $this->tenantsForSelect(),
            'departments' => $this->departmentsForSelect($model->tenant_id),
            'canManageTenants' => (bool) Auth::user()?->isSuperAdmin(),
        ]);
    }

    public function update(UpdateUserRequest $request, string $user): RedirectResponse
    {
        $model = $this->findManagedUser($user);
        $data = $request->validated();
        $passwordChanged = ! empty($data['password']);
        $wasActive = (bool) $model->is_active;
        $activeChanged = array_key_exists('is_active', $data) && (bool) $data['is_active'] !== $wasActive;
        $firebaseWarning = null;

        try {
            DB::transaction(function () use ($model, $data): void {
                $payload = [
                    'name' => $data['name'],
                    'email' => $data['email'],
                    'phone' => $data['phone'] ?? null,
                    'tenant_id' => $data['tenant_id'] ?? null,
                    'department_id' => ($data['role'] ?? null) === Permissions::ROLE_HEAD
                        ? ($data['department_id'] ?? null)
                        : null,
                    'timezone' => $data['timezone'] ?? $model->timezone,
                    'locale' => $data['locale'] ?? $model->locale,
                ];

                if (array_key_exists('is_active', $data)) {
                    $payload['is_active'] = (bool) $data['is_active'];
                }

                if (! empty($data['password'])) {
                    $payload['password'] = $data['password'];
                }

                $model->update($payload);
                $model->syncRoles([$data['role']]);
            });

            $model->refresh()->load(['roles', 'department']);

            try {
                $this->firebaseSync->push(
                    $model,
                    $passwordChanged ? (string) $data['password'] : null,
                    $activeChanged,
                    $wasActive,
                );
            } catch (RuntimeException $exception) {
                $firebaseWarning = 'Данные сохранены, но синхронизация с Firebase не удалась: '
                    .$exception->getMessage();
            }
        } catch (RuntimeException $exception) {
            return back()->withInput()->with('error', $exception->getMessage());
        }

        $message = 'Пользователь обновлён.';
        if ($model->firebase_status === User::FIREBASE_STATUS_SYNCED) {
            $message .= ' Синхронизирован с Firebase.';
        }

        return redirect()
            ->route('users.show', $model->id)
            ->with('success', $message)
            ->with('warning', $firebaseWarning);
    }

    public function destroy(string $user): RedirectResponse
    {
        $model = $this->findManagedUser($user);

        if ($model->id === Auth::id()) {
            return back()->with('error', 'Нельзя удалить собственный аккаунт.');
        }

        try {
            $model->delete();

            $this->firebaseSync->purge($model);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return redirect()
            ->route('users.index')
            ->with('success', 'Пользователь удалён.');
    }

    public function syncFirebase(Request $request, string $id): RedirectResponse
    {
        $model = $this->findManagedUser($id);

        try {
            $this->firebaseSync->syncNow(
                $model,
                $request->filled('password') ? (string) $request->string('password') : null,
            );
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return back()->with('success', 'Пользователь синхронизирован с Firebase.');
    }

    public function deleteFromFirebase(string $id): RedirectResponse
    {
        $model = $this->findManagedUser($id);

        try {
            $this->firebaseSync->removeFromFirebase($model);
        } catch (RuntimeException $exception) {
            return back()->with('error', $exception->getMessage());
        }

        return back()->with('success', 'Пользователь удалён из Firebase.');
    }

    public function toggleActive(string $id): RedirectResponse
    {
        $model = $this->findManagedUser($id);

        if ($model->id === Auth::id()) {
            return back()->with('error', 'Нельзя заблокировать собственный аккаунт.');
        }

        $willBeActive = ! $model->is_active;
        $tenantId = $model->tenant_id;

        try {
            if ($model->firebase_uid && $this->firebaseAuth->isConfigured($tenantId)) {
                if ($willBeActive) {
                    $this->firebaseAuth->enableUser((string) $model->firebase_uid, $tenantId);
                } else {
                    $this->firebaseAuth->disableUser((string) $model->firebase_uid, $tenantId);
                }
            }

            $model->update(['is_active' => $willBeActive]);

            if ($model->firebase_uid) {
                $this->firebaseSync->markSynced($model);
            }
        } catch (RuntimeException $exception) {
            $this->firebaseSync->markError($model);

            return back()->with('error', $exception->getMessage());
        }

        return back()->with(
            'success',
            $model->is_active ? 'Пользователь разблокирован.' : 'Пользователь заблокирован.',
        );
    }

    public function storeComment(StoreUserCommentRequest $request, string $id): RedirectResponse
    {
        $model = $this->findManagedUser($id);

        $model->comments()->create([
            'author_id' => Auth::id(),
            'comment' => $request->validated('comment'),
        ]);

        return redirect()
            ->route('users.show', ['user' => $model->id, 'tab' => 'comments'])
            ->with('success', 'Комментарий добавлен.');
    }

    private function findManagedUser(string $id): User
    {
        $actor = Auth::user();

        $query = User::query()->with(['tenant:id,name,domain', 'roles:id,name', 'department:id,code,name,store_id']);

        if ($actor && ! $actor->isSuperAdmin()) {
            $query->where('tenant_id', $actor->tenant_id);
        }

        return $query->findOrFail($id);
    }

    private function departmentLabel(?Department $department): ?string
    {
        if (! $department) {
            return null;
        }

        $name = is_array($department->name) ? $department->name : [];

        return ($department->code ? $department->code.' — ' : '').($name['ru'] ?? $name['en'] ?? 'Отдел');
    }

    /**
     * @return list<array{id: string, name: string, tenant_id: string|null}>
     */
    private function departmentsForSelect(?string $tenantId = null): array
    {
        $actor = Auth::user();
        $tenantId = $tenantId ?: $actor?->tenant_id;

        return Department::withoutGlobalScopes()
            ->with('store:id,tenant_id,name')
            ->when(
                $tenantId,
                fn ($query) => $query->whereHas('store', fn ($store) => $store->where('tenant_id', $tenantId)),
            )
            ->when(
                ! $tenantId && $actor && ! $actor->isSuperAdmin(),
                fn ($query) => $query->whereRaw('1 = 0'),
            )
            ->orderBy('code')
            ->get()
            ->map(function (Department $department) {
                $name = is_array($department->name) ? $department->name : [];

                return [
                    'id' => $department->id,
                    'tenant_id' => $department->store?->tenant_id,
                    'name' => ($department->code ? $department->code.' — ' : '').($name['ru'] ?? $name['en'] ?? 'Отдел'),
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function transformUser(User $user, bool $detailed = false): array
    {
        $role = $user->roles->first()?->name;

        $data = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $role,
            'tenant_id' => $user->tenant_id,
            'department_id' => $user->department_id,
            'department_name' => $this->departmentLabel($user->department),
            'tenant_name' => $user->tenant?->name,
            'is_active' => (bool) $user->is_active,
            'status_label' => $user->is_active ? 'Активен' : 'Заблокирован',
            'last_login_at' => $user->last_login_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'created_at' => $user->created_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
            'firebase_uid' => $user->firebase_uid,
            'firebase_status' => $user->firebase_status ?? User::FIREBASE_STATUS_PENDING,
            'firebase_synced_at' => $user->firebase_synced_at?->timezone(Auth::user()?->timezone ?? 'UTC')->toIso8601String(),
        ];

        if ($detailed) {
            $data['timezone'] = $user->timezone;
            $data['locale'] = $user->locale;
            $data['tenant_domain'] = $user->tenant?->domain;
        }

        return $data;
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function rolesForSelect(): array
    {
        $actor = Auth::user();

        $roles = Role::query()
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->pluck('name');

        if ($actor && ! $actor->isSuperAdmin()) {
            $roles = $roles->reject(fn (string $name) => $name === Permissions::ROLE_SUPER_ADMIN);
        }

        return $roles
            ->map(fn (string $name) => ['value' => $name, 'label' => $name])
            ->values()
            ->all();
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function tenantsForSelect(): array
    {
        $actor = Auth::user();

        $query = Tenant::query()->orderBy('name');

        if ($actor && ! $actor->isSuperAdmin()) {
            $query->where('id', $actor->tenant_id);
        }

        return $query
            ->get(['id', 'name', 'domain'])
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->id,
                'name' => $tenant->domain
                    ? "{$tenant->name} ({$tenant->domain})"
                    : $tenant->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array{used: int, max: int, remaining: int, can_add: bool, message: string|null}|null
     */
    private function userQuotaForActor(?User $actor): ?array
    {
        if (! $actor?->tenant_id) {
            return null;
        }

        $tenant = Tenant::query()->find($actor->tenant_id);

        if (! $tenant) {
            return null;
        }

        return app(\App\Services\TenantQuotaService::class)->userQuotaSummary($tenant);
    }
}
