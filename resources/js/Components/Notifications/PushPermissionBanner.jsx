import { BellIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sp.push.permission.dismissed';

export default function PushPermissionBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }

        if (window.Notification.permission !== 'default') {
            return;
        }

        try {
            if (window.localStorage.getItem(STORAGE_KEY) === '1') {
                return;
            }
        } catch {
            // ignore
        }

        setVisible(true);
    }, []);

    if (!visible) {
        return null;
    }

    const allow = async () => {
        try {
            const result = await window.Notification.requestPermission();
            if (result === 'granted') {
                new window.Notification('Уведомления включены', {
                    body: 'Вы будете получать push при новых событиях в Smart Planogram.',
                    icon: '/images/logo.svg',
                });
            }
        } catch {
            // ignore
        } finally {
            setVisible(false);
        }
    };

    const dismiss = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
            // ignore
        }
        setVisible(false);
    };

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
            <div className="pointer-events-auto flex max-w-lg flex-col gap-3 rounded-2xl border border-slate-700 bg-[#152033] p-4 shadow-2xl shadow-black/40 sm:flex-row sm:items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <BellIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                        Включить push-уведомления?
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Браузер покажет всплывающее уведомление, даже если вкладка
                        свёрнута.
                    </p>
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        type="button"
                        onClick={dismiss}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        Позже
                    </button>
                    <button
                        type="button"
                        onClick={allow}
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                        Разрешить
                    </button>
                </div>
            </div>
        </div>
    );
}
