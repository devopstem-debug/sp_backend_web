import ApplicationLogo from '@/Components/ApplicationLogo';
import ChatWidget from '@/Components/Chat/ChatWidget';
import Dropdown from '@/Components/Dropdown';
import Bell from '@/Components/Notifications/Bell';
import { useCan } from '@/lib/permissions';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BanknotesIcon,
    Bars3Icon,
    BuildingOfficeIcon,
    BuildingStorefrontIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    CircleStackIcon,
    Cog6ToothIcon,
    CreditCardIcon,
    CubeIcon,
    CubeTransparentIcon,
    DocumentTextIcon,
    FireIcon,
    HomeIcon,
    MapIcon,
    ScaleIcon,
    SparklesIcon,
    Squares2X2Icon,
    TableCellsIcon,
    TagIcon,
    TicketIcon,
    UsersIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useMemo, useState } from 'react';

const SECTIONS = [
    { id: 'main', label: 'Главное' },
    { id: 'store', label: 'Работа в магазине' },
    { id: 'data', label: 'Обмен данными' },
    { id: 'people', label: 'Команда' },
    { id: 'billing', label: 'Подписка' },
    { id: 'platform', label: 'Платформа' },
    { id: 'system', label: 'Система' },
];

const navigation = [
    { name: 'Главная', href: '/dashboard', icon: HomeIcon, section: 'main' },
    {
        name: 'Чат',
        href: '/chat',
        icon: ChatBubbleLeftRightIcon,
        chat: true,
        section: 'main',
    },
    {
        name: 'Магазины',
        href: '/stores',
        icon: BuildingStorefrontIcon,
        permission: 'view-stores',
        section: 'store',
        step: 1,
    },
    {
        name: 'Отделы',
        href: '/departments',
        icon: TagIcon,
        permission: 'view-departments',
        section: 'store',
        step: 2,
    },
    {
        name: 'Стеллажи',
        href: '/shelves',
        icon: TableCellsIcon,
        permission: 'view-shelves',
        section: 'store',
        step: 3,
    },
    {
        name: 'Холодильники',
        href: '/coolers',
        icon: FireIcon,
        permission: 'view-coolers',
        section: 'store',
        step: 4,
    },
    {
        name: 'Стойки',
        href: '/stands',
        icon: CubeTransparentIcon,
        permission: 'view-stands',
        section: 'store',
        step: 5,
    },
    {
        name: 'Товары',
        href: '/products',
        icon: CubeIcon,
        permission: 'view-products',
        section: 'store',
        step: 6,
    },
    {
        name: 'Планограммы',
        href: '/planograms',
        icon: Squares2X2Icon,
        permission: 'view-planograms',
        section: 'store',
        step: 7,
    },
    {
        name: 'Карта зала',
        href: '/floor-plan',
        icon: MapIcon,
        permission: 'view-planograms',
        section: 'store',
        step: 8,
    },
    {
        name: 'Импорт',
        href: '/import',
        icon: ArrowUpTrayIcon,
        permission: 'import-products',
        section: 'data',
    },
    {
        name: 'Экспорт',
        href: '/export',
        icon: ArrowDownTrayIcon,
        permission: 'view-export',
        section: 'data',
    },
    {
        name: 'Пользователи',
        href: '/users',
        icon: UsersIcon,
        permission: 'view-users',
        section: 'people',
    },
    {
        name: 'Оплата',
        href: '/billing',
        icon: CreditCardIcon,
        permission: 'manage-billing',
        tenantOnly: true,
        section: 'billing',
    },
    {
        name: 'Арендаторы',
        href: '/tenants',
        icon: BuildingOfficeIcon,
        permission: 'manage-tenants',
        section: 'platform',
    },
    {
        name: 'Тарифы',
        href: '/admin/plans',
        icon: TicketIcon,
        permission: 'manage-plans',
        section: 'platform',
    },
    {
        name: 'Счета',
        href: '/admin/invoices',
        icon: BanknotesIcon,
        permission: 'manage-invoices',
        section: 'platform',
    },
    {
        name: 'Документы',
        href: '/admin/legal',
        icon: ScaleIcon,
        permission: 'manage-legal',
        section: 'platform',
    },
    {
        name: 'База данных',
        href: '/database',
        icon: CircleStackIcon,
        permission: 'manage-database',
        section: 'platform',
    },
    {
        name: 'Аналитика',
        href: '/analytics',
        icon: ChartBarIcon,
        permission: 'view-analytics',
        section: 'system',
    },
    {
        name: 'Логи',
        href: '/logs',
        icon: DocumentTextIcon,
        permission: ['view-audit-logs', 'view-login-logs', 'view-system-logs'],
        section: 'system',
    },
    {
        name: 'Настройки',
        href: '/settings',
        icon: Cog6ToothIcon,
        permission: ['edit-profile', 'edit-security', 'edit-integrations'],
        section: 'system',
    },
];

const MOTIVATION = [
    'Каждая полка — это продажа.',
    'Сегодня идеальный день для точной планограммы.',
    'Порядок на стеллаже приносит порядок в кассе.',
    'Маленький шаг сегодня — ровный магазин завтра.',
    'Вы уже ближе к идеальной выкладке.',
    'Хорошая планограмма работает, пока вы отдыхаете.',
    'Соберите магазин как витрину, которой гордитесь.',
];

function motivationForToday() {
    const day = new Date().getDay();

    return MOTIVATION[day % MOTIVATION.length];
}

function isNavActive(currentUrl, href) {
    const path = currentUrl.split('?')[0];

    if (href === '/dashboard') {
        return path === '/' || path === '/dashboard';
    }

    return path === href || path.startsWith(`${href}/`);
}

function isVisible(item, can, canChat, user) {
    if (item.tenantOnly && !user?.tenant_id) {
        return false;
    }

    if (item.chat) {
        return Boolean(canChat);
    }

    if (!item.permission) {
        return true;
    }

    const permissions = Array.isArray(item.permission)
        ? item.permission
        : [item.permission];

    return can(...permissions);
}

function groupNavigation(items) {
    return SECTIONS.map((section) => ({
        ...section,
        items: items.filter((item) => item.section === section.id),
    })).filter((section) => section.items.length > 0);
}

function SidebarNav({ currentUrl, onNavigate, groups }) {
    let enterIndex = 0;

    return (
        <nav className="sidebar-scroll flex-1 px-3 py-3" aria-label="Основное меню">
            {groups.map((section) => (
                <div key={section.id} className="mb-4 last:mb-1">
                    <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {section.label}
                    </p>
                    <div className="space-y-1">
                        {section.items.map((item) => {
                            const active = isNavActive(currentUrl, item.href);
                            const delay = Math.min(enterIndex, 14) * 45;
                            enterIndex += 1;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onNavigate}
                                    style={{ animationDelay: `${delay}ms` }}
                                    className={clsx(
                                        'sidebar-item-enter group relative flex items-center gap-x-3 overflow-hidden rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200',
                                        active
                                            ? 'sidebar-item-active bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-slate-300 hover:translate-x-0.5 hover:bg-slate-800/90 hover:text-white',
                                    )}
                                >
                                    {active && (
                                        <span className="absolute inset-y-1 left-0 w-1 rounded-full bg-white/80" />
                                    )}
                                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                                        <item.icon
                                            aria-hidden="true"
                                            className={clsx(
                                                'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                                                active
                                                    ? 'text-white'
                                                    : 'text-slate-400 group-hover:text-indigo-300',
                                            )}
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                    {item.step ? (
                                        <span
                                            className={clsx(
                                                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                                active
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-slate-800 text-slate-500 group-hover:bg-indigo-500/20 group-hover:text-indigo-200',
                                            )}
                                        >
                                            {item.step}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function SidebarMotivate() {
    const quote = useMemo(() => motivationForToday(), []);

    return (
        <div className="sidebar-motivate mx-3 mb-4 rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 via-slate-900 to-violet-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-300">
                <SparklesIcon className="h-4 w-4" />
                На сегодня
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{quote}</p>
        </div>
    );
}

function SidebarShell({ currentUrl, onNavigate, groups, extraHeader }) {
    return (
        <>
            {extraHeader}
            <SidebarNav
                currentUrl={currentUrl}
                onNavigate={onNavigate}
                groups={groups}
            />
            <SidebarMotivate />
        </>
    );
}

export default function AdminLayout({ header, children, flush = false }) {
    const { url } = usePage();
    const user = usePage().props.auth?.user;
    const canChat = Boolean(usePage().props.can_chat);
    const can = useCan();
    const canSettings = can(
        'edit-profile',
        'edit-security',
        'edit-integrations',
    );
    const items = navigation.filter((item) =>
        isVisible(item, can, canChat, user),
    );
    const groups = groupNavigation(items);

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div
            className={clsx(
                flush
                    ? 'h-screen overflow-hidden bg-[#0e172b]'
                    : 'min-h-screen bg-[#0e172b]',
            )}
        >
            <div
                className={clsx(
                    'fixed inset-0 z-40 bg-gray-900/80 transition-opacity lg:hidden',
                    sidebarOpen
                        ? 'opacity-100'
                        : 'pointer-events-none opacity-0',
                )}
                onClick={closeSidebar}
                aria-hidden="true"
            />

            <div
                className={clsx(
                    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-slate-900 transition-transform duration-300 ease-in-out lg:hidden',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <SidebarShell
                    currentUrl={url}
                    onNavigate={closeSidebar}
                    groups={groups}
                    extraHeader={
                        <div className="flex h-16 shrink-0 items-center justify-between px-4">
                            <Link
                                href="/dashboard"
                                onClick={closeSidebar}
                                className="flex items-center gap-2"
                            >
                                <ApplicationLogo className="block h-8 w-auto text-white" />
                                <span className="text-sm font-semibold text-white">
                                    Smart Planogram
                                </span>
                            </Link>
                            <button
                                type="button"
                                onClick={closeSidebar}
                                className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none"
                            >
                                <span className="sr-only">Закрыть меню</span>
                                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                            </button>
                        </div>
                    }
                />
            </div>

            <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-slate-900 lg:flex">
                <SidebarShell
                    currentUrl={url}
                    groups={groups}
                    extraHeader={
                        <div className="flex h-16 shrink-0 items-center gap-2 px-6">
                            <Link
                                href="/dashboard"
                                className="flex items-center gap-2"
                            >
                                <ApplicationLogo className="block h-8 w-auto text-white" />
                                <span className="text-sm font-semibold text-white">
                                    Smart Planogram
                                </span>
                            </Link>
                        </div>
                    }
                />
            </aside>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0e172b]/90 backdrop-blur">
                    <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white focus:outline-none lg:hidden"
                            >
                                <span className="sr-only">Открыть меню</span>
                                <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                            </button>

                            {header && (
                                <div className="min-w-0 truncate text-white">
                                    {header}
                                </div>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                            <ChatWidget />
                            <Bell />

                            {user && (
                                <div className="relative">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <span className="inline-flex rounded-md">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-2 rounded-md border border-transparent bg-transparent px-3 py-2 text-sm font-medium leading-4 text-slate-300 transition duration-150 ease-in-out hover:text-white focus:outline-none"
                                                >
                                                    <span className="hidden text-left sm:block">
                                                        <span className="block font-medium text-white">
                                                            {user.name}
                                                        </span>
                                                        <span className="block text-xs text-slate-400">
                                                            {user.email}
                                                        </span>
                                                    </span>
                                                    <span className="sm:hidden">
                                                        {user.name}
                                                    </span>
                                                    <svg
                                                        className="-me-0.5 ms-1 h-4 w-4"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </button>
                                            </span>
                                        </Dropdown.Trigger>

                                        <Dropdown.Content>
                                            <div className="border-b border-slate-800 px-4 py-2 sm:hidden">
                                                <div className="text-sm font-medium text-white">
                                                    {user.name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {user.email}
                                                </div>
                                            </div>
                                            {canSettings && (
                                                <Dropdown.Link
                                                    href={route('settings.index')}
                                                >
                                                    Настройки
                                                </Dropdown.Link>
                                            )}
                                            <Dropdown.Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                            >
                                                Выйти
                                            </Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main
                    className={clsx(
                        flush ? 'h-[calc(100vh-4rem)] overflow-hidden' : 'py-6',
                    )}
                >
                    <div
                        className={clsx(
                            flush ? 'h-full' : 'w-full px-4 sm:px-6 lg:px-8',
                        )}
                    >
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
