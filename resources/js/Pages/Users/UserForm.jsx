import { Link } from '@inertiajs/react';
import { useEffect } from 'react';

const ROLE_HEAD = 'Заведующий';

const ROLES_REQUIRING_TENANT = [
    'Заместитель',
    'Заведующий',
    'Программист',
    'Мерчандайзер',
];

const TIMEZONE_OPTIONS = [
    { value: 'Europe/Minsk', label: 'Europe/Minsk' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/Moscow', label: 'Europe/Moscow' },
];

const LOCALE_OPTIONS = [
    { value: 'ru', label: 'Русский' },
    { value: 'en', label: 'English' },
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-red-600">{message}</p>;
}

function inputClass(hasError) {
    return `mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
        hasError
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500'
    }`;
}

export function roleNeedsTenant(role) {
    return ROLES_REQUIRING_TENANT.includes(role);
}

export function isSuperAdminRole(role) {
    return role === 'Super Admin';
}

export function buildUserFormData(user = null, defaults = {}) {
    return {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: user?.phone ?? '',
        password: '',
        role: user?.role ?? defaults.role ?? '',
        tenant_id:
            user?.tenant_id ??
            defaults.tenant_id ??
            defaults.defaultTenantId ??
            '',
        department_id: user?.department_id ?? '',
        is_active: user?.is_active ?? defaults.is_active ?? true,
        timezone: user?.timezone ?? defaults.timezone ?? 'Europe/Minsk',
        locale: user?.locale ?? defaults.locale ?? 'ru',
    };
}

export function validateUserForm(data, { requirePassword = false } = {}) {
    const errors = {};

    if (!String(data.name || '').trim()) {
        errors.name = 'Укажите имя.';
    }

    const email = String(data.email || '').trim();
    if (!email) {
        errors.email = 'Укажите email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Некорректный email.';
    }

    if (requirePassword) {
        const password = String(data.password || '');
        if (!password) {
            errors.password = 'Укажите пароль.';
        } else if (password.length < 8) {
            errors.password = 'Пароль должен быть не короче 8 символов.';
        }
    } else if (data.password && String(data.password).length < 8) {
        errors.password = 'Пароль должен быть не короче 8 символов.';
    }

    if (!data.role) {
        errors.role = 'Выберите роль.';
    }

    if (roleNeedsTenant(data.role) && !data.tenant_id) {
        errors.tenant_id = 'Выберите арендатора.';
    }

    if (data.role === ROLE_HEAD && !data.department_id) {
        errors.department_id = 'Выберите отдел для заведующего.';
    }

    if (data.phone && String(data.phone).trim().length > 20) {
        errors.phone = 'Телефон не длиннее 20 символов.';
    }

    return errors;
}

export default function UserForm({
    data,
    setData,
    errors = {},
    clientErrors = {},
    processing = false,
    roles = [],
    tenants = [],
    departments = [],
    canManageTenants = false,
    requirePassword = false,
    submitLabel = 'Сохранить',
    onSubmit,
    cancelHref,
}) {
    const err = (key) => clientErrors[key] || errors[key];
    const superAdmin = isSuperAdminRole(data.role);
    const showTenant =
        !superAdmin &&
        (canManageTenants || roleNeedsTenant(data.role) || tenants.length > 0);
    const tenantReadonly = !canManageTenants && !superAdmin;
    const showDepartment = data.role === ROLE_HEAD;
    const departmentsForTenant = departments.filter(
        (department) =>
            !data.tenant_id || department.tenant_id === data.tenant_id,
    );

    useEffect(() => {
        if (
            tenantReadonly &&
            !data.tenant_id &&
            tenants.length === 1 &&
            tenants[0]?.id
        ) {
            setData('tenant_id', tenants[0].id);
        }
    }, [tenantReadonly, data.tenant_id, tenants, setData]);

    const handleRoleChange = (value) => {
        if (isSuperAdminRole(value)) {
            setData((current) => ({
                ...current,
                role: value,
                tenant_id: '',
                department_id: '',
            }));
            return;
        }

        setData((current) => ({
            ...current,
            role: value,
            department_id: value === ROLE_HEAD ? current.department_id : '',
        }));
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
            <div className="rounded-xl bg-[#152033] p-6 shadow-sm ring-1 ring-slate-800">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Имя
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className={inputClass(err('name'))}
                            placeholder="Иван Иванов"
                            required
                            autoComplete="name"
                        />
                        <FieldError message={err('name')} />
                    </div>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className={inputClass(err('email'))}
                            placeholder="user@example.com"
                            required
                            autoComplete="email"
                        />
                        <FieldError message={err('email')} />
                    </div>

                    <div>
                        <label
                            htmlFor="phone"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Телефон
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={data.phone || ''}
                            onChange={(e) => setData('phone', e.target.value)}
                            className={inputClass(err('phone'))}
                            placeholder="+375…"
                            autoComplete="tel"
                        />
                        <FieldError message={err('phone')} />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Пароль
                            {!requirePassword && (
                                <span className="ml-1 font-normal text-slate-400">
                                    (оставьте пустым, чтобы не менять)
                                </span>
                            )}
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className={inputClass(err('password'))}
                            required={requirePassword}
                            autoComplete={
                                requirePassword
                                    ? 'new-password'
                                    : 'new-password'
                            }
                            placeholder={
                                requirePassword
                                    ? 'Минимум 8 символов'
                                    : 'Новый пароль (необязательно)'
                            }
                        />
                        <FieldError message={err('password')} />
                    </div>

                    <div>
                        <label
                            htmlFor="role"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Роль
                        </label>
                        <select
                            id="role"
                            value={data.role}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className={inputClass(err('role'))}
                            required
                        >
                            <option value="">Выберите роль</option>
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('role')} />
                    </div>

                    {showTenant && (
                        <div>
                            <label
                                htmlFor="tenant_id"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Арендатор
                            </label>
                            {tenantReadonly ? (
                                <input
                                    type="text"
                                    readOnly
                                    value={
                                        tenants.find(
                                            (t) => t.id === data.tenant_id,
                                        )?.name ||
                                        tenants[0]?.name ||
                                        '—'
                                    }
                                    className={`${inputClass(false)} cursor-not-allowed bg-[#1a2740] text-slate-300`}
                                />
                            ) : (
                                <select
                                    id="tenant_id"
                                    value={data.tenant_id || ''}
                                    onChange={(e) =>
                                        setData('tenant_id', e.target.value)
                                    }
                                    className={inputClass(err('tenant_id'))}
                                    required={roleNeedsTenant(data.role)}
                                >
                                    <option value="">
                                        Выберите арендатора
                                    </option>
                                    {tenants.map((tenant) => (
                                        <option
                                            key={tenant.id}
                                            value={tenant.id}
                                        >
                                            {tenant.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <FieldError message={err('tenant_id')} />
                        </div>
                    )}

                    {showDepartment && (
                        <div>
                            <label
                                htmlFor="department_id"
                                className="block text-sm font-medium text-slate-200"
                            >
                                Отдел
                            </label>
                            <select
                                id="department_id"
                                value={data.department_id || ''}
                                onChange={(e) =>
                                    setData('department_id', e.target.value)
                                }
                                className={inputClass(err('department_id'))}
                                required
                            >
                                <option value="">Выберите отдел</option>
                                {departmentsForTenant.map((department) => (
                                    <option
                                        key={department.id}
                                        value={department.id}
                                    >
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                            <FieldError message={err('department_id')} />
                        </div>
                    )}

                    {superAdmin && (
                        <div className="sm:col-span-2">
                            <p className="rounded-lg bg-[#0e172b] px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                                Роль Super Admin не привязана к арендатору.
                            </p>
                        </div>
                    )}

                    <div>
                        <label
                            htmlFor="timezone"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Часовой пояс
                        </label>
                        <select
                            id="timezone"
                            value={data.timezone || 'Europe/Minsk'}
                            onChange={(e) =>
                                setData('timezone', e.target.value)
                            }
                            className={inputClass(err('timezone'))}
                        >
                            {TIMEZONE_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('timezone')} />
                    </div>

                    <div>
                        <label
                            htmlFor="locale"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Язык
                        </label>
                        <select
                            id="locale"
                            value={data.locale || 'ru'}
                            onChange={(e) => setData('locale', e.target.value)}
                            className={inputClass(err('locale'))}
                        >
                            {LOCALE_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <FieldError message={err('locale')} />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-200">
                            <input
                                type="checkbox"
                                checked={Boolean(data.is_active)}
                                onChange={(e) =>
                                    setData('is_active', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                            />
                            Активен
                        </label>
                        <p className="mt-1 text-xs text-slate-400">
                            Неактивные пользователи не могут войти в систему.
                        </p>
                        <FieldError message={err('is_active')} />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <Link
                    href={cancelHref || route('users.index')}
                    className="rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-200 shadow-sm hover:bg-slate-800"
                >
                    Отмена
                </Link>
                <button
                    type="submit"
                    disabled={processing}
                    className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {processing ? 'Сохранение…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
