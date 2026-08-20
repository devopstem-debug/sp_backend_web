import { Head, useForm, usePage } from '@inertiajs/react';
import {
    EnvelopeIcon,
    EyeIcon,
    EyeSlashIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { fireError, fireSuccess } from '@/lib/swal';

const LOCKOUT_STORAGE_KEY = 'sp_login_lockout_until';

function formatCountdown(totalSeconds) {
    const safe = Math.max(0, totalSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function readStoredLockoutUntil() {
    try {
        const raw = window.sessionStorage.getItem(LOCKOUT_STORAGE_KEY);
        const value = raw ? Number(raw) : 0;

        return Number.isFinite(value) && value > Date.now() / 1000 ? value : null;
    } catch {
        return null;
    }
}

function persistLockoutUntil(until) {
    try {
        if (until && until > Date.now() / 1000) {
            window.sessionStorage.setItem(LOCKOUT_STORAGE_KEY, String(until));
        } else {
            window.sessionStorage.removeItem(LOCKOUT_STORAGE_KEY);
        }
    } catch {
        // ignore storage errors
    }
}

export default function Login({ status }) {
    const page = usePage();
    const sharedLockoutUntil = page.props.loginLockoutUntil ?? null;

    const [showPassword, setShowPassword] = useState(false);
    const [lockoutUntil, setLockoutUntil] = useState(() => {
        return sharedLockoutUntil || readStoredLockoutUntil();
    });
    const [nowTs, setNowTs] = useState(() => Math.floor(Date.now() / 1000));

    const { data, setData, post, processing, errors, reset, clearErrors } =
        useForm({
            email: '',
            password: '',
            remember: false,
        });

    const lockoutSecondsLeft = useMemo(() => {
        if (!lockoutUntil) {
            return 0;
        }

        return Math.max(0, lockoutUntil - nowTs);
    }, [lockoutUntil, nowTs]);

    const isLocked = lockoutSecondsLeft > 0;

    useEffect(() => {
        if (sharedLockoutUntil && sharedLockoutUntil > Math.floor(Date.now() / 1000)) {
            setLockoutUntil(sharedLockoutUntil);
            persistLockoutUntil(sharedLockoutUntil);
        }
    }, [sharedLockoutUntil]);

    useEffect(() => {
        if (!isLocked) {
            persistLockoutUntil(null);
            return undefined;
        }

        persistLockoutUntil(lockoutUntil);

        const timer = window.setInterval(() => {
            setNowTs(Math.floor(Date.now() / 1000));
        }, 250);

        return () => window.clearInterval(timer);
    }, [isLocked, lockoutUntil]);

    useEffect(() => {
        if (lockoutUntil && lockoutSecondsLeft <= 0) {
            setLockoutUntil(null);
            persistLockoutUntil(null);
            fireSuccess('Блокировка снята. Можно войти снова.');
        }
    }, [lockoutSecondsLeft, lockoutUntil]);

    const activateLockout = (seconds) => {
        const duration = Math.max(1, Number(seconds) || 900);
        const until = Math.floor(Date.now() / 1000) + duration;

        setLockoutUntil(until);
        setNowTs(Math.floor(Date.now() / 1000));
        persistLockoutUntil(until);
    };

    const submit = (e) => {
        e.preventDefault();
        clearErrors();

        if (isLocked) {
            fireError(
                `Вход заблокирован. Осталось ${formatCountdown(lockoutSecondsLeft)}.`,
            );
            return;
        }

        if (!data.email.trim() || !data.password) {
            fireError('Введите email и пароль.');
            return;
        }

        post(route('login'), {
            onFinish: () => reset('password'),
            onError: (formErrors) => {
                const seconds = Number(formErrors.lockout_seconds || 0);
                const locked =
                    formErrors.locked === '1' ||
                    formErrors.locked === 1 ||
                    seconds > 0;

                fireError(
                    formErrors.email ||
                        formErrors.password ||
                        'Не удалось войти. Проверьте данные.',
                );

                if (locked) {
                    activateLockout(seconds || 900);
                }
            },
        });
    };

    return (
        <>
            <Head title="Вход" />

            <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e172b] px-4 py-10">
                <div
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute -right-24 bottom-1/4 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
                    aria-hidden="true"
                />
                <div
                    className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
                    aria-hidden="true"
                />
 
                {isLocked && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0e172b]/90 px-6 backdrop-blur-md">
                        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900 p-8 text-center shadow-2xl shadow-black/50">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                                <LockClosedIcon className="h-8 w-8" />
                            </div>
                            <h2 className="text-xl font-semibold text-white">
                                Вход заблокирован
                            </h2>
                            <p className="mt-2 text-sm text-slate-400">
                                Слишком много неудачных попыток. Подождите,
                                пока таймер не закончится.
                            </p>
                            <p className="mt-6 font-mono text-5xl font-bold tracking-widest text-amber-300">
                                {formatCountdown(lockoutSecondsLeft)}
                            </p>
                            <p className="mt-3 text-xs text-slate-500">
                                Осталось времени ожидания
                            </p>
                        </div>
                    </div>
                )}

                <div
                    className={`relative w-[90%] max-w-md ${isLocked ? 'pointer-events-none select-none blur-[2px]' : ''}`}
                >
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30">
                            <ApplicationLogo className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                            Smart Planogram
                        </h1>
                        <p className="mt-2 text-sm text-slate-400">
                            Control Center — вход в систему
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
                        {status && (
                            <div className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-5" noValidate>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 block text-sm font-medium text-slate-300"
                                >
                                    Email
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                        <EnvelopeIcon
                                            className="h-5 w-5 text-slate-500"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        autoComplete="username"
                                        autoFocus
                                        disabled={isLocked || processing}
                                        placeholder="you@company.com"
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        className={`block w-full rounded-xl border bg-[#0e172b]/60 py-3 pl-11 pr-4 text-sm text-white placeholder:text-slate-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 ${
                                            errors.email
                                                ? 'border-red-500/60 focus:border-red-500'
                                                : 'border-slate-700 focus:border-indigo-500'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="mb-1.5 block text-sm font-medium text-slate-300"
                                >
                                    Пароль
                                </label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                        <LockClosedIcon
                                            className="h-5 w-5 text-slate-500"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        disabled={isLocked || processing}
                                        placeholder="••••••••"
                                        onChange={(e) =>
                                            setData('password', e.target.value)
                                        }
                                        className={`block w-full rounded-xl border bg-[#0e172b]/60 py-3 pl-11 pr-12 text-sm text-white placeholder:text-slate-600 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50 ${
                                            errors.password
                                                ? 'border-red-500/60 focus:border-red-500'
                                                : 'border-slate-700 focus:border-indigo-500'
                                        }`}
                                    />
                                    <button
                                        type="button"
                                        disabled={isLocked || processing}
                                        onClick={() =>
                                            setShowPassword((prev) => !prev)
                                        }
                                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 transition hover:text-slate-300 disabled:opacity-50"
                                        aria-label={
                                            showPassword
                                                ? 'Скрыть пароль'
                                                : 'Показать пароль'
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <EyeIcon
                                                className="h-5 w-5"
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        disabled={isLocked || processing}
                                        onChange={(e) =>
                                            setData(
                                                'remember',
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 rounded border-slate-600 bg-[#0e172b] text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 disabled:opacity-50"
                                    />
                                    <span className="text-sm text-slate-400">
                                        Запомнить меня
                                    </span>
                                </label>

                                <span
                                    className="cursor-not-allowed text-sm text-slate-500 opacity-60"
                                    title="Скоро будет доступно"
                                    aria-disabled="true"
                                >
                                    Забыли пароль?
                                </span>
                            </div>

                            <button
                                type="submit"
                                disabled={processing || isLocked}
                                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-500 hover:to-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {processing ? (
                                    <>
                                        <svg
                                            className="h-5 w-5 animate-spin text-white"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            />
                                        </svg>
                                        <span>Вход…</span>
                                    </>
                                ) : (
                                    <span>Войти</span>
                                )}
                            </button>
                        </form>
                    </div>

                    <p className="mt-6 text-center text-sm text-slate-400">
                        <a href="/plans" className="text-indigo-300 hover:text-indigo-200">
                            Тарифы
                        </a>
                        <span className="mx-2 text-slate-600">·</span>
                        <a href="/oferta" className="text-indigo-300 hover:text-indigo-200">
                            Оферта
                        </a>
                        <span className="mx-2 text-slate-600">·</span>
                        <a href="/privacy-policy" className="text-indigo-300 hover:text-indigo-200">
                            Конфиденциальность
                        </a>
                    </p>
                    <p className="mt-6 text-center text-xs text-slate-500">
                        ©{new Date().getFullYear()} Smart Planogram Control
                        Center | Created by DevOpsTem
                    </p>
                </div>
            </div>
        </>
    );
}
