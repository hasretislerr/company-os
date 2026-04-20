'use client';

import { useState, useEffect } from 'react';
import {
    Settings,
    Bell,
    Monitor,
    Moon,
    Sun,
    Save,
    CheckCircle2,
    AlertCircle,
    Fingerprint
} from 'lucide-react';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { apiClient } from '@/lib/api';
import { startRegistration } from '@simplewebauthn/browser';

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [theme, setTheme] = useState('light');
    const [notifications, setNotifications] = useState({
        email: true,
        push: true,
        activity: false
    });
    const [isLoadingBiometric, setIsLoadingBiometric] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getProfile();
            setTheme(data.theme || 'light');
            setNotifications({
                email: data.email_notifications ?? true,
                push: data.push_notifications ?? true,
                activity: data.activity_summary ?? false
            });

            // Apply theme locally
            document.documentElement.classList.toggle('dark', data.theme === 'dark');
        } catch (err) {
            console.error('Ayarlar yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (updates: any) => {
        try {
            setSaving(true);
            const updated = await apiClient.updateProfile({
                theme: updates.theme !== undefined ? updates.theme : theme,
                email_notifications: updates.email !== undefined ? updates.email : notifications.email,
                push_notifications: updates.push !== undefined ? updates.push : notifications.push,
                activity_summary: updates.activity !== undefined ? updates.activity : notifications.activity
            });

            // Update local storage
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updated }));
            if (updates.theme) {
                localStorage.setItem('theme', updates.theme);
                window.dispatchEvent(new Event('storage'));
            }

            setMessage({ type: 'success', text: 'Ayarlar güncellendi.' });
            setTimeout(() => setMessage({ type: '', text: '' }), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Ayarlar kaydedilemedi.' });
        } finally {
            setSaving(false);
        }
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.style.colorScheme = 'light';
        }
        updateSettings({ theme: newTheme });
    };

    const handleNotificationToggle = (id: string) => {
        const newValue = !notifications[id as keyof typeof notifications];
        setNotifications(prev => ({ ...prev, [id]: newValue }));
        updateSettings({ [id]: newValue });
    };

    const handleRegisterBiometric = async () => {
        try {
            setIsLoadingBiometric(true);
            const optionsResponse = await apiClient.webauthnBeginRegistration();
            
            // go-webauthn library returns options wrapped in a publicKey object
            const options = optionsResponse.publicKey || optionsResponse;
            
            const credential = await startRegistration(options);
            await apiClient.webauthnFinishRegistration(credential);

            setMessage({ type: 'success', text: 'Biometrik cihaz başarıyla kaydedildi!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (err: any) {
            console.error('Biometrik kayıt hatası:', err);
            setMessage({ type: 'error', text: 'Kayıt başarısız: ' + (err.name === 'NotAllowedError' ? 'İzin verilmedi' : 'Bir hata oluştu') });
        } finally {
            setIsLoadingBiometric(false);
        }
    };

    if (loading) {
        return (
            <div className="flex bg-background min-h-screen">
                <LeftSidebar />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-background min-h-screen">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-w-0">
                <TopNavbar />

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
                    <div className="max-w-4xl mx-auto space-y-8">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-black text-foreground tracking-tight uppercase tracking-tighter">Ayarlar</h1>
                            </div>
                            {message.text && (
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                    {message.text}
                                </div>
                            )}
                        </div>

                        <div className="space-y-8">
                            {/* Üst: Biometrik Güvenlik tam genişlikte */}
                            <section className="p-8 bg-card rounded-[2.5rem] border border-border-custom shadow-sm">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                        <Fingerprint className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-900 dark:text-gray-100 tracking-tight text-lg uppercase tracking-wider">Biometrik Güvenlik</h3>
                                    </div>
                                </div>

                                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-border-custom flex items-center justify-between">
                                    <div className="pr-4">
                                        <p className="font-bold text-foreground">Parmak İzi / Yüz Tanıma</p>
                                        <p className="text-sm text-gray-500 font-medium">Bu tarayıcı veya cihaz için biometrik katılımı aktif et</p>
                                    </div>
                                    <button
                                        onClick={handleRegisterBiometric}
                                        disabled={isLoadingBiometric}
                                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 whitespace-nowrap"
                                    >
                                        {isLoadingBiometric ? 'Bekleyiniz...' : 'Cihazı Kaydet'}
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
