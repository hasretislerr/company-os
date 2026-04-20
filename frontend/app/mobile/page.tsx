'use client';

import { useState, useEffect } from 'react';
import { 
    Home, 
    Calendar, 
    Plus, 
    MessageCircle, 
    User, 
    LayoutGrid, 
    Search,
    Bell,
    ChevronDown,
    Clock,
    FileText,
    Download,
    Share2,
    Heart,
    MoreHorizontal,
    Crown,
    Menu
} from 'lucide-react';
import { apiClient } from '@/lib/api';

export default function MobileDashboard() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('home');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const userData = await apiClient.getProfile();
            setUser(userData);
        } catch (err) {
            console.error('Veri yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans md:hidden">
            {/* Top Bar */}
            <header className="px-6 pt-12 pb-4 flex items-center justify-between">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                    <Crown className="w-5 h-5 text-amber-600" />
                </div>
                <h1 className="text-lg font-black tracking-tight text-gray-900">Keşfet</h1>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                    <Menu className="w-5 h-5 text-gray-600" />
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto px-6 space-y-8 custom-scrollbar">
                
                {/* Greeting Card */}
                <section className="relative group overflow-hidden">
                    <div className="p-6 bg-indigo-50 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-indigo-50">
                            <FileText className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">İyi günler</h2>
                            <p className="text-sm text-gray-600 font-medium">Binlerce not seni bekliyor</p>
                        </div>
                        <div className="ml-auto w-1 h-8 bg-indigo-500/50 rounded-full" />
                    </div>
                </section>

                {/* Grid Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-white rounded-[2rem] border border-gray-100 space-y-4 shadow-sm">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-gray-900">Not Paylaş</h3>
                            <p className="text-[10px] text-gray-500 mt-1 lines-clamp-2">PDF yükle, diğer öğrencilerle paylaş...</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white rounded-[2rem] border border-gray-100 space-y-4 shadow-sm">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <Download className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-sm text-gray-900">Not İndir</h3>
                            <p className="text-[10px] text-gray-500 mt-1 lines-clamp-2">Ders notlarını keşfet, indir...</p>
                        </div>
                    </div>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {['Bölüm', 'Ders', 'Konu'].map((item) => (
                        <div key={item} className="flex-shrink-0 px-4 py-2 bg-white rounded-xl border border-gray-100 flex items-center gap-2 text-xs font-bold text-gray-600 shadow-sm">
                            <LayoutGrid className="w-3 h-3 text-indigo-600" />
                            {item}
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </div>
                    ))}
                </div>

                {/* Categories */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black text-gray-300 uppercase tracking-widest">Kategoriler</h2>
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                        {[
                            { name: 'Mimarlık', icon: '🏢' },
                            { name: 'Yazılım', icon: '💻' },
                            { name: 'Matematik', icon: '📐' }
                        ].map((cat) => (
                            <button key={cat.name} className="flex-shrink-0 px-6 py-3 bg-white rounded-full border border-gray-100 flex items-center gap-2 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm text-gray-700">
                                <span>{cat.icon}</span>
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Popular List Area */}
                <section className="space-y-4">
                    <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">Popüler PDF'ler</h2>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group shadow-lg">
                        {/* Background Text Decor */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                            <span className="text-6xl font-black rotate-12 text-indigo-600">CRYPTOGRAPHY</span>
                        </div>

                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <span className="px-3 py-1 bg-indigo-600 text-[10px] font-black rounded-lg text-white">Python</span>
                            <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black rounded-lg">Yeni</span>
                                <MoreHorizontal className="w-5 h-5 text-gray-400" />
                                <Heart className="w-5 h-5 text-gray-400 hover:text-rose-500 transition-colors" />
                            </div>
                        </div>

                        <div className="relative z-10 space-y-4">
                            <div className="bg-gray-50 rounded-2xl flex items-center px-4 py-3 border border-gray-100">
                                <Search className="w-4 h-4 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Not ara..." 
                                    className="bg-transparent border-none outline-none text-xs ml-3 w-full font-medium text-gray-900"
                                />
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-8 left-6 right-6 h-20 bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-gray-100 shadow-2xl flex items-center justify-around px-4 z-50">
                <button className="flex flex-col items-center gap-1 group">
                    <Home className="w-6 h-6 text-indigo-600" />
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Keşfet</span>
                </button>
                <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity text-gray-600">
                    <Download className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">İndirilenler</span>
                </button>
                
                {/* Central Action Button */}
                <div className="relative -top-10">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
                    <button className="relative w-16 h-16 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-full flex items-center justify-center shadow-xl shadow-indigo-600/30 border-4 border-background">
                        <Plus className="w-8 h-8 text-white stroke-[3]" />
                    </button>
                </div>

                <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity text-gray-600">
                    <Heart className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Favoriler</span>
                </button>
                <button className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity text-gray-600">
                    <User className="w-6 h-6" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Profil</span>
                </button>
            </nav>

            {/* Custom UI enhancements */}
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 0px; }
            `}</style>
        </div>
    );
}
