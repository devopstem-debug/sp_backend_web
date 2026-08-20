import { Head, Link } from '@inertiajs/react';
import ApplicationLogo from '@/Components/ApplicationLogo';

export default function Public({
    title,
    content = null,
    version = null,
    downloadUrl = null,
}) {
    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-[#0e172b] text-white">
                <header className="border-b border-slate-800">
                    <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
                        <Link href="/" className="flex items-center gap-2">
                            <ApplicationLogo className="h-8 w-auto text-white" />
                            <span className="text-sm font-semibold">Smart Planogram</span>
                        </Link>
                        <div className="flex gap-4 text-sm text-slate-300">
                            <Link href={route('legal.oferta')} className="hover:text-white">
                                Оферта
                            </Link>
                            <Link href={route('legal.privacy')} className="hover:text-white">
                                Конфиденциальность
                            </Link>
                        </div>
                    </div>
                </header>
                <main className="mx-auto max-w-3xl px-4 py-10">
                    <h1 className="text-3xl font-semibold">{title}</h1>
                    {version && (
                        <p className="mt-2 text-sm text-slate-400">Версия {version}</p>
                    )}
                    {downloadUrl && (
                        <a
                            href={downloadUrl}
                            className="mt-4 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                            Скачать PDF
                        </a>
                    )}
                    <div className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
                        {content || 'Документ ещё не опубликован.'}
                    </div>
                </main>
            </div>
        </>
    );
}
