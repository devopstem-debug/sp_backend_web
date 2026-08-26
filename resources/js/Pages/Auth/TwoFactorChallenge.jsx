import { Head, useForm } from '@inertiajs/react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function TwoFactorChallenge() {
    const { data, setData, post, processing, errors } = useForm({
        code: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('two-factor.login.store'));
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0e172b] px-4 py-10">
            <Head title="Подтверждение входа" />

            <div className="mb-8 flex items-center gap-3">
                <ApplicationLogo className="h-10 w-auto text-white" />
                <span className="text-lg font-semibold text-white">
                    Smart Planogram
                </span>
            </div>

            <div className="w-full max-w-md rounded-2xl bg-[#152033] p-6 shadow-xl ring-1 ring-slate-800 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                    <span className="rounded-xl bg-indigo-500/15 p-2 text-indigo-300">
                        <LockClosedIcon className="h-6 w-6" />
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold text-white">
                            Двухфакторная аутентификация
                        </h1>
                        <p className="text-sm text-slate-400">
                            Введите код из приложения или recovery-код
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4" noValidate>
                    <div>
                        <label
                            htmlFor="code"
                            className="block text-sm font-medium text-slate-200"
                        >
                            Код
                        </label>
                        <input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-slate-700 bg-[#0e172b] px-3 py-2.5 text-sm text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            placeholder="123456"
                            required
                        />
                        {errors.code ? (
                            <p className="mt-1.5 text-sm text-red-400">{errors.code}</p>
                        ) : null}
                    </div>

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                    >
                        {processing ? 'Проверка…' : 'Войти'}
                    </button>
                </form>
            </div>
        </div>
    );
}
