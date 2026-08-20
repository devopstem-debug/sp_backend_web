import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    KeyIcon,
    PuzzlePieceIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const TABS = [
    { id: 'profile', label: 'Профиль', icon: UserCircleIcon, permission: 'edit-profile' },
    { id: 'security', label: 'Безопасность', icon: KeyIcon, permission: 'edit-security' },
    { id: 'integrations', label: 'Интеграции', icon: PuzzlePieceIcon, permission: 'edit-integrations' },
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-red-600">{message}</p>;
}

function inputClass(hasError) {
    return clsx(
        'mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
        hasError
            ? 'border-red-400 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500',
    );
}

function StatusBadge({ status }) {
    const ok = status === 'configured';

    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
                ok
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
            )}
        >
            {ok ? (
                <CheckCircleIcon className="h-3.5 w-3.5" />
            ) : (
                <ExclamationCircleIcon className="h-3.5 w-3.5" />
            )}
            {ok ? 'Настроено' : 'Не настроено'}
        </span>
    );
}

function ProfileTab({ profile, timezones, locales }) {
    const { data, setData, patch, processing, errors } = useForm({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        timezone: profile.timezone || 'UTC',
        locale: profile.locale || 'ru',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('settings.profile.update'), {
            preserveScroll: true,
            onError: () => fireError('Не удалось сохранить профиль.'),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-slate-200">
                        Имя
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        className={inputClass(errors.name)}
                        required
                    />
                    <FieldError message={errors.name} />
                </div>

                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className={inputClass(errors.email)}
                        required
                    />
                    <FieldError message={errors.email} />
                </div>

                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-200">
                        Телефон
                    </label>
                    <input
                        id="phone"
                        type="text"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        className={inputClass(errors.phone)}
                        placeholder="+375..."
                    />
                    <FieldError message={errors.phone} />
                </div>

                <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-slate-200">
                        Часовой пояс
                    </label>
                    <select
                        id="timezone"
                        value={data.timezone}
                        onChange={(e) => setData('timezone', e.target.value)}
                        className={inputClass(errors.timezone)}
                        required
                    >
                        {timezones.map((zone) => (
                            <option key={zone.value} value={zone.value}>
                                {zone.label}
                            </option>
                        ))}
                    </select>
                    <FieldError message={errors.timezone} />
                </div>

                <div>
                    <label htmlFor="locale" className="block text-sm font-medium text-slate-200">
                        Язык
                    </label>
                    <select
                        id="locale"
                        value={data.locale}
                        onChange={(e) => setData('locale', e.target.value)}
                        className={inputClass(errors.locale)}
                        required
                    >
                        {locales.map((locale) => (
                            <option key={locale.value} value={locale.value}>
                                {locale.label}
                            </option>
                        ))}
                    </select>
                    <FieldError message={errors.locale} />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                    {processing ? 'Сохранение…' : 'Сохранить'}
                </button>
            </div>
        </form>
    );
}

function SecurityTab({ security }) {
    const { data, setData, patch, processing, errors, reset } = useForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();
        patch(route('settings.password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: () => fireError('Не удалось сменить пароль.'),
        });
    };

    return (
        <div className="space-y-8">
            <form onSubmit={submit} className="space-y-5" noValidate>
                <h3 className="text-sm font-semibold text-white">Смена пароля</h3>

                <div>
                    <label
                        htmlFor="current_password"
                        className="block text-sm font-medium text-slate-200"
                    >
                        Текущий пароль
                    </label>
                    <input
                        id="current_password"
                        type="password"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        className={inputClass(errors.current_password)}
                        autoComplete="current-password"
                        required
                    />
                    <FieldError message={errors.current_password} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="new_password"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Новый пароль
                        </label>
                        <input
                            id="new_password"
                            type="password"
                            value={data.new_password}
                            onChange={(e) => setData('new_password', e.target.value)}
                            className={inputClass(errors.new_password)}
                            autoComplete="new-password"
                            required
                        />
                        <FieldError message={errors.new_password} />
                    </div>
                    <div>
                        <label
                            htmlFor="new_password_confirmation"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Подтверждение
                        </label>
                        <input
                            id="new_password_confirmation"
                            type="password"
                            value={data.new_password_confirmation}
                            onChange={(e) =>
                                setData('new_password_confirmation', e.target.value)
                            }
                            className={inputClass(errors.new_password_confirmation)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                    >
                        {processing ? 'Сохранение…' : 'Сменить пароль'}
                    </button>
                </div>
            </form>

            <div className="rounded-xl border border-slate-800 bg-[#1a2740] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-white">
                            Двухфакторная аутентификация
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Статус:{' '}
                            <span className="font-medium text-white">
                                {security.two_factor_enabled ? 'Включена' : 'Выключена'}
                            </span>
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-lg border border-slate-700 bg-[#152033] px-4 py-2 text-sm font-medium text-slate-400"
                    >
                        Включить
                    </button>
                </div>
            </div>
        </div>
    );
}

function IntegrationsTab({ integrations }) {
    const { data, setData, post, processing, errors } = useForm({
        firebase_project_id: integrations.firebase?.project_id || '',
        firebase_database_url: integrations.firebase?.database_url || '',
        firebase_credentials: null,
        engine_base_url: integrations.engine?.base_url || '',
        engine_secret_key: '',
        _method: 'patch',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('settings.integrations.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setData('engine_secret_key', '');
                setData('firebase_credentials', null);
            },
            onError: () => fireError('Не удалось сохранить интеграции.'),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-8" noValidate>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">Firebase</h3>
                    <StatusBadge status={integrations.status?.firebase} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="firebase_project_id"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Project ID
                        </label>
                        <input
                            id="firebase_project_id"
                            type="text"
                            value={data.firebase_project_id}
                            onChange={(e) =>
                                setData('firebase_project_id', e.target.value)
                            }
                            className={inputClass(errors.firebase_project_id)}
                        />
                        <FieldError message={errors.firebase_project_id} />
                    </div>
                    <div>
                        <label
                            htmlFor="firebase_database_url"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Database URL
                        </label>
                        <input
                            id="firebase_database_url"
                            type="text"
                            value={data.firebase_database_url}
                            onChange={(e) =>
                                setData('firebase_database_url', e.target.value)
                            }
                            className={inputClass(errors.firebase_database_url)}
                            placeholder="https://...."
                        />
                        <FieldError message={errors.firebase_database_url} />
                    </div>
                    <div className="sm:col-span-2">
                        <label
                            htmlFor="firebase_credentials"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Credentials file
                        </label>
                        <input
                            id="firebase_credentials"
                            type="file"
                            accept=".json,application/json"
                            onChange={(e) =>
                                setData(
                                    'firebase_credentials',
                                    e.target.files?.[0] || null,
                                )
                            }
                            className="mt-1 block w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-500/15 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-300 hover:file:bg-indigo-500/20"
                        />
                        {integrations.firebase?.credentials_uploaded && (
                            <p className="mt-1.5 text-xs text-slate-400">
                                Загружен файл:{' '}
                                {integrations.firebase.credentials_name ||
                                    'firebase-credentials.json'}
                            </p>
                        )}
                        <FieldError message={errors.firebase_credentials} />
                    </div>
                </div>
            </section>

            <section className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white">C++ Движок</h3>
                    <StatusBadge status={integrations.status?.engine} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="engine_base_url"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Base URL
                        </label>
                        <input
                            id="engine_base_url"
                            type="text"
                            value={data.engine_base_url}
                            onChange={(e) => setData('engine_base_url', e.target.value)}
                            className={inputClass(errors.engine_base_url)}
                            placeholder="https://...."
                        />
                        <FieldError message={errors.engine_base_url} />
                    </div>
                    <div>
                        <label
                            htmlFor="engine_secret_key"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Secret key
                        </label>
                        <input
                            id="engine_secret_key"
                            type="password"
                            value={data.engine_secret_key}
                            onChange={(e) =>
                                setData('engine_secret_key', e.target.value)
                            }
                            className={inputClass(errors.engine_secret_key)}
                            placeholder={
                                integrations.engine?.secret_key_set
                                    ? '•••••••• (оставьте пустым, чтобы не менять)'
                                    : 'Секретный ключ'
                            }
                            autoComplete="new-password"
                        />
                        <FieldError message={errors.engine_secret_key} />
                    </div>
                </div>
            </section>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={processing}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                    {processing ? 'Сохранение…' : 'Сохранить'}
                </button>
            </div>
        </form>
    );
}

export default function Index({
    profile,
    tenant = null,
    integrations,
    security,
    timezones = [],
    locales = [],
    can: canTabs = {},
}) {
    const { flash } = usePage().props;
    const can = useCan();
    const visibleTabs = TABS.filter(
        (item) => canTabs[item.id] ?? can(item.permission),
    );

    const initialTab = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const tab = params.get('tab');
            if (visibleTabs.some((item) => item.id === tab)) {
                return tab;
            }
        } catch {
            // ignore
        }
        return visibleTabs[0]?.id || 'profile';
    }, [visibleTabs]);

    const [tab, setTab] = useState(initialTab);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const switchTab = (next) => {
        setTab(next);
        router.get(
            route('settings.index'),
            { tab: next },
            { preserveState: true, replace: true, preserveScroll: true },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Настройки
                </h1>
            }
        >
            <Head title="Настройки" />

            <div className="space-y-6">
                {tenant && (
                    <div className="rounded-xl bg-[#152033] p-4 shadow-sm ring-1 ring-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Tenant
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                            {tenant.name}
                            <span className="ml-2 font-mono text-xs text-slate-400">
                                {tenant.domain}
                            </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                            Статус: {tenant.is_active ? 'активен' : 'неактивен'}
                        </p>
                    </div>
                )}

                <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                    <div className="border-b border-slate-800">
                        <nav className="flex gap-1 overflow-x-auto px-2 py-2 sm:px-4">
                            {visibleTabs.map((item) => {
                                const active = tab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => switchTab(item.id)}
                                        className={clsx(
                                            'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                                            active
                                                ? 'bg-indigo-500/15 text-indigo-300'
                                                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-4 sm:p-6">
                        {tab === 'profile' && (
                            <ProfileTab
                                profile={profile}
                                timezones={timezones}
                                locales={locales}
                            />
                        )}
                        {tab === 'security' && <SecurityTab security={security} />}
                        {tab === 'integrations' && (
                            <IntegrationsTab integrations={integrations} />
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
