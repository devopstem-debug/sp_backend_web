import { Head, usePage } from '@inertiajs/react';
import {
    ArrowLeftIcon,
    ChatBubbleLeftRightIcon,
    PaperAirplaneIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import axios from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { fireToast } from '@/lib/swal';
import {
    axiosErrorMessage,
    formatClock,
    formatLastSeen,
    initials,
} from '@/lib/chat';

export default function ChatIndex() {
    const page = usePage();
    const user = page.props.auth?.user;
    const tenantId = page.props.tenantId || page.props.chat_tenant_id || user?.tenant_id;
    const userId = user?.id;

    const [conversations, setConversations] = useState([]);
    const [colleagues, setColleagues] = useState([]);
    const [onlineIds, setOnlineIds] = useState(() => new Set());
    const [activeId, setActiveId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [body, setBody] = useState('');
    const [loadingList, setLoadingList] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [sending, setSending] = useState(false);
    const listRef = useRef(null);
    const activeIdRef = useRef(null);

    useEffect(() => {
        activeIdRef.current = activeId;
    }, [activeId]);

    const active = useMemo(
        () => conversations.find((item) => item.id === activeId) || null,
        [conversations, activeId],
    );

    const loadLists = useCallback(async () => {
        setLoadingList(true);

        try {
            const [conversationResponse, userResponse] = await Promise.all([
                axios.get('/chat/conversations'),
                axios.get('/chat/users'),
            ]);
            const items = conversationResponse.data?.data || [];
            setConversations(items);
            setColleagues(userResponse.data?.data || []);
            setActiveId((current) => current || items.find((item) => item.type === 'general')?.id || items[0]?.id || null);
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось загрузить чат'));
        } finally {
            setLoadingList(false);
        }
    }, []);

    const loadMessages = useCallback(async (conversationId) => {
        if (!conversationId) {
            return;
        }

        setLoadingThread(true);

        try {
            const response = await axios.get(`/chat/conversations/${conversationId}/messages`);
            setMessages(response.data?.data || []);
            await axios.post(`/chat/conversations/${conversationId}/read`);
            setConversations((current) =>
                current.map((item) =>
                    item.id === conversationId ? { ...item, unread_count: 0 } : item,
                ),
            );
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось загрузить сообщения'));
        } finally {
            setLoadingThread(false);
        }
    }, []);

    useEffect(() => {
        loadLists();
    }, [loadLists]);

    useEffect(() => {
        if (activeId) {
            loadMessages(activeId);
        }
    }, [activeId, loadMessages]);

    useEffect(() => {
        const el = listRef.current;

        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, activeId]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            axios.post('/chat/heartbeat').catch(() => {});
        }, 25_000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!tenantId || !window.Echo) {
            return undefined;
        }

        const tenantChannel = window.Echo.private(`tenant.${tenantId}.chat`);
        tenantChannel.listen('.chat.message.created', (payload) => {
            const incoming = {
                id: payload.id,
                conversation_id: payload.conversation_id,
                tenant_id: payload.tenant_id,
                user_id: payload.user_id,
                user_name: payload.user_name || 'Пользователь',
                body: payload.body,
                created_at: payload.created_at,
            };

            if (incoming.conversation_id === activeIdRef.current) {
                setMessages((current) => {
                    if (current.some((item) => item.id === incoming.id)) {
                        return current;
                    }

                    return [...current, incoming];
                });

                if (incoming.user_id !== userId) {
                    axios.post(`/chat/conversations/${incoming.conversation_id}/read`).catch(() => {});
                }
            } else if (incoming.user_id !== userId) {
                setConversations((current) =>
                    current.map((item) =>
                        item.id === incoming.conversation_id
                            ? {
                                  ...item,
                                  unread_count: (item.unread_count || 0) + 1,
                                  last_message: {
                                      body: incoming.body,
                                      user_name: incoming.user_name,
                                      created_at: incoming.created_at,
                                  },
                              }
                            : item,
                    ),
                );
            }
        });

        const presence = window.Echo.join(`tenant.${tenantId}.presence`);
        presence
            .here((users) => {
                setOnlineIds(new Set(users.map((item) => item.id)));
            })
            .joining((member) => {
                setOnlineIds((current) => new Set([...current, member.id]));
            })
            .leaving((member) => {
                setOnlineIds((current) => {
                    const next = new Set(current);
                    next.delete(member.id);

                    return next;
                });
            });

        return () => {
            window.Echo.leave(`tenant.${tenantId}.chat`);
            window.Echo.leave(`tenant.${tenantId}.presence`);
        };
    }, [tenantId, userId]);

    const openDirect = async (peer) => {
        try {
            const response = await axios.post('/chat/direct', { user_id: peer.id });
            const conversation = response.data?.data;

            if (!conversation) {
                return;
            }

            setConversations((current) => {
                if (current.some((item) => item.id === conversation.id)) {
                    return current.map((item) => (item.id === conversation.id ? conversation : item));
                }

                return [...current, conversation];
            });
            setActiveId(conversation.id);
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось открыть диалог'));
        }
    };

    const send = async (event) => {
        event.preventDefault();

        const text = body.trim();

        if (!text || sending || !activeId) {
            return;
        }

        setSending(true);

        try {
            const response = await axios.post(`/chat/conversations/${activeId}/messages`, {
                body: text,
            });
            setBody('');

            if (response.data?.data) {
                setMessages((current) => {
                    if (current.some((item) => item.id === response.data.data.id)) {
                        return current;
                    }

                    return [...current, response.data.data];
                });
            }
        } catch (error) {
            fireToast('error', axiosErrorMessage(error, 'Не удалось отправить сообщение'));
        } finally {
            setSending(false);
        }
    };

    const general = conversations.find((item) => item.type === 'general');
    const directs = conversations.filter((item) => item.type === 'direct');

    return (
        <AdminLayout
            flush
            header={
                <h2 className="text-lg font-semibold text-white">Чат</h2>
            }
        >
            <Head title="Чат" />

            <div className="flex h-full min-h-0 overflow-hidden border-y border-slate-800 bg-[#0e172b] lg:border-l">
                <aside className={clsx(
                    'flex w-full shrink-0 flex-col border-r border-slate-800 bg-[#152033] sm:w-80',
                    activeId ? 'hidden sm:flex' : 'flex',
                )}>
                    <div className="border-b border-slate-800 px-4 py-3">
                        <p className="text-sm font-semibold text-white">Диалоги</p>
                        <p className="text-xs text-slate-400">Общий чат и личные сообщения</p>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loadingList && (
                            <p className="px-4 py-6 text-sm text-slate-400">Загрузка…</p>
                        )}

                        {general && (
                            <button
                                type="button"
                                onClick={() => setActiveId(general.id)}
                                className={clsx(
                                    'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/80',
                                    activeId === general.id && 'bg-indigo-500/10',
                                )}
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-300">
                                    <UserGroupIcon className="h-5 w-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-white">
                                            Общий чат
                                        </span>
                                        {general.unread_count > 0 && (
                                            <span className="rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                                                {general.unread_count}
                                            </span>
                                        )}
                                    </span>
                                    <span className="block truncate text-xs text-slate-400">
                                        {general.last_message?.body || 'Напишите команде'}
                                    </span>
                                </span>
                            </button>
                        )}

                        <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Коллеги
                        </p>

                        {colleagues.map((peer) => {
                            const conversation = directs.find((item) => item.peer?.id === peer.id);
                            const online = onlineIds.has(peer.id) || peer.is_online;

                            return (
                                <button
                                    key={peer.id}
                                    type="button"
                                    onClick={() =>
                                        conversation ? setActiveId(conversation.id) : openDirect(peer)
                                    }
                                    className={clsx(
                                        'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/80',
                                        conversation && activeId === conversation.id && 'bg-indigo-500/10',
                                    )}
                                >
                                    <span className="relative">
                                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                                            {initials(peer.name)}
                                        </span>
                                        <span
                                            className={clsx(
                                                'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#152033]',
                                                online ? 'bg-emerald-400' : 'bg-slate-500',
                                            )}
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-white">
                                                {peer.name}
                                            </span>
                                            {conversation?.unread_count > 0 && (
                                                <span className="rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                                                    {conversation.unread_count}
                                                </span>
                                            )}
                                        </span>
                                        <span className="block truncate text-xs text-slate-400">
                                            {peer.role} · {formatLastSeen(peer, onlineIds)}
                                        </span>
                                    </span>
                                </button>
                            );
                        })}

                        {!loadingList && colleagues.length === 0 && (
                            <p className="px-4 py-4 text-sm text-slate-400">
                                Пока нет других сотрудников
                            </p>
                        )}
                    </div>
                </aside>

                <section className={clsx('min-w-0 flex-1 flex-col', activeId ? 'flex' : 'hidden sm:flex')}>
                    {active ? (
                        <>
                            <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-3">
                                <button
                                    type="button"
                                    className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white sm:hidden"
                                    onClick={() => setActiveId(null)}
                                    aria-label="Назад к списку"
                                >
                                    <ArrowLeftIcon className="h-5 w-5" />
                                </button>
                                <div>
                                    <p className="text-sm font-semibold text-white">{active.title}</p>
                                    <p className="text-xs text-slate-400">
                                        {active.type === 'general'
                                            ? `${onlineIds.size} сейчас в чате`
                                            : formatLastSeen(active.peer, onlineIds)}
                                    </p>
                                </div>
                            </div>

                            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
                                {loadingThread && messages.length === 0 && (
                                    <p className="py-8 text-center text-sm text-slate-400">Загрузка…</p>
                                )}
                                {!loadingThread && messages.length === 0 && (
                                    <p className="py-8 text-center text-sm text-slate-400">
                                        Пока нет сообщений
                                    </p>
                                )}
                                {messages.map((item) => {
                                    const mine = item.user_id === userId;

                                    return (
                                        <div
                                            key={item.id}
                                            className={clsx('flex', mine ? 'justify-end' : 'justify-start')}
                                        >
                                            <div
                                                className={clsx(
                                                    'max-w-[75%] rounded-2xl px-3 py-2',
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
                                className="flex items-end gap-2 border-t border-slate-800 p-4"
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
                                    className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                                />
                                <button
                                    type="submit"
                                    disabled={sending || !body.trim()}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label="Отправить"
                                >
                                    <PaperAirplaneIcon className="h-5 w-5" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
                            <ChatBubbleLeftRightIcon className="h-10 w-10" />
                            <p>Выберите диалог слева</p>
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
