'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, User, CheckCircle2, ChevronRight, X, Command } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { deptMapper, roleMapper } from '@/lib/mappers';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const data = await apiClient.globalSearch(query);
                setResults(data);
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(fetchResults, 300);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (result: any) => {
        setIsOpen(false);
        setQuery('');
        const type = result.index;
        const id = result.id;
        
        switch (type) {
            case 'users':
                router.push(`/profile/${id}`);
                break;
            case 'tasks':
                router.push(`/tasks/${id}`);
                break;
            case 'projects':
                router.push(`/projects/${id}`);
                break;
            case 'workspaces':
                router.push(`/workspaces/${id}`);
                break;
        }
    };

    const groupedResults = results.reduce((acc, curr) => {
        const index = curr.index;
        if (!acc[index]) acc[index] = [];
        acc[index].push(curr);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <div ref={containerRef} className="relative w-full max-w-sm z-50">
            {/* Search Input Box */}
            <div className={`guide-search-element flex items-center gap-3 px-4 py-2 bg-white dark:bg-gray-900 border-2 transition-all duration-300 ${
                isOpen 
                ? 'rounded-t-2xl border-indigo-500 shadow-xl shadow-indigo-500/10 bg-indigo-50/10' 
                : 'rounded-2xl border-indigo-100 dark:border-gray-800 hover:border-indigo-300 bg-indigo-50/30'
            }`}>
                <Search className={`w-4 h-4 transition-colors ${isOpen ? 'text-indigo-600' : 'text-indigo-500'}`} />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ekip arkadaşı, görev veya proje ara..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {loading ? (
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <div className="hidden sm:flex items-center gap-1 bg-indigo-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-lg text-[10px] font-black border border-indigo-200 dark:border-gray-700 text-indigo-500 transition shadow-sm">
                        <Command className="w-2.5 h-2.5" /> K
                    </div>
                )}
            </div>

            {/* Dropdown Results */}
            {isOpen && (query.length > 0 || results.length === 0) && (
                <div className="absolute top-full left-0 right-0 mt-0 bg-white dark:bg-gray-900 border border-t-0 border-indigo-500 rounded-b-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {query.length < 2 && results.length === 0 && (
                        <div className="p-6 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                Aramaya başlamak için en az <span className="text-indigo-600">2 karakter</span> girin
                            </p>
                        </div>
                    )}

                    {query.length >= 2 && results.length === 0 && !loading && (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Search className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Sonuç Bulunamadı</p>
                        </div>
                    )}

                    {(Object.entries(groupedResults) as [string, any[]][]).map(([category, items]) => (
                        <div key={category} className="border-t border-gray-50 dark:border-gray-800 first:border-t-0">
                            <h3 className="px-4 py-2 bg-gray-50/50 dark:bg-gray-800/30 text-[9px] font-black uppercase tracking-[2px] text-gray-400 flex items-center justify-between">
                                {category === 'users' ? '🛡️ EKİP ARKADAŞLARI' : 
                                 category === 'tasks' ? '📋 GÖREVLER' : 
                                 category === 'projects' ? '📊 PROJELER' : '📂 ÇALIŞMA ALANLARI'}
                                <span className="text-indigo-500/40">{items.length}</span>
                            </h3>
                            <div className="p-1">
                                {items.map((item: any, itemIdx: number) => (
                                    <div key={item.id}>
                                        <button
                                            onClick={() => handleSelect(item)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl group transition-all text-left"
                                        >
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-sm group-hover:scale-105 transition overflow-hidden">
                                                {category === 'users' ? (
                                                    item.data.avatar_url ? (
                                                        <img src={apiClient.getFileUrl(item.data.avatar_url)} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold">
                                                            {(item.data.first_name?.[0] || 'U')}
                                                        </div>
                                                    )
                                                ) : <div className="text-indigo-500"><CheckCircle2 className="w-5 h-5" /></div>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-gray-900 dark:text-gray-100 truncate tracking-tight">
                                                    {item.data.title || item.data.name || `${item.data.first_name} ${item.data.last_name}`}
                                                </p>
                                                {category === 'users' ? (
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        {item.data.department && (
                                                            <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] font-bold rounded">
                                                                {deptMapper(item.data.department)}
                                                            </span>
                                                        )}
                                                        {item.data.role && (
                                                            <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-bold rounded">
                                                                {roleMapper(item.data.role)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 truncate font-medium">
                                                        {item.data.description || 'HIZLI ERİŞİM'}
                                                    </p>
                                                )}
                                            </div>
                                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
                                        </button>
                                        {items.length > 5 && itemIdx === 4 && (
                                            <div className="px-4 py-2 text-[9px] font-black text-indigo-500/50 uppercase text-center border-t border-gray-50 dark:border-gray-800 mt-1">
                                                VE {items.length - 5} DAHA SONUÇ...
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
