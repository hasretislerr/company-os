'use client';

import { useState, useRef, useEffect } from 'react';
import { User, apiClient } from '@/lib/api';
import { deptMapper, roleMapper } from '@/lib/mappers';

interface UserSelectProps {
    users: User[];
    selectedUserId: string;
    onSelect: (userId: string) => void;
    label: string;
    placeholder?: string;
}

export default function UserSelect({ 
    users, 
    selectedUserId, 
    onSelect, 
    label,
    placeholder = 'Kullanıcı seçin...'
}: UserSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [openUpwards, setOpenUpwards] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedUser = users.find(u => u.id === selectedUserId);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // Dropdown is approx 350px tall (including search)
            if (spaceBelow < 350 && spaceAbove > spaceBelow) {
                setOpenUpwards(true);
            } else {
                setOpenUpwards(false);
            }
            document.documentElement.classList.add('stop-scroll');
        } else {
            document.documentElement.classList.remove('stop-scroll');
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.documentElement.classList.remove('stop-scroll');
        };
    }, [isOpen]);

    const filteredUsers = users.filter(u => 
        u.first_name.toLowerCase().includes(search.toLowerCase()) ||
        (u.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.department && deptMapper(u.department).toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</label>
            
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition flex items-center justify-between group"
            >
                {selectedUser ? (
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        {selectedUser.avatar_url ? (
                            <img 
                                src={apiClient.getFileUrl(selectedUser.avatar_url)} 
                                alt="Avatar" 
                                className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xs flex-shrink-0">
                                {(selectedUser.first_name?.[0] || 'U')}
                            </div>
                        )}
                        <div className="text-left min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                {selectedUser.first_name} {selectedUser.last_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {selectedUser.department && (
                                    <span className="px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[8px] font-black uppercase rounded leading-none flex-shrink-0">
                                        {deptMapper(selectedUser.department)}
                                    </span>
                                )}
                                {selectedUser.role && (
                                    <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[8px] font-black rounded leading-none flex-shrink-0">
                                        {roleMapper(selectedUser.role)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <span className="text-sm text-gray-400">{placeholder}</span>
                )}
                <span className={`text-gray-400 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isOpen && (
                <div 
                    className={`absolute z-[110] w-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-auto ${openUpwards ? 'bottom-[100%] mb-2' : 'top-[100%] mt-2'}`}
                    onWheel={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                >
                    <div className="p-3 border-b border-gray-50 dark:border-gray-800" onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
                        <input
                            type="text"
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="İsim veya birim ara..."
                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>
                    <div 
                        className="max-h-64 overflow-y-auto custom-scrollbar overscroll-contain select-none shadow-inner touch-pan-y"
                        onWheel={(e) => e.stopPropagation()}
                        onScroll={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(user.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition ${selectedUserId === user.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {user.avatar_url ? (
                                            <img 
                                                src={apiClient.getFileUrl(user.avatar_url)} 
                                                alt="Avatar" 
                                                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-gray-700 flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 flex items-center justify-center font-black text-sm flex-shrink-0">
                                                {user.first_name?.[0]}
                                            </div>
                                        )}
                                        <div className="text-left min-w-0 flex-1">
                                            <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mb-1.5 truncate">
                                                {user.first_name} {user.last_name}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[8px] font-black uppercase rounded leading-none flex-shrink-0 border border-indigo-100/50">
                                                    {deptMapper(user.department)}
                                                </span>
                                                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300 text-[8px] font-bold rounded leading-none flex-shrink-0 border border-amber-100/50">
                                                    {roleMapper(user.role)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedUserId === user.id && (
                                        <span className="text-indigo-500 font-bold ml-2 flex-shrink-0">✓</span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-xs font-bold text-gray-400 italic">Kullanıcı bulunamadı</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
