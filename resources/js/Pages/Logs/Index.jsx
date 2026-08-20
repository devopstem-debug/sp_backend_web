import { Head, router, usePage } from '@inertiajs/react';
import {
    ClipboardDocumentListIcon,
    CpuChipIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import AuditLog from '@/Components/Logs/AuditLog';
import LoginLog from '@/Components/Logs/LoginLog';
import SystemLog from '@/Components/Logs/SystemLog';
import AdminLayout from '@/layouts/AdminLayout';
import { fireError, fireSuccess } from '@/lib/swal';
import clsx from 'clsx';

const TABS = [
    { id: 'audit', label: 'Аудит действий', icon: ShieldCheckIcon },
    { id: 'logins', label: 'Логи входа', icon: ClipboardDocumentListIcon },
    { id: 'system', label: 'Системные ошибки', icon: CpuChipIcon },
];

export default function Index({
    tab = 'audit',
    auditLogs = null,
    loginLogs = null,
    systemLogs = null,
    filters = {},
    users = [],
    events = [],
    levels = [],
    can: canTabs = {},
}) {
    const { flash } = usePage().props;
    const visibleTabs = TABS.filter((item) => canTabs[item.id] !== false);
    const [activeTab, setActiveTab] = useState(tab || visibleTabs[0]?.id || 'audit');

    useEffect(() => {
        setActiveTab(tab || 'audit');
    }, [tab]);

    useEffect(() => {
        if (flash?.success) {
            fireSuccess(flash.success);
        }
        if (flash?.error) {
            fireError(flash.error);
        }
    }, [flash]);

    const switchTab = (next) => {
        setActiveTab(next);
        router.get(
            route('logs.index'),
            { tab: next },
            { preserveState: false, replace: true },
        );
    };

    return (
        <AdminLayout
            header={
                <h1 className="text-xl font-semibold leading-tight text-white">
                    Логи
                </h1>
            }
        >
            <Head title="Логи" />

            <div className="overflow-hidden rounded-xl bg-[#152033] shadow-sm ring-1 ring-slate-800">
                <div className="border-b border-slate-800">
                    <nav className="flex gap-1 overflow-x-auto px-2 py-2 sm:px-4">
                        {visibleTabs.map((item) => {
                            const active = activeTab === item.id;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => switchTab(item.id)}
                                    className={clsx(
                                        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                                        active
                                            ? 'bg-indigo-500/15 text-indigo-300'
                                            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 sm:p-6">
                    {activeTab === 'audit' && (
                        <AuditLog
                            logs={auditLogs}
                            filters={filters}
                            users={users}
                            events={events}
                        />
                    )}
                    {activeTab === 'logins' && (
                        <LoginLog
                            logs={loginLogs}
                            filters={filters}
                            users={users}
                        />
                    )}
                    {activeTab === 'system' && (
                        <SystemLog
                            systemLogs={systemLogs}
                            filters={filters}
                            levels={levels}
                        />
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
