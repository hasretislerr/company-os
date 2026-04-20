import React, { useState, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { deptMapper, roleMapper } from '@/lib/mappers';

interface TaskFilterBarProps {
    assignees?: any[];
    users?: any[];
    filters: {
        assigneeId: string | null;
        priority: string | null;
    };
    onFilterChange: (key: 'assigneeId' | 'priority', value: string | null) => void;
    currentUserId?: string;
    currentUserDept?: string;
    currentUserAvatar?: string;
}

export const TaskFilterBar: React.FC<TaskFilterBarProps> = ({ assignees, users, filters, onFilterChange, currentUserId, currentUserDept, currentUserAvatar }) => {
    const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const actualUsers = users || assignees || [];

    // Alias for internal consistency if needed
    const userAvatar = currentUserAvatar;

    // Map assignees to include current user's avatar if it's missing but we have it as a prop
    const mappedAssignees = React.useMemo(() => {
        const safeAssignees = Array.isArray(actualUsers) ? actualUsers : [];
        return safeAssignees.map(u => {
            // Use loose equality for IDs
            if (u.id == currentUserId) {
                const storageUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
                const bestAvatar = currentUserAvatar || storageUser.avatar_url || storageUser.AvatarURL || u.avatar_url || u.AvatarURL;

                if (bestAvatar) {
                    return { ...u, avatar_url: bestAvatar };
                }
            }
            return u;
        });
    }, [assignees, currentUserId, currentUserAvatar]);

    // Filter out duplicates by ID from mappedAssignees
    const uniqueUsers = mappedAssignees.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

    const selectedUser = uniqueUsers.find(u => u.id === filters.assigneeId);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsAssigneeOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const renderAvatar = (user: any, size: string = 'w-6 h-6') => {
        if (!user) return null;

        const avatarPath = user.avatar_url || user.avatarUrl || user.AvatarURL || user.avatar;
        const name = encodeURIComponent(`${user.first_name || ''} ${user.last_name || ''}`);
        const defaultAvatar = `https://ui-avatars.com/api/?name=${name || 'U'}&background=6366f1&color=fff&size=128&bold=true`;

        const src = (avatarPath && avatarPath.trim().length > 0) ? apiClient.getFileUrl(avatarPath) : defaultAvatar;

        return (
            <img
                src={src}
                alt="User"
                className={`${size} rounded-full object-cover border border-gray-100 shadow-sm`}
                onError={(e) => {
                    (e.target as HTMLImageElement).src = defaultAvatar;
                }}
            />
        );
    };

    return (
        <div id="guide-filters" className="flex flex-wrap items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Filtrele: </span>
            </div>

            {/* Custom Assignee Dropdown */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsAssigneeOpen(!isAssigneeOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[180px]"
                >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {selectedUser ? (
                            <>
                                {renderAvatar(selectedUser)}
                                <span className="truncate">
                                    {selectedUser.first_name} {selectedUser.last_name}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <span className="text-gray-500">Tüm Kişiler</span>
                            </>
                        )}
                    </div>
                    <svg className={`shrink-0 w-4 h-4 text-gray-400 transition-transform ${isAssigneeOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isAssigneeOpen && (
                    <div 
                        className="absolute z-50 mt-2 w-72 bg-white border border-gray-100 rounded-xl shadow-xl py-2 max-h-64 overflow-y-auto overscroll-contain animate-in fade-in slide-in-from-top-2 duration-200"
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                onFilterChange('assigneeId', null);
                                setIsAssigneeOpen(false);
                            }}
                            className={`w-full flex items-center px-4 py-2 text-sm hover:bg-indigo-50 transition-colors ${!filters.assigneeId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                        >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                            </div>
                            Tüm Kişiler
                        </button>
                        <div className="h-px bg-gray-100 my-1 mx-2" />
                        {uniqueUsers.map((user) => (
                            <button
                                key={user.id}
                                onClick={() => {
                                    onFilterChange('assigneeId', user.id);
                                    setIsAssigneeOpen(false);
                                }}
                                className={`w-full flex items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${filters.assigneeId === user.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                            >
                                <div className="relative shrink-0 mr-4">
                                    {renderAvatar(user, 'w-10 h-10')}
                                </div>
                                <div className="flex flex-col items-start overflow-hidden flex-1">
                                    <div className="flex items-center gap-2 mb-1 w-full">
                                        <span className="font-bold text-gray-900 truncate">
                                            {user.first_name} {user.last_name}
                                        </span>
                                        {user.id === currentUserId && (
                                            <span className="shrink-0 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase rounded tracking-tighter">Siz</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase rounded border border-indigo-100/50">
                                            {deptMapper(user.department)}
                                        </span>
                                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-bold rounded border border-amber-100/50">
                                            {roleMapper(user.role)}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Priority Filter */}
            <select
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
                value={filters.priority || ''}
                onChange={(e) => onFilterChange('priority', e.target.value || null)}
            >
                <option value="">Tüm Öncelikler</option>
                <option value="critical">🆘 Kritik Öncelik</option>
                <option value="high">🔴 Yüksek Öncelik</option>
                <option value="medium">🟡 Orta Öncelik</option>
                <option value="low">🟢 Düşük Öncelik</option>
            </select>

            {/* Clear Filters Button */}
            {(filters.assigneeId || filters.priority) && (
                <button
                    onClick={() => {
                        onFilterChange('assigneeId', null);
                        onFilterChange('priority', null);
                    }}
                    className="text-sm text-red-600 hover:text-red-800 font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-all flex items-center gap-1 ml-auto"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Filtreleri Temizle
                </button>
            )}
        </div>
    );
};
