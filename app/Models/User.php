<?php

declare(strict_types=1);

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Support\Permissions;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'firebase_uid', 'firebase_synced_at', 'firebase_status', 'password', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at', 'tenant_id', 'department_id', 'phone', 'timezone', 'locale', 'is_active', 'locked_until', 'last_login_at'])]
#[Hidden(['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, HasUuids, LogsActivity, Notifiable, SoftDeletes;

    public const FIREBASE_STATUS_PENDING = 'pending';

    public const FIREBASE_STATUS_SYNCED = 'synced';

    public const FIREBASE_STATUS_ERROR = 'error';

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'last_seen_at' => 'datetime',
            'locked_until' => 'datetime',
            'firebase_synced_at' => 'datetime',
            'two_factor_confirmed_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public const MANAGEMENT_ROLES = [
        Permissions::ROLE_SUPER_ADMIN,
        Permissions::ROLE_DEPUTY,
        Permissions::ROLE_HEAD,
        Permissions::ROLE_PROGRAMMER,
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function loginLogs(): HasMany
    {
        return $this->hasMany(UserLoginLog::class)->latest('created_at');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(UserComment::class)->latest();
    }

    public function authoredComments(): HasMany
    {
        return $this->hasMany(UserComment::class, 'author_id');
    }

    public function sessions(): HasMany
    {
        return $this->hasMany(UserSession::class)->latest('last_activity_at');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class)->latest('created_at');
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ChatMessage::class)->latest('created_at');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(Permissions::ROLE_SUPER_ADMIN, 'web');
    }

    /**
     * Network Manager — роль «Заместитель» (исторически Network Manager).
     */
    public function isNetworkManager(): bool
    {
        return $this->hasRole(Permissions::ROLE_DEPUTY, 'web')
            || $this->hasRole('Network Manager', 'web');
    }

    public function canSetupFloorPlanMap(): bool
    {
        return $this->isSuperAdmin() || $this->isNetworkManager();
    }

    public function isDepartmentHead(): bool
    {
        return $this->hasRole(Permissions::ROLE_HEAD, 'web');
    }

    public function restrictsToOwnDepartment(): bool
    {
        return $this->isDepartmentHead();
    }

    public function ownedDepartmentId(): ?string
    {
        return $this->department_id ? (string) $this->department_id : null;
    }

    public function ownedStoreId(): ?string
    {
        $departmentId = $this->ownedDepartmentId();

        if ($departmentId === null) {
            return null;
        }

        return Department::withoutGlobalScopes()
            ->whereKey($departmentId)
            ->value('store_id');
    }

    /**
     * @return list<string>
     */
    public function permissionNames(): array
    {
        return $this->getAllPermissions()->pluck('name')->values()->all();
    }

    public function isManagement(): bool
    {
        return $this->hasRole(self::MANAGEMENT_ROLES, 'web');
    }

    public function canUseChat(): bool
    {
        return $this->chatTenantId() !== null;
    }

    public function canUseManagementChat(): bool
    {
        return $this->canUseChat();
    }

    public function chatTenantId(): ?string
    {
        if ($this->tenant_id) {
            return (string) $this->tenant_id;
        }

        if (! $this->isSuperAdmin()) {
            return null;
        }

        $id = Tenant::query()
            ->where('is_active', true)
            ->orderBy('created_at')
            ->value('id');

        return $id ? (string) $id : null;
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at !== null && $this->last_seen_at->gte(now()->subMinutes(2));
    }

    public function roleLabel(): string
    {
        return (string) ($this->getRoleNames()->first() ?: 'Пользователь');
    }

    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->logExcept(['password', 'remember_token']);
    }
}
