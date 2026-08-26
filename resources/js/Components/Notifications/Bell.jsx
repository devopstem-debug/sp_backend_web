import { BellIcon } from '@heroicons/react/24/outline';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import NotificationItem from '@/Components/Notifications/NotificationItem';
import { fireToast } from '@/lib/swal';

function toastIcon(type) {
    if (type === 'success' || type === 'error' || type === 'warning') {
        return type;
    }

    return 'info';
}

function showBrowserPush(notification) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (window.Notification.permission !== 'granted') {
        return;
    }

    const options = {
        body: notification.message,
        icon: '/images/logo.svg',
        badge: '/images/logo.svg',
        tag: notification.id || `sp-${Date.now()}`,
        data: { url: notification.action_url || '/dashboard' },
        vibrate: [80, 40, 80],
    };

    if (navigator.serviceWorker?.ready) {
        navigator.serviceWorker.ready
            .then((registration) => registration.showNotification(notification.title, options))
            .catch(() => {
                new window.Notification(notification.title, options);
            });

        return;
    }

    new window.Notification(notification.title, options);
}

export default function Bell() {
    const page = usePage();
    const { unread_count: sharedUnread = 0, chat_tenant_id: chatTenantId = null } = page.props;
    const user = page.props.auth?.user;
    const tenantId = user?.tenant_id || chatTenantId;
    const userId = user?.id;

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(Number(sharedUnread) || 0);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const rootRef = useRef(null);

    const loadList = useCallback(async () => {
        setLoading(true);

        try {
            const response = await axios.get('/api/v1/notifications');
            setItems(response.data?.data || []);
            setUnreadCount(Number(response.data?.unread_count ?? 0));
            setLoaded(true);
        } catch {
            // keep previous list
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!window.Echo || !userId) {
            return undefined;
        }

        const handlePayload = (payload) => {
            if (payload.user_id && payload.user_id !== userId) {
                return;
            }

            const incoming = {
                id: payload.id,
                type: payload.type,
                title: payload.title,
                message: payload.message,
                action_url: payload.action_url,
                is_read: Boolean(payload.is_read),
                created_at: payload.created_at,
            };

            setItems((current) => {
                if (current.some((item) => item.id === incoming.id)) {
                    return current;
                }

                return [incoming, ...current].slice(0, 20);
            });

            if (!incoming.is_read) {
                setUnreadCount((current) => current + 1);
            }

            if (incoming.type === 'chat') {
                return;
            }

            fireToast(toastIcon(incoming.type), incoming.title || incoming.message);
            showBrowserPush(incoming);
        };

        const privateChannel = window.Echo.private(`user.${userId}`);
        privateChannel.listen('.notification.created', handlePayload);

        let tenantChannel = null;
        if (tenantId) {
            tenantChannel = window.Echo.channel(`tenant.${tenantId}`);
            tenantChannel.listen('.notification.created', handlePayload);
        }

        return () => {
            window.Echo.leave(`user.${userId}`);
            if (tenantId) {
                window.Echo.leave(`tenant.${tenantId}`);
            }
        };
    }, [tenantId, userId]);

    useEffect(() => {
        const onUnread = (event) => {
            if (typeof event.detail?.unread_count === 'number') {
                setUnreadCount(event.detail.unread_count);
                setItems((current) =>
                    current.map((item) =>
                        item.type === 'chat' ? { ...item, is_read: true } : item,
                    ),
                );
            }
        };

        window.addEventListener('sp:unread-count', onUnread);

        return () => window.removeEventListener('sp:unread-count', onUnread);
    }, []);

    useEffect(() => {
        const onClickOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onClickOutside);

        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const toggle = async () => {
        const nextOpen = !open;
        setOpen(nextOpen);

        if (nextOpen && 'Notification' in window && window.Notification.permission === 'default') {
            window.Notification.requestPermission().catch(() => {});
        }

        if (nextOpen && !loaded) {
            await loadList();
        }
    };

    const markAll = async () => {
        await axios.post('/api/v1/notifications/read-all');
        setItems((current) => current.map((item) => ({ ...item, is_read: true })));
        setUnreadCount(0);
    };

    const openItem = async (notification) => {
        if (!notification.is_read) {
            try {
                const response = await axios.post(
                    `/api/v1/notifications/${notification.id}/read`,
                );
                setUnreadCount(Number(response.data?.unread_count ?? Math.max(0, unreadCount - 1)));
                setItems((current) =>
                    current.map((item) =>
                        item.id === notification.id ? { ...item, is_read: true } : item,
                    ),
                );
            } catch {
                // ignore
            }
        }

        setOpen(false);

        if (notification.type === 'chat') {
            window.dispatchEvent(new CustomEvent('sp:open-chat'));

            return;
        }

        if (notification.action_url) {
            router.visit(notification.action_url);
        }
    };

    const badge = unreadCount > 99 ? '99+' : String(unreadCount);

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={toggle}
                className="relative rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
                aria-label="Уведомления"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-800 bg-[#152033] shadow-2xl shadow-black/40 sm:w-96">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                        <p className="text-sm font-semibold text-white">Уведомления</p>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={markAll}
                                className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                            >
                                Отметить все прочитанными
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 divide-y divide-slate-800 overflow-y-auto">
                        {loading && items.length === 0 && (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">
                                Загрузка…
                            </p>
                        )}
                        {!loading && items.length === 0 && (
                            <p className="px-4 py-8 text-center text-sm text-slate-400">
                                Пока нет уведомлений
                            </p>
                        )}
                        {items.map((item) => (
                            <NotificationItem
                                key={item.id}
                                notification={item}
                                onClick={openItem}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
