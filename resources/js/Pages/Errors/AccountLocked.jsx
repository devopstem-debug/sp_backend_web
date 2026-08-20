import { ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import ErrorPage from '@/Components/ErrorPage';

function formatCountdown(totalSeconds) {
    const safe = Math.max(0, totalSeconds);
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function calculateTimeLeft(lockedUntil) {
    const until = Number(lockedUntil);

    if (!Number.isFinite(until) || until <= 0) {
        return 0;
    }

    return Math.max(0, until - Math.floor(Date.now() / 1000));
}

export default function AccountLocked({ lockedUntil = 0 }) {
    const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(lockedUntil));

    useEffect(() => {
        const timer = setInterval(() => {
            const next = calculateTimeLeft(lockedUntil);
            setTimeLeft(next);

            if (next <= 0) {
                window.location.reload();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [lockedUntil]);

    const label = useMemo(() => formatCountdown(timeLeft), [timeLeft]);

    return (
        <ErrorPage
            title="Слишком много попыток"
            message={`Аккаунт временно заблокирован. Осталось: ${label}`}
            icon={ShieldExclamationIcon}
            color="orange"
            actionLabel="Обновить"
            onAction={() => window.location.reload()}
        >
            <p className="mt-6 font-mono text-5xl font-bold tracking-widest text-orange-300">
                {label}
            </p>
            <p className="mt-2 text-xs text-slate-500">Осталось времени ожидания</p>
        </ErrorPage>
    );
}
