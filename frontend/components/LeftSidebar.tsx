'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { decodeToken } from '@/lib/token';

interface SidebarModule {
    id: string;
    title: string;
    icon: string;
    badge?: number;
    href: string;
}

export default function LeftSidebar() {
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [counts, setCounts] = useState<any>({});

    const fetchCounts = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) return;

        try {
            const data = await apiClient.getSidebarCounts();
            setCounts(data);
        } catch (error) {
            console.error('Sidebar sayaçları alınamadı:', error);
        }
    };

    useEffect(() => {
        // JWT token'dan role'u doğrudan oku (en güvenilir kaynak)
        // Token, organizasyon seçimi sonrası imzalanıyor → içinde role claim kesinlikle var
        const token = localStorage.getItem('token');
        if (token) {
            const payload = decodeToken(token);
            if (payload) {
                setUserRole(payload.role || null);
                console.log('[Sidebar] Token role:', payload.role);
            }
        }

        fetchCounts();
        window.addEventListener('refresh-counts', fetchCounts);
        const interval = setInterval(fetchCounts, 60000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refresh-counts', fetchCounts);
        };
    }, []);


    const modules: SidebarModule[] = [
        { id: 'activity', title: 'Aktiviteler', icon: '⚡', href: '/activity' },
        ...(['admin', 'manager', 'müdür', 'yönetici'].includes((userRole || '').toLowerCase()) ? [
            { id: 'activity-tracker', title: 'Mouse Takip', icon: '📊', href: '/activity-tracker' },
        ] : []),
        ...(userRole === 'admin' ? [
            { id: 'members', title: 'Personel Yönetimi', icon: '👥', href: '/organization/members' },
        ] : []),
        { id: 'calendar', title: 'Takvim', icon: '📅', href: '/calendar' },
        { id: 'dashboard', title: 'Görev Dağılımı', icon: '🏠', badge: counts.tasks > 0 ? counts.tasks : undefined, href: '/dashboard' },
        { id: 'announcements', title: 'Duyurular', icon: '📢', badge: counts.announcements > 0 ? counts.announcements : undefined, href: '/announcements' },
        { id: 'chat', title: 'Sohbet', icon: '💬', badge: counts.chat > 0 ? counts.chat : undefined, href: '/organization/chat' },
        { id: 'requests', title: 'Talepler', icon: '🎫', href: '/requests' },

        { id: 'leave', title: 'İzin Talep', icon: '📅', badge: counts.leave_requests > 0 ? counts.leave_requests : undefined, href: '/leave-requests' },
        { id: 'attendance', title: 'Katılımım', icon: '⏰', href: '/attendance' },
        ...(userRole === 'admin' ? [
            { id: 'attendance-manage', title: 'Katılım Yönetimi', icon: '📋', href: '/attendance/manage' },
        ] : []),
        { id: 'meetings', title: 'Toplantılar', icon: '🎯', badge: counts.meetings > 0 ? counts.meetings : undefined, href: '/meetings' },
    ];

    const isActive = (href: string) => {
        return pathname === href;
    };

    return (
        <aside id="guide-sidebar" className="fixed inset-y-0 left-0 z-50 w-80 bg-white border-r border-gray-100 hidden md:flex flex-col flex-shrink-0 pt-6">

            <nav className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
                <div className="space-y-4">
                    {modules.map((module) => (
                        <Link
                            key={module.id}
                            href={module.href}
                            className={`
                                flex items-center justify-between px-5 py-4 rounded-3xl transition-all duration-300 group
                                ${isActive(module.href)
                                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/10'
                                    : 'text-indigo-600 hover:bg-indigo-50 bg-transparent'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`text-xl transition-all ${isActive(module.href) ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}>
                                    {module.icon}
                                </span>
                                <span className={`text-[13px] font-black uppercase tracking-widest ${isActive(module.href) ? 'text-white' : 'text-indigo-900'}`}>
                                    {module.title}
                                </span>
                            </div>
                            {module.badge && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive(module.href) ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {module.badge}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Sidebar Footer */}
            <div className="p-8 border-t border-gray-50">
                <div className="text-[10px] font-black text-gray-300 text-center uppercase tracking-[0.3em]">
                    © 2026
                </div>
            </div>
        </aside>
    );
}
