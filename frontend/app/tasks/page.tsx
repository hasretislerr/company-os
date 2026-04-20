'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Search, 
    Filter, 
    ChevronRight, 
    Clock, 
    CheckCircle2, 
    AlertCircle,
    Calendar,
    ArrowLeft,
    ClipboardList
} from 'lucide-react';
import { apiClient, type Task } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';

export default function TasksPage() {
    const router = useRouter();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const myTasks = await apiClient.listMyTasks();
            setTasks(myTasks || []);
        } catch (err) {
            console.error('Görevler yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (task.description?.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFilter = filter === 'all' || task.priority.toLowerCase() === filter;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-sm font-black text-gray-500 uppercase tracking-widest">Görevler yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex bg-background md:min-h-screen">
            <LeftSidebar />

            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <div className="flex-1 flex flex-col p-4 pb-32">
                    <div className="flex-1 bg-white rounded-3xl md:border md:border-gray-100 md:shadow-sm p-6 flex flex-col min-h-[500px]">
                        
                        {/* Sticky Search & Filter Header on Mobile */}
                        <div className="sticky top-0 bg-white z-20 pb-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                                    <ClipboardList className="w-7 h-7 text-indigo-600" />
                                    Görevlerim
                                </h1>
                                <div className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">
                                    {filteredTasks.length} GÖREV
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="text" 
                                        placeholder="Görevlerde ara..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all font-medium"
                                    />
                                </div>

                                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                    {[
                                        { id: 'all', label: 'HEPSİ' },
                                        { id: 'high', label: 'YÜKSEK' },
                                        { id: 'medium', label: 'ORTA' },
                                        { id: 'low', label: 'DÜŞÜK' }
                                    ].map((btn) => (
                                        <button
                                            key={btn.id}
                                            onClick={() => setFilter(btn.id as any)}
                                            className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black transition-all border ${
                                                filter === btn.id 
                                                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' 
                                                : 'bg-white border-gray-100 text-gray-500'
                                            }`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="space-y-4 pb-10">
                            {filteredTasks.length > 0 ? (
                                filteredTasks.map((task) => (
                                    <Link 
                                        key={task.id} 
                                        href={`/tasks/${task.id}`}
                                        className="p-6 bg-white rounded-[2.5rem] border border-gray-100 flex flex-col gap-4 group active:scale-[0.98] transition-all shadow-sm hover:shadow-xl border-l-8"
                                        style={{ borderLeftColor: 
                                            task.priority === 'high' ? '#F43F5E' : 
                                            task.priority === 'medium' ? '#F59E0B' : '#6366F1' 
                                        }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 pr-4">
                                                <h4 className="text-sm font-black text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{task.title}</h4>
                                                <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed font-medium">{task.description || 'Açıklama belirtilmemiş'}</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-50 bg-gray-50 text-gray-400 group-hover:text-indigo-600 transition-colors">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider border ${
                                                    task.priority === 'high' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                                                    task.priority === 'medium' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
                                                    'bg-indigo-50 border-indigo-100 text-indigo-600'
                                                }`}>
                                                    {task.priority === 'high' ? 'YÜKSEK' : task.priority === 'medium' ? 'ORTA' : 'DÜŞÜK'}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase">
                                                    <Calendar className="w-3 h-3" />
                                                    {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : 'Süresiz'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] text-indigo-600 font-black uppercase tracking-widest">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                {task.status || 'İşlemde'}
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="py-24 flex flex-col items-center justify-center text-center space-y-8 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-2xl border border-gray-50 text-gray-200">
                                        <ClipboardList className="w-10 h-10" />
                                    </div>
                                    <p className="text-sm font-black text-gray-400 uppercase tracking-widest">GÖREV BULUNAMADI</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
