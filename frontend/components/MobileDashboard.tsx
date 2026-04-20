'use client';

import { useState, useEffect } from 'react';
import { 
    Calendar, 
    User, 
    FileText, 
    PlusCircle, 
    ClipboardList,
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Search
} from 'lucide-react';
import { apiClient, type Task } from '@/lib/api';
import Link from 'next/link';

interface MobileDashboardProps {
    user?: any;
    tasks?: Task[];
    loading?: boolean;
    children?: React.ReactNode;
}

export default function MobileDashboard({ children }: MobileDashboardProps) {
    const [user, setUser] = useState<any>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const userData = await apiClient.getProfile();
            setUser(userData);

            // Use the new listMyTasks endpoint for a comprehensive list
            const myTasks = await apiClient.listMyTasks();
            const normalizedTasks = myTasks.map(t => ({
                ...t,
                status: t.status || 'Aktif' // Ensure a status exists for rendering
            }));
            setTasks(normalizedTasks.slice(0, 5));
        } catch (err) {
            console.error('Veri yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col h-screen items-center justify-center bg-background">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-[var(--accent-purple)]/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm font-black text-gray-500 animate-pulse uppercase tracking-widest">Veriler yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-background text-foreground font-sans md:hidden relative z-0">
            {/* Scrollable Content */}
            <div className="px-6 pt-4 space-y-8 relative z-10 pb-10">
                
                {/* Greeting Card - Premium Glassmorphism */}
                <section className="relative">
                    <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" />
                    
                    <div className="p-8 bg-indigo-50/50 backdrop-blur-xl rounded-[3rem] border border-indigo-100 shadow-xl flex flex-col gap-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:scale-125 transition-transform duration-1000">
                            <User className="w-24 h-24 text-indigo-600" />
                        </div>
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-tr from-[#7C3AED] to-[#2563EB] rounded-[1.5rem] flex items-center justify-center border border-white/20 shadow-xl shadow-purple-900/20 p-0.5">
                                {user?.avatar_url ? (
                                    <img src={apiClient.getFileUrl(user.avatar_url)} alt="Avatar" className="w-full h-full object-cover rounded-[1.4rem]" />
                                ) : (
                                    <div className="w-full h-full bg-black/20 rounded-[1.4rem] flex items-center justify-center">
                                        <User className="w-8 h-8 text-white" />
                                    </div>
                                )}
                            </div>
                             <div>
                                <h2 className="text-xl font-black tracking-tight text-gray-400 uppercase tracking-widest opacity-40">Özet</h2>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em] mt-1">SİSTEM VERİLERİ</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid Actions - Neon Interactive */}
                <div className="grid grid-cols-2 gap-4 relative z-20">
                    <Link href="/tasks" className="p-6 bg-white rounded-[2.5rem] border border-gray-100 space-y-4 active:scale-95 transition-all shadow-lg flex flex-col hover:border-[#8B5CF6]/50 group">
                        <div className="w-12 h-12 bg-gradient-to-tr from-[#F59E0B] to-[#D97706] rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <PlusCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">Görevler</h3>
                            <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">PANOYA GİT</p>
                        </div>
                    </Link>
                    <Link href="/leave-requests" className="p-6 bg-white rounded-[2.5rem] border border-gray-100 space-y-4 active:scale-95 transition-all shadow-lg flex flex-col hover:border-[#6366F1]/50 group">
                        <div className="w-12 h-12 bg-gradient-to-tr from-[#6366F1] to-[#4F46E5] rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">İzin Al</h3>
                            <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">YENİ TALEP</p>
                        </div>
                    </Link>
                </div>

                {/* Tasks List */}
                <section className="space-y-4 relative z-20">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">AKTİF GÖREVLERİN</h2>
                        <Link href="/tasks" className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">TÜMÜNÜ GÖR</Link>
                    </div>
                    
                    <div className="space-y-4">
                        {children ? children : (
                            tasks.length > 0 ? (
                                tasks.map((task) => (
                                    <Link key={task.id} href={`/tasks/${task.id}`} className="p-6 bg-white rounded-[2.5rem] border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-lg hover:bg-gray-50 hover:shadow-xl">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-3 h-12 rounded-full ${
                                                task.priority === 'high' ? 'bg-gradient-to-b from-[#F43F5E] to-[#BE123C]' :
                                                task.priority === 'medium' ? 'bg-gradient-to-b from-[#F59E0B] to-[#D97706]' : 
                                                'bg-gradient-to-b from-indigo-500 to-indigo-700'
                                            }`} />
                                            <div>
                                                <h4 className="text-[13px] font-black text-gray-900 group-hover:translate-x-1 transition-transform">{task.title}</h4>
                                                 <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.2em] px-2 py-0.5 bg-gray-100 rounded-full border border-gray-200">
                                                        {task.status || 'BEKLEMEDE'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-11 h-11 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:border-indigo-100 transition-all">
                                            <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-16 bg-white/5 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-8">
                                    <div className="w-24 h-24 bg-gradient-to-tr from-gray-800 to-gray-700 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/10">
                                        <ClipboardList className="w-10 h-10 text-gray-500" />
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-[0.4em]">TEMİZ BİR SAYFA</p>
                                        <p className="text-[11px] text-gray-500 font-medium max-w-[200px] leading-relaxed">Harika! Şu an bekleyen bir görevin görünmüyor.</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>

                 {/* Upcoming Events - Neon Strike */}
                <section className="space-y-4 relative z-20">
                    <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] px-2">GÜNDEM</h2>
                    <div className="bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#2563EB] p-10 rounded-[3rem] shadow-[0_20px_50px_rgba(124,58,237,0.2)] relative overflow-hidden group active:scale-[0.98] transition-all border border-white/20">
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
                            <Calendar className="w-32 h-32 text-white" />
                        </div>
                        <div className="relative z-10 space-y-8">
                            <div>
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">SIRADAKİ ETKİNLİK</span>
                                <h3 className="text-2xl font-black text-white mt-3 leading-tight tracking-tight">Yarınki planlarını gözden geçirmeye ne dersin?</h3>
                            </div>
                            <Link href="/calendar" className="inline-flex items-center gap-4 px-10 py-5 bg-white text-[#7C3AED] text-xs font-black rounded-[1.5rem] shadow-2xl uppercase tracking-[0.15em] hover:bg-gray-100 transition-all hover:scale-105 active:scale-95">
                                Takvimi Aç
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50" />
                    </div>
                </section>

            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
