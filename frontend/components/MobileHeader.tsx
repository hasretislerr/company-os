'use client';

import React, { useEffect, useState } from 'react';
import { Crown, Sun, Moon, Bell, Search } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import { apiClient } from '@/lib/api';

export default function MobileHeader() {
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const orgId = typeof window !== 'undefined' ? localStorage.getItem('organization_id') : null;
        
        // Sadece hem token hem de orgId varsa istek at
        if (!token || !orgId) return;

        try {
            const data = await apiClient.getUnreadNotificationCount();
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Bildirim sayısı alınırken hata oluştu:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <header className="w-full bg-white border-b border-gray-100 md:hidden shrink-0">
            <div className="px-4 py-3 flex items-center gap-3">
                {/* Search Bar (Now on top) */}
                <div className="flex-1">
                    <GlobalSearch />
                </div>

                {/* Notification Bell (Fixed next to search) */}
                <div className="relative shrink-0">
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className={`p-2 rounded-xl transition-all ${isNotificationOpen ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}
                    >
                        <Bell className="w-6 h-6" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 bg-rose-500 border-2 border-[0D0D17] rounded-full items-center justify-center text-[9px] text-white font-black">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                    <NotificationCenter 
                        isOpen={isNotificationOpen} 
                        onClose={() => setIsNotificationOpen(false)} 
                        onUnreadChange={setUnreadCount} 
                    />
                </div>
            </div>
        </header>
    );
}
