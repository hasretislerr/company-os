'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    BadgeCheck,
    Calendar,
    Edit3,
    Save,
    Camera,
    ChevronRight,
    ArrowLeft,
    ShieldCheck,
    Phone,
    Info,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getProfile();
            setUser(data);

            let phone = data.phone_number || '';
            if (phone.includes('+90')) {
                phone = phone.replace('+90', '').trim();
            }

            setFormData({
                first_name: data.first_name || '',
                last_name: data.last_name || '',
                phone_number: phone
            });
        } catch (err) {
            console.error('Profil yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const finalPhone = formData.phone_number ? `+90 ${formData.phone_number.trim()}` : '';
            const updated = await apiClient.updateProfile({
                first_name: formData.first_name,
                last_name: formData.last_name,
                phone_number: finalPhone
            });
            setUser(updated);
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profil başarıyla güncellendi.' });

            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, ...updated }));
            window.dispatchEvent(new Event('storage'));

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Profil güncellenemedi.' });
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            const { url } = await apiClient.uploadFile(file);
            const updated = await apiClient.updateProfile({ avatar_url: url });
            setUser(updated);

            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, avatar_url: url }));
            window.dispatchEvent(new Event('storage'));

            setMessage({ type: 'success', text: 'Profil fotoğrafı güncellendi.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Fotoğraf yüklenemedi.' });
        } finally {
            setUploading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    if (loading) return (
        <div className="flex flex-col h-full items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );

    return (
        <div className="flex min-h-screen bg-background">
            <LeftSidebar />

            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <div className="flex-1 flex flex-col p-4 pb-32">
                    <div className="flex-1 bg-white rounded-3xl md:border md:border-gray-100 md:shadow-sm p-8 flex flex-col min-h-[500px]">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="hidden"
                            />

                            {message.text && (
                                <div className={`mb-8 p-4 rounded-3xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                                    }`}>
                                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                    <p className="font-bold text-sm tracking-tight">{message.text}</p>
                                </div>
                            )}

                            <div className="space-y-8">
                                <div className="flex flex-col md:flex-row items-start md:items-end gap-8 mb-10">
                                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                                        <div className="w-32 h-32 md:w-44 md:h-44 bg-white rounded-full p-1 shadow-2xl overflow-hidden ring-4 md:ring-8 ring-white/50">
                                            <div className="w-full h-full bg-slate-50 rounded-full flex items-center justify-center text-3xl md:text-5xl font-black text-indigo-600 overflow-hidden">
                                                {uploading ? (
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                                ) : user?.avatar_url ? (
                                                    <img src={apiClient.getFileUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span>{user?.first_name?.[0]}{user?.last_name?.[0]}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </div>

                                    <div className="flex-1 pb-4">
                                        <h2 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">
                                            {user?.first_name} {user?.last_name}
                                        </h2>
                                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 text-gray-500 font-bold text-xs md:text-sm mt-2">
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-indigo-400" />
                                                {user?.email}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <BadgeCheck className="w-4 h-4 text-indigo-400" />
                                                {(user?.role === 'admin' || user?.email === 'hasretisler0@gmail.com') ? 'Yönetici' : 'Personel'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pb-4 w-full md:w-auto">
                                        {!isEditing ? (
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="w-full md:w-auto px-8 py-4 bg-gray-900 text-white font-black rounded-3xl hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-3"
                                            >
                                                <Edit3 className="w-5 h-5" />
                                                DÜZENLE
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleSave}
                                                className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 transition-all shadow-xl flex items-center justify-center gap-3"
                                            >
                                                <Save className="w-5 h-5" />
                                                KAYDET
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                    <div className="lg:col-span-2 space-y-10">
                                        <div className="bg-[#FBFBFE] rounded-[2.5rem] border border-gray-50 p-6 md:p-10">
                                            <div className="flex items-center gap-4 mb-10">
                                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                                                    <User className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-gray-900 tracking-tight">Kişisel Bilgiler</h3>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Ad, soyad ve iletişim</p>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="px-1 text-[11px] font-black text-gray-400 uppercase tracking-widest">Adınız</label>
                                                        <input
                                                            disabled={!isEditing}
                                                            value={formData.first_name}
                                                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                                            className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none disabled:bg-gray-50/50 disabled:text-gray-500"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="px-1 text-[11px] font-black text-gray-400 uppercase tracking-widest">Soyadınız</label>
                                                        <input
                                                            disabled={!isEditing}
                                                            value={formData.last_name}
                                                            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                                            className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none disabled:bg-gray-50/50 disabled:text-gray-500"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="px-1 text-[11px] font-black text-gray-400 uppercase tracking-widest">Telefon</label>
                                                    <div className="flex gap-2">
                                                        <div className="px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black text-gray-400 flex items-center justify-center">+90</div>
                                                        <input
                                                            disabled={!isEditing}
                                                            value={formData.phone_number}
                                                            onChange={(e) => setFormData({ ...formData, phone_number: e.target.value.replace(/\D/g, '') })}
                                                            className="w-full px-6 py-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold text-gray-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none disabled:bg-gray-50/50"
                                                            placeholder="5xx xxx xx xx"
                                                            maxLength={10}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50/50 rounded-[2.5rem] p-8 border border-gray-100/50 h-fit">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <Info className="w-3 h-3" />
                                            Sistem
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="p-5 bg-white rounded-3xl border border-gray-50 flex items-center gap-4">
                                                <BadgeCheck className="w-5 h-5 text-indigo-600" />
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Rol</p>
                                                    <p className="text-sm font-black">{user?.role === 'admin' ? 'Yönetici' : 'Personel'}</p>
                                                </div>
                                            </div>
                                            <div className="p-5 bg-white rounded-3xl border border-gray-50 flex items-center gap-4">
                                                <Calendar className="w-5 h-5 text-amber-600" />
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-black uppercase">Katılım</p>
                                                    <p className="text-sm font-black">{user?.created_at ? format(new Date(user.created_at), 'dd MMM yyyy', { locale: tr }) : '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
