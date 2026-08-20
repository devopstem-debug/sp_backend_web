import { ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { axiosErrorMessage, formatClock } from '@/lib/chat';
import { fireToast } from '@/lib/swal';

export default function ChatWidget() {
    const page = usePage();
    const canChat = Boolean(page.props.can_chat);
    const user = page.props.auth?.user;
    const tenantId = page.props.chat_tenant_id || user?.tenant_id;
    const userId = user?.id;
    const onChatPage = page.url.split('?')[0] === '/chat';

    const [open, setOpen] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [items, setItems] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [body, setBody] = useState('');
    const [unread, setUnread] = useState(0);
    const rootRef = useRef(null);
    const listRef = useRef(null);
    const openRef = useRef(false);

    useEffect(() => {
        openRef.current = open;
    }, [open]);

    const upsertMessage = useCallback((incoming) => {
        setItems((current) => {
            if (current.some((item) => item.id === incoming.id)) {
                return current;
            }

            return [...current, incoming];
        });
    }, []);

    const loadMessages = useCallback(async () => {
        setLoading(true);

        try {
            const response = await axios.get('/chat/conversations');
            const general = (response.data?.data || []).find((item) => item.type === 'general');
            const id = general?.id;

            if (!id) {
                return;
            }

            setConversationId(id);
            setUnread(Number(general.unread_count || 0));

            const messages = await axios.get(`/chat/conversations/${id}/messages`);
            setItems(messages.data?.data || []);
            setLoaded(true);
            await axios.post(`/chat/conversations/${id}/read`);
            setUnread(0);
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось загрузить чат'));
        } finally {
            setLoading(false);
        }
    }, []);

    const openPanel = useCallback(async () => {
        setOpen(true);

        if (!loaded) {
            await loadMessages();
        }
    }, [loaded, loadMessages]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const id = window.requestAnimationFrame(() => {
            if (listRef.current) {
                listRef.current.scrollTop = listRef.current.scrollHeight;
            }
        });

        return () => window.cancelAnimationFrame(id);
    }, [items, open]);

    useEffect(() => {
        if (!canChat || !tenantId || !window.Echo || onChatPage) {
            return undefined;
        }

        const channelName = `tenant.${tenantId}.chat`;
        const channel = window.Echo.private(channelName);

        channel.listen('.chat.message.created', (payload) => {
            const incoming = {
                id: payload.id,
                conversation_id: payload.conversation_id,
                user_id: payload.user_id,
                user_name: payload.user_name || 'Пользователь',
                body: payload.body,
                created_at: payload.created_at,
            };

            if (conversationId && incoming.conversation_id && incoming.conversation_id !== conversationId) {
                if (incoming.user_id !== userId && !openRef.current) {
                    setUnread((current) => current + 1);
                }

                return;
            }

            upsertMessage(incoming);

            if (incoming.user_id === userId) {
                return;
            }

            if (openRef.current) {
                if (incoming.conversation_id) {
                    axios.post(`/chat/conversations/${incoming.conversation_id}/read`).catch(() => {});
                }

                return;
            }

            setUnread((current) => current + 1);
            fireToast('info', `${incoming.user_name}: ${incoming.body}`);
        });

        return () => {
            window.Echo.leave(channelName);
        };
    }, [canChat, conversationId, onChatPage, tenantId, upsertMessage, userId]);

    useEffect(() => {
        const onOpen = () => {
            if (onChatPage) {
                return;
            }

            openPanel();
        };

        window.addEventListener('sp:open-chat', onOpen);

        return () => window.removeEventListener('sp:open-chat', onOpen);
    }, [onChatPage, openPanel]);

    useEffect(() => {
        const onClickOutside = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', onClickOutside);

        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    const send = async (event) => {
        event.preventDefault();

        const text = body.trim();

        if (!text || sending) {
            return;
        }

        setSending(true);

        try {
            let id = conversationId;

            if (!id) {
                const response = await axios.get('/chat/conversations');
                id = (response.data?.data || []).find((item) => item.type === 'general')?.id;
                setConversationId(id || null);
            }

            if (!id) {
                throw new Error('Общий чат ещё не создан');
            }

            const response = await axios.post(`/chat/conversations/${id}/messages`, { body: text });
            setBody('');

            if (response.data?.data) {
                upsertMessage(response.data.data);
            }
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось отправить сообщение'));
        } finally {
            setSending(false);
        }
    };

    if (!canChat || onChatPage) {
        return null;
    }

    const badge = unread > 99 ? '99+' : String(unread);

    return (
        <div className="relative" ref={rootRef}>
            <button
                type="button"
                onClick={() => {
                    if (open) {
                        setOpen(false);

                        return;
                    }

                    openPanel();
                }}
                className="relative rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
                aria-label="Чат"
            >
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
                {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-bold leading-4 text-white">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-50 mt-2 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#152033] shadow-2xl shadow-black/40 sm:w-96">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-white">Общий чат</p>
                            <p className="text-xs text-slate-400">Быстрые сообщения команде</p>
                        </div>
                        <Link
                            href="/chat"
                            className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
                            onClick={() => setOpen(false)}
                        >
                            Открыть
                        </Link>
                    </div>

                    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                        {loading && items.length === 0 && (
                            <p className="px-1 py-8 text-center text-sm text-slate-400">Загрузка…</p>
                        )}
                        {!loading && items.length === 0 && (
                            <p className="px-1 py-8 text-center text-sm text-slate-400">
                                Пока нет сообщений
                            </p>
                        )}
                        {items.map((item) => {
                            const mine = item.user_id === userId;

                            return (
                                <div
                                    key={item.id}
                                    className={clsx('flex', mine ? 'justify-end' : 'justify-start')}
                                >
                                    <div
                                        className={clsx(
                                            'max-w-[80%] rounded-2xl px-3 py-2',
                                            mine
                                                ? 'rounded-br-md bg-indigo-600 text-white'
                                                : 'rounded-bl-md bg-slate-800 text-slate-100',
                                        )}
                                    >
                                        {!mine && (
                                            <p className="mb-0.5 text-[11px] font-medium text-indigo-300">
                                                {item.user_name}
                                            </p>
                                        )}
                                        <p className="whitespace-pre-wrap break-words text-sm leading-5">
                                            {item.body}
                                        </p>
                                        <p
                                            className={clsx(
                                                'mt-1 text-right text-[10px]',
                                                mine ? 'text-indigo-200' : 'text-slate-500',
                                            )}
                                        >
                                            {formatClock(item.created_at)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <form
                        onSubmit={send}
                        className="flex items-end gap-2 border-t border-slate-800 p-3"
                    >
                        <textarea
                            value={body}
                            onChange={(event) => setBody(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    send(event);
                                }
                            }}
                            rows={1}
                            maxLength={2000}
                            placeholder="Написать сообщение…"
                            className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        />
                        <button
                            type="submit"
                            disabled={sending || !body.trim()}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label="Отправить"
                        >
                            <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
