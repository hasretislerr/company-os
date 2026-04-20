'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    LogOut,
    User,
    ChevronDown,
    Settings,
    Shield,
    HelpCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { roleMapper } from '@/lib/mappers';
import Link from 'next/link';
import GlobalSearch from './GlobalSearch';
import NotificationCenter from './NotificationCenter';
import { useTour } from '@/context/TourContext';

interface TopNavbarProps {
    userName?: string;
}

export default function TopNavbar({ userName: userNameProp }: TopNavbarProps) {
    const { startTour, stopTour, isActive: isTourActive } = useTour();
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [userName, setUserName] = useState<string>(userNameProp || '');
    const [avatarUrl, setAvatarUrl] = useState<string>('');
    const [userRole, setUserRole] = useState<string>(''); // Default empty

    const updateUserInfo = () => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem('user');
            if (userStr) {
                try {
                    const user = JSON.parse(userStr);
                    setUserName(user.first_name || '');
                    setAvatarUrl(user.avatar_url || '');
                    setUserRole(user.role || '');
                } catch (e) {
                    console.error('Kullanıcı bilgileri okunamadı:', e);
                }
            }
        }
    };

    useEffect(() => {
        updateUserInfo();
        window.addEventListener('storage', updateUserInfo);
        return () => window.removeEventListener('storage', updateUserInfo);
    }, [userNameProp]);

    const fetchUnreadCount = async () => {
        try {
            const data = await apiClient.getUnreadNotificationCount();
            setUnreadCount(data.count);
        } catch (error) {
            console.error('Okunmamış bildirim sayısı alınamadı:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        // Listen for internal refresh events
        window.addEventListener('refresh-counts', fetchUnreadCount);

        // Polling for updates every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refresh-counts', fetchUnreadCount);
        };
    }, []);

    const handleLogout = () => {
        // Aktivite takip ajanına çıkış bildir
        fetch('http://localhost:3100/clear-user', { method: 'POST' })
            .catch(() => { }); // ajan kapalıysa sessiz geç
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('organization_id');
        router.push('/login');
    };


    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setIsProfileOpen(false);
            setIsNotificationOpen(false);
        };
        if (isProfileOpen || isNotificationOpen) {
            window.addEventListener('click', handleClickOutside);
        }
        return () => window.removeEventListener('click', handleClickOutside);
    }, [isProfileOpen, isNotificationOpen]);

    return (
        <header className="bg-white/50 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40 hidden md:block">
            <div className="max-w-screen-2xl mx-auto px-8 h-24 flex items-center justify-between">
                {/* Search integrated with new design */}
                <div className="flex-1 max-w-sm">
                    <GlobalSearch />
                </div>

                {/* Right Actions - Clean and Premium */}
                <div className="flex items-center gap-6">
                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsNotificationOpen(!isNotificationOpen);
                                setIsProfileOpen(false);
                            }}
                            className={`relative w-12 h-12 rounded-2xl transition-all flex items-center justify-center ${isNotificationOpen ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-amber-50 text-amber-500 hover:bg-amber-100 hover:text-amber-600 border border-amber-100/50'
                                }`}
                        >
                            <Bell className={`w-5 h-5 ${!isNotificationOpen ? 'fill-amber-500/10' : ''}`} />
                            {unreadCount > 0 && (
                                <span className={`absolute -top-1 -right-1 flex h-5 w-5 border-2 border-white rounded-full items-center justify-center text-[10px] font-black text-white ${isNotificationOpen ? 'bg-gray-900' : 'bg-red-500'}`}>
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

                    {/* Onboarding Tour Toggle */}
                    <button
                        id="guide-tour-toggle"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isTourActive) stopTour();
                            else startTour();
                        }}
                        className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all flex items-center justify-center border border-indigo-100/50 shadow-sm"
                        title="Kullanım Kılavuzu"
                    >
                        <HelpCircle className="w-5 h-5" />
                    </button>

                    {/* User Profile - More Minimalist */}
                    <div className="relative">
                        <button
                            id="guide-profile"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsProfileOpen(!isProfileOpen);
                            }}
                            className={`flex items-center gap-4 py-2 pl-2 pr-4 rounded-3xl transition-all ${isProfileOpen ? 'bg-gray-100' : 'hover:bg-gray-50'
                                }`}
                        >
                            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black overflow-hidden shadow-lg shadow-indigo-600/10">
                                {avatarUrl ? (
                                    <img src={apiClient.getFileUrl(avatarUrl)} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    userName?.[0] || 'U'
                                )}
                            </div>
                             <div className="text-left hidden lg:block">
                                 <h4 className="text-[13px] font-black text-gray-900 uppercase tracking-widest leading-none mb-1">
                                     {userName || 'Kullanıcı'}
                                 </h4>
                                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-60">
                                     {roleMapper(userRole)}
                                 </p>
                             </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-card rounded-3xl shadow-2xl border border-border-custom p-2 animate-in fade-in slide-in-from-top-4 duration-200">
                                <div className="px-4 py-3 border-b border-border-custom mb-1">
                                    <p className="text-sm font-bold text-foreground">Hesap Yönetimi</p>
                                    <p className="text-[11px] text-gray-600">Güvenlik ve tercihleriniz</p>
                                </div>

                                <Link
                                    href="/profile"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all text-left"
                                >
                                    <User className="w-4 h-4" />
                                    <span>Profilim</span>
                                </Link>


                                <Link
                                    href="/settings"
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 rounded-2xl transition-all text-left"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Ayarlar</span>
                                </Link>

                                <div className="h-px bg-gray-50 my-1 mx-2" />

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-2xl transition-all font-medium text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Çıkış Yap</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </header>
    );
}
