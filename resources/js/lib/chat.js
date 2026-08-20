export function axiosErrorMessage(error, fallback = 'Не удалось выполнить запрос') {
    const data = error?.response?.data;

    if (error?.response?.status === 419) {
        return 'Сессия истекла. Обновите страницу.';
    }

    if (error?.response?.status === 401) {
        return 'Нужно войти заново.';
    }

    if (typeof data?.message === 'string' && data.message && data.message !== 'Server Error') {
        return data.message;
    }

    const first = data?.errors && Object.values(data.errors).flat()[0];

    if (typeof first === 'string') {
        return first;
    }

    return fallback;
}

export function formatClock(value) {
    if (!value) {
        return '';
    }

    return new Date(value).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
    });
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

export function formatLastSeen(user, onlineIds = new Set()) {
    if (!user) {
        return 'нет данных';
    }

    if (onlineIds.has(user.id) || user.is_online) {
        return 'в сети';
    }

    const value = user.last_seen_at || user.last_login_at;

    if (!value) {
        return 'ещё не заходил(а)';
    }

    const diffSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);

    if (diffSeconds < 60) {
        return 'был(а) только что';
    }

    const minutes = Math.floor(diffSeconds / 60);

    if (minutes < 60) {
        return `был(а) ${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `был(а) ${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
    }

    const days = Math.floor(hours / 24);

    return `был(а) ${days} ${plural(days, 'день', 'дня', 'дней')} назад`;
}

export function initials(name) {
    return String(name || '?')
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('');
}
