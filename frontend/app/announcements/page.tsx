'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { Bell, Plus, X, AlertCircle, Clock, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnnouncementsPage() {
    const router = useRouter();
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listAnnouncements();
            setAnnouncements(data || []);
        } catch (error) {
            console.error('Announcements load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.createAnnouncement({ 
                ...newAnnouncement,
                target_type: 'all',
                priority: 'normal',
                send_email: false
            });
            toast.success('Duyuru başarıyla oluşturuldu');
            setIsModalOpen(false);
            setNewAnnouncement({ title: '', content: '' });
            fetchAnnouncements();
        } catch (error) {
            toast.error('Duyuru oluşturulamadı');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-gray-50">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm font-black text-gray-500 animate-pulse uppercase tracking-widest">Duyurular yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex bg-background md:min-h-screen">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <div className="flex-1 flex flex-col p-10 pb-32">
                    <div className="flex-1 bg-white rounded-3xl md:border md:border-gray-100 md:shadow-sm p-6 flex flex-col min-h-[500px]">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-black text-foreground tracking-tight mb-1 flex items-center gap-3">
                                    <Megaphone className="w-7 h-7 text-indigo-600" />
                                    Duyurular
                                </h1>
                                <p className="text-gray-500 text-sm font-medium">Şirket içi önemli gelişmeleri takip edin.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 group"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="hidden sm:inline">Yeni Duyuru</span>
                            </button>
                        </div>

                        <div className="space-y-6">
                            {announcements.length > 0 ? (
                                announcements.map((ann) => (
                                    <div key={ann.id} className="p-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group border-l-8 border-l-indigo-500">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                                    <Bell className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{ann.title}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                            {new Date(ann.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed font-medium pl-1">{ann.content}</p>
                                    </div>
                                ))
                            ) : (
                                <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-gray-50">
                                        <Megaphone className="w-10 h-10 text-gray-200" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Henüz Duyuru Yok</p>
                                        <p className="text-xs text-gray-500 font-medium max-w-[250px] leading-relaxed mx-auto">Tüm duyurular burada listelenecek.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Yeni Duyuru Oluştur</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Duyuru Başlığı</label>
                                <input
                                    required
                                    type="text"
                                    value={newAnnouncement.title}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all font-bold placeholder:text-gray-300"
                                    placeholder="Örn: Hafta Sonu Çalışma Programı"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">İçerik Detayları</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={newAnnouncement.content}
                                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                                    className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium placeholder:text-gray-300 resize-none"
                                    placeholder="Duyuru içeriğini buraya yazın..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 active:scale-95 transition-all hover:bg-indigo-700"
                            >
                                Duyuruyu Yayınla
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
