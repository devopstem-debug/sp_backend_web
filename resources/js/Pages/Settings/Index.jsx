import { Head, router, useForm, usePage } from '@inertiajs/react';
import { KeyIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { useCan } from '@/lib/permissions';
import { fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const TABS = [
    { id: 'profile', label: 'Профиль', icon: UserCircleIcon, permission: 'edit-profile' },
    { id: 'security', label: 'Безопасность', icon: KeyIcon, permission: 'edit-security' },
];

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return <p className="mt-1.5 text-sm text-red-400">{message}</p>;
}

function inputClass(hasError) {
    return clsx(
        'mt-1 block w-full rounded-lg border bg-[#0e172b] px-3 py-2 text-sm text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
        hasError
            ? 'border-red-400/70 focus:border-red-500'
            : 'border-slate-700 focus:border-indigo-500',
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
    const { flash, errors: pageErrors = {} } = usePage().props;
    const setup = flash?.two_factor_setup || null;
    const recoveryCodes = flash?.two_factor_recovery_codes || null;

    const passwordForm = useForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    const confirmForm = useForm({ code: '' });
    const disableForm = useForm({ password: '', code: '' });
    const [showDisable, setShowDisable] = useState(false);

    const submitPassword = (e) => {
        e.preventDefault();
        passwordForm.patch(route('settings.password.update'), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
            onError: () => fireError('Не удалось сменить пароль.'),
        });
    };

    const startTwoFactor = () => {
        router.post(
            route('settings.two-factor.enable'),
            {},
            {
                preserveScroll: true,
                onError: () => fireError('Не удалось начать настройку 2FA.'),
            },
        );
    };

    const confirmTwoFactor = (e) => {
        e.preventDefault();
        confirmForm.post(route('settings.two-factor.confirm'), {
            preserveScroll: true,
            onError: () => fireError('Неверный код подтверждения.'),
        });
    };

    const disableTwoFactor = (e) => {
        e.preventDefault();
        disableForm.post(route('settings.two-factor.disable'), {
            preserveScroll: true,
            onSuccess: () => {
                setShowDisable(false);
                disableForm.reset();
            },
            onError: () => fireError('Не удалось отключить 2FA.'),
        });
    };

    return (
        <div className="space-y-8">
            <form onSubmit={submitPassword} className="space-y-5" noValidate>
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
                        value={passwordForm.data.current_password}
                        onChange={(e) =>
                            passwordForm.setData('current_password', e.target.value)
                        }
                        className={inputClass(passwordForm.errors.current_password)}
                        autoComplete="current-password"
                        required
                    />
                    <FieldError message={passwordForm.errors.current_password} />
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
                            value={passwordForm.data.new_password}
                            onChange={(e) =>
                                passwordForm.setData('new_password', e.target.value)
                            }
                            className={inputClass(passwordForm.errors.new_password)}
                            autoComplete="new-password"
                            required
                        />
                        <FieldError message={passwordForm.errors.new_password} />
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
                            value={passwordForm.data.new_password_confirmation}
                            onChange={(e) =>
                                passwordForm.setData(
                                    'new_password_confirmation',
                                    e.target.value,
                                )
                            }
                            className={inputClass(
                                passwordForm.errors.new_password_confirmation,
                            )}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={passwordForm.processing}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                    >
                        {passwordForm.processing ? 'Сохранение…' : 'Сменить пароль'}
                    </button>
                </div>
            </form>

            <div className="rounded-xl border border-slate-800 bg-[#1a2740] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-white">
                            Двухфакторная аутентификация
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Google Authenticator / Authy / 1Password. Статус:{' '}
                            <span className="font-medium text-white">
                                {security.two_factor_enabled ? 'Включена' : 'Выключена'}
                            </span>
                        </p>
                    </div>
                    {!security.two_factor_enabled && !setup ? (
                        <button
                            type="button"
                            onClick={startTwoFactor}
                            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                            Включить
                        </button>
                    ) : null}
                    {security.two_factor_enabled ? (
                        <button
                            type="button"
                            onClick={() => setShowDisable((value) => !value)}
                            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                        >
                            Отключить
                        </button>
                    ) : null}
                </div>

                {setup ? (
                    <div className="space-y-4 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                        <p className="text-sm text-slate-300">
                            Отсканируйте QR в приложении-аутентификаторе или введите ключ
                            вручную, затем подтвердите 6-значным кодом.
                        </p>
                        <div
                            className="mx-auto w-fit overflow-hidden rounded-xl bg-white p-3"
                            dangerouslySetInnerHTML={{ __html: setup.qr_svg }}
                        />
                        <p className="text-center font-mono text-xs text-slate-300 break-all">
                            {setup.secret}
                        </p>
                        <form onSubmit={confirmTwoFactor} className="flex flex-col gap-3 sm:flex-row">
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="Код из приложения"
                                value={confirmForm.data.code}
                                onChange={(e) => confirmForm.setData('code', e.target.value)}
                                className={inputClass(
                                    confirmForm.errors.code || pageErrors.code,
                                )}
                                required
                            />
                            <button
                                type="submit"
                                disabled={confirmForm.processing}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                            >
                                Подтвердить
                            </button>
                        </form>
                        <FieldError
                            message={confirmForm.errors.code || pageErrors.code}
                        />
                    </div>
                ) : null}

                {Array.isArray(recoveryCodes) && recoveryCodes.length > 0 ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                        <p className="text-sm font-medium text-amber-200">
                            Сохраните recovery-коды в надёжном месте — каждый работает один раз.
                        </p>
                        <ul className="mt-3 grid gap-1 font-mono text-xs text-slate-200 sm:grid-cols-2">
                            {recoveryCodes.map((code) => (
                                <li key={code}>{code}</li>
                            ))}
                        </ul>
                    </div>
                ) : null}

                {showDisable ? (
                    <form onSubmit={disableTwoFactor} className="space-y-3 border-t border-slate-800 pt-4">
                        <p className="text-sm text-slate-400">
                            Для отключения нужны текущий пароль и код 2FA (или recovery-код).
                        </p>
                        <input
                            type="password"
                            placeholder="Текущий пароль"
                            value={disableForm.data.password}
                            onChange={(e) =>
                                disableForm.setData('password', e.target.value)
                            }
                            className={inputClass(disableForm.errors.password)}
                            required
                        />
                        <FieldError message={disableForm.errors.password} />
                        <input
                            type="text"
                            placeholder="Код 2FA"
                            value={disableForm.data.code}
                            onChange={(e) => disableForm.setData('code', e.target.value)}
                            className={inputClass(disableForm.errors.code)}
                            required
                        />
                        <FieldError message={disableForm.errors.code} />
                        <button
                            type="submit"
                            disabled={disableForm.processing}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                        >
                            Подтвердить отключение
                        </button>
                    </form>
                ) : null}
            </div>
        </div>
    );
}

export default function Index({
    profile,
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
                </div>
            </div>
        </AdminLayout>
    );
}
