import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import ApplicationLogo from '@/Components/ApplicationLogo';

const colorStyles = {
    red: {
        iconWrap: 'bg-red-500/15 text-red-400 ring-red-500/20',
        code: 'text-red-400/80',
    },
    yellow: {
        iconWrap: 'bg-yellow-500/15 text-yellow-400 ring-yellow-500/20',
        code: 'text-yellow-400/80',
    },
    orange: {
        iconWrap: 'bg-orange-500/15 text-orange-400 ring-orange-500/20',
        code: 'text-orange-400/80',
    },
    purple: {
        iconWrap: 'bg-violet-500/15 text-violet-400 ring-violet-500/20',
        code: 'text-violet-400/80',
    },
    blue: {
        iconWrap: 'bg-sky-500/15 text-sky-400 ring-sky-500/20',
        code: 'text-sky-400/80',
    },
};

export default function ErrorPage({
    code,
    title,
    message,
    icon: Icon,
    color = 'red',
    actionLabel = 'Вернуться на дашборд',
    actionHref = '/dashboard',
    actionMethod,
    onAction,
    children,
}) {
    const tone = colorStyles[color] ?? colorStyles.red;

    const runAction = (event) => {
        if (onAction) {
            event.preventDefault();
            onAction();
            return;
        }

        if (actionMethod === 'post') {
            event.preventDefault();
            router.post(actionHref);
        }
    };

    return (
        <>
            <Head title={title} />

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

                <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl shadow-black/40"
                >
                    <div className="mb-6 flex items-center justify-center gap-2 text-slate-500">
                        <ApplicationLogo className="h-6 w-6 text-indigo-400" />
                        <span className="text-xs font-medium tracking-wide">
                            Smart Planogram
                        </span>
                    </div>

                    {code && (
                        <p className={`mb-3 text-sm font-semibold tracking-[0.2em] ${tone.code}`}>
                            {code}
                        </p>
                    )}

                    <div
                        className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl ring-1 ${tone.iconWrap}`}
                    >
                        <Icon className="h-10 w-10" aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-bold text-white">{title}</h1>
                    <p className="mt-3 text-slate-400">{message}</p>

                    {children}

                    {actionMethod === 'post' || onAction ? (
                        <button
                            type="button"
                            onClick={runAction}
                            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
                        >
                            {actionLabel}
                        </button>
                    ) : (
                        <Link
                            href={actionHref}
                            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-500"
                        >
                            {actionLabel}
                        </Link>
                    )}
                </motion.div>
            </div>
        </>
    );
}
