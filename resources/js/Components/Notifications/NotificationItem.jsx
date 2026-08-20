import {
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const typeMeta = {
    success: {
        icon: CheckCircleIcon,
        wrap: 'bg-emerald-500/15 text-emerald-400',
    },
    info: {
        icon: InformationCircleIcon,
        wrap: 'bg-sky-500/15 text-sky-400',
    },
    warning: {
        icon: ExclamationTriangleIcon,
        wrap: 'bg-amber-500/15 text-amber-400',
    },
    error: {
        icon: XCircleIcon,
        wrap: 'bg-red-500/15 text-red-400',
    },
    chat: {
        icon: ChatBubbleLeftRightIcon,
        wrap: 'bg-indigo-500/15 text-indigo-400',
    },
};

function relativeTime(value) {
    if (!value) {
        return '';
    }

    const diffSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

    if (diffSeconds < 10) {
        return 'только что';
    }

    if (diffSeconds < 60) {
        return `${diffSeconds} сек. назад`;
    }

    const minutes = Math.floor(diffSeconds / 60);
    if (minutes < 60) {
        return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
    }

    const days = Math.floor(hours / 24);

    return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}

function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;

    if (mod10 === 1 && mod100 !== 11) {
        return one;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return few;
    }

    return many;
}

function truncate(text, length = 50) {
    const value = String(text || '');

    if (value.length <= length) {
        return value;
    }

    return `${value.slice(0, length).trim()}…`;
}

export default function NotificationItem({ notification, onClick }) {
    const meta = typeMeta[notification.type] || typeMeta.info;
    const Icon = meta.icon;

    return (
        <button
            type="button"
            onClick={() => onClick(notification)}
            className={clsx(
                'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-800/80',
                !notification.is_read && 'bg-indigo-500/5',
            )}
        >
            <span
                className={clsx(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    meta.wrap,
                )}
            >
                <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white">
                        {notification.title}
                    </span>
                    {!notification.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                    )}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-400">
                    {truncate(notification.message, 50)}
                </span>
                <span className="mt-1 block text-[11px] text-slate-500">
                    {relativeTime(notification.created_at)}
                </span>
            </span>
        </button>
    );
}
