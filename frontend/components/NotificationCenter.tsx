'use client';

import React, { useState, useEffect } from 'react';
import {
    Bell,
    X,
    CheckCheck,
    Calendar,
    Megaphone,
    CheckSquare,
    MessageSquare,
    Clock,
    MoreHorizontal
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onUnreadChange: (count: number) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, onUnreadChange }) => {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = async () => {
        try {
            const data = await apiClient.listNotifications(20);
            setNotifications(data || []);
            const unread = (data || []).filter((n: any) => !n.is_read).length;
            onUnreadChange(unread);
        } catch (error) {
            console.error('Bildirimler alınamadı:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    const markAsRead = async (id: string) => {
        try {
            await apiClient.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            const newUnread = notifications.filter(n => !n.is_read && n.id !== id).length;
            onUnreadChange(newUnread);
        } catch (error) {
            console.error('Bildirim işaretlenemedi:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await apiClient.markAllNotificationsAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            onUnreadChange(0);
        } catch (error) {
            console.error('Tüm bildirimler işaretlenemedi:', error);
        }
    };

    if (!isOpen) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'task': return <CheckSquare className="w-4 h-4 text-blue-600" />;
            case 'announcement': return <Megaphone className="w-4 h-4 text-indigo-600" />;
            case 'meeting': return <Calendar className="w-4 h-4 text-purple-600" />;
            case 'chat': return <MessageSquare className="w-4 h-4 text-green-600" />;
            default: return <Bell className="w-4 h-4 text-gray-600" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'task': return 'bg-blue-50';
            case 'announcement': return 'bg-indigo-50';
            case 'meeting': return 'bg-purple-50';
            case 'chat': return 'bg-green-50';
            default: return 'bg-gray-50';
        }
    };

    return (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200 z-[100]">
            <div className="p-4 border-b border-gray-50 bg-indigo-50/30 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">Bildirim Merkezi</h3>
                    <p className="text-[11px] text-gray-500 font-medium">Son güncellemeler ve uyarılar</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={markAllAsRead}
                        className="p-2 text-indigo-600 hover:bg-white rounded-xl transition-all"
                        title="Tümünü Okundu İşaretle"
                    >
                        <CheckCheck className="w-4 h-4" />
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white rounded-xl transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm text-gray-500">Bildirimler yükleniyor...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                            <Bell className="w-8 h-8 text-gray-500" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">Henüz bildirim yok</h4>
                        <p className="text-xs text-gray-500">Her şey güncel görünüyor!</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-4 flex gap-4 transition-all relative group cursor-pointer hover:bg-gray-50 ${!n.is_read ? 'bg-indigo-50/10' : ''}`}
                                onClick={async () => {
                                    if (!n.is_read) {
                                        await markAsRead(n.id);
                                    }

                                    // Handle redirection
                                    if (n.type === 'chat' && n.reference_id) {
                                        router.push(`/organization/chat?roomId=${n.reference_id}`);
                                        onClose();
                                    } else if (n.type === 'announcement') {
                                        router.push('/announcements');
                                        onClose();
                                    } else if (n.type === 'meeting') {
                                        router.push('/meetings');
                                        onClose();
                                    } else if (n.type === 'task') {
                                        router.push('/tasks');
                                        onClose();
                                    } else if (n.type === 'request') {
                                        router.push('/requests');
                                        onClose();
                                    }
                                }}
                            >
                                <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${getBgColor(n.type)} shadow-sm group-hover:scale-110 transition-transform`}>
                                    {getIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className={`text-sm font-bold truncate ${!n.is_read ? 'text-gray-900' : 'text-gray-600'}`}>
                                            {n.title}
                                        </h4>
                                        <span className="text-[10px] text-gray-500 whitespace-nowrap pt-0.5 flex items-center gap-1 font-medium">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(n.created_at || new Date()), { addSuffix: true, locale: tr })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2 leading-relaxed font-medium">
                                        {n.message}
                                    </p>
                                    {!n.is_read && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAsRead(n.id);
                                            }}
                                            className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                                        >
                                            Okundu işaretle
                                        </button>
                                    )}
                                </div>
                                {!n.is_read && (
                                    <div className="absolute top-4 right-2 w-2 h-2 bg-indigo-600 rounded-full ring-4 ring-white" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                <button
                    onClick={() => console.log('Tüm bildirimler sayfası')}
                    className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                >
                    Tümünü Görüntüle
                </button>
            </div>
        </div>
    );
};

export default NotificationCenter;
