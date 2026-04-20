'use client';

import React, { useEffect, useState } from 'react';
import { 
    X, 
    Calendar, 
    MessageSquare, 
    FileText, 
    AlertCircle, 
    Zap,
    Home,
    Megaphone,
    Clock,
    ClipboardCheck,
    Users,
    Activity,
    Target,
    LucideIcon
} from 'lucide-react';
import { decodeToken } from '@/lib/token';
import Link from 'next/link';

interface MobileActionMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ActionItem {
    id: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bg: string;
    href: string;
    role?: string[];
}

export default function MobileActionMenu({ isOpen, onClose }: MobileActionMenuProps) {
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            const payload = decodeToken(token);
            if (payload) {
                setUserRole(payload.role?.toLowerCase() || null);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isAdmin = userRole === 'admin';
    const isManager = ['admin', 'manager', 'müdür', 'yönetici'].includes(userRole || '');

    const actions: ActionItem[] = [
        { id: 'activity', label: 'Aktiviteler', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', href: '/activity' },
        { id: 'calendar', label: 'Takvim', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', href: '/calendar' },
        { id: 'dashboard', label: 'Görevler', icon: Home, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', href: '/tasks' },
        { id: 'announcements', label: 'Duyurular', icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20', href: '/announcements' },
        { id: 'requests', label: 'Talepler', icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', href: '/requests' },
        { id: 'leave', label: 'İzin Talep', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', href: '/leave-requests' },
        { id: 'attendance', label: 'Katılımım', icon: Clock, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/20', href: '/attendance' },
        { id: 'meetings', label: 'Toplantılar', icon: Target, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20', href: '/meetings' },
        // Admin / Manager specific
        { id: 'attendance-manage', label: 'Katılım Yön.', icon: ClipboardCheck, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', href: '/attendance/manage', role: ['admin'] },
        { id: 'members', label: 'Üye Yönetimi', icon: Users, color: 'text-slate-500', bg: 'bg-slate-50 dark:bg-slate-900/20', href: '/organization/members', role: ['admin'] },
        { id: 'activity-tracker', label: 'Aktivite Takip', icon: Activity, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', href: '/activity-tracker', role: ['admin', 'manager'] },
    ];

    const visibleActions = actions.filter(action => {
        if (!action.role) return true;
        if (action.role.includes('admin') && isAdmin) return true;
        if (action.role.includes('manager') && isManager) return true;
        return false;
    });

    return (
        <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center px-4 mb-4">
            {/* Overlay */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            ></div>

            {/* Menu Content */}
            <div className="relative w-full max-w-lg bg-card rounded-[3rem] p-8 pb-10 shadow-2xl animate-in slide-in-from-bottom duration-500 border border-border-custom overflow-hidden">
                {/* Background blur decorative element */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-indigo-500/10 blur-[80px] -z-10"></div>

                {/* Drag Indicator */}
                <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto mb-8"></div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-foreground uppercase tracking-widest">TÜM KATEGORİLER</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Ekosistemi Keşfedin</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-500 hover:text-foreground transition-all active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-2 no-scrollbar">
                    {visibleActions.map((action) => (
                        <Link
                            key={action.id}
                            href={action.href}
                            className="flex flex-col items-center gap-3 p-4 rounded-3xl bg-gray-50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800 border border-border-custom transition-all group active:scale-95"
                            onClick={onClose}
                        >
                            <div className={`w-12 h-12 ${action.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-black/5`}>
                                <action.icon className={`w-6 h-6 ${action.color}`} />
                            </div>
                            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 text-center leading-tight uppercase tracking-tighter line-clamp-2">
                                {action.label}
                            </span>
                        </Link>
                    ))}
                </div>

                {/* Bottom Close Button */}
                <div className="mt-8 pt-4 border-t border-border-custom flex justify-center">
                    <button 
                        onClick={onClose}
                        className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/30 transform active:scale-90 transition-all"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>
            </div>
            
            <style jsx>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
