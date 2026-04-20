'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, apiClient } from '@/lib/api';
import { useState, useEffect } from 'react';

interface SortableDashboardTaskProps {
    task: Task;
    boardId: string;
    displayedUser?: { first_name: string; last_name?: string; avatar_url?: string } | null;
    onDelete?: (e: React.MouseEvent) => void;
    onView?: (task: Task) => void;
}

export function SortableDashboardTask({ task, boardId, displayedUser, onDelete, onView }: SortableDashboardTaskProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        data: {
            type: 'Task',
            task,
            boardId,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    const priorityColors: Record<string, string> = {
        'high': 'bg-rose-500',
        'critical': 'bg-red-600',
        'medium': 'bg-amber-500',
        'low': 'bg-emerald-500'
    };

    const priorityBg: Record<string, string> = {
        'high': 'bg-rose-50',
        'critical': 'bg-red-50',
        'medium': 'bg-amber-50',
        'low': 'bg-emerald-50'
    };

    const priorityLabels: Record<string, string> = {
        'high': 'Yüksek',
        'critical': 'Kritik',
        'medium': 'Orta',
        'low': 'Düşük'
    };

    const p = (task.priority || 'medium').toLowerCase();
    const label = priorityLabels[p] || p;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="group cursor-pointer select-none"
            onClick={() => onView?.(task)}
        >
            <div className={`relative bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900 transition-all duration-200 ${isDragging ? 'ring-2 ring-indigo-500 ring-opacity-50 z-50 scale-105 shadow-2xl' : ''}`}>
                {/* Priority Indicator */}
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${priorityColors[p] || 'bg-gray-300'}`} />
                
                <div className="flex flex-col gap-2 pl-1">
                    <div className="flex justify-between items-start gap-2">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight line-clamp-2" title={task.title}>
                            {task.title}
                        </span>
                        {onDelete && (
                            <button
                                onClick={onDelete}
                                className="h-6 w-6 flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition opacity-0 group-hover:opacity-100 shrink-0"
                            >
                                🗑️
                            </button>
                        )}
                    </div>

                    <div className="flex items-center justify-between mt-1">
                        {/* Assignee Tag with Avatar */}
                        {(displayedUser || task.assignee) ? (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-100/50 dark:border-indigo-800/50">
                                {((displayedUser?.avatar_url || task.assignee?.avatar_url)) ? (
                                    <img 
                                        src={apiClient.getFileUrl(displayedUser?.avatar_url || (task.assignee && typeof task.assignee === 'object' ? task.assignee.avatar_url : ''))} 
                                        alt="Avatar"
                                        className="w-4 h-4 rounded-full object-cover border border-indigo-200"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-3.5 h-3.5 bg-indigo-200 dark:bg-indigo-800 rounded-full flex items-center justify-center text-[8px] font-black uppercase">
                                        {(displayedUser?.first_name || (task.assignee && typeof task.assignee === 'object' ? task.assignee.first_name : 'U'))[0]}
                                    </div>
                                )}
                                <span className="text-[9px] font-bold tracking-tight truncate max-w-[80px]">
                                    {(() => {
                                        const u = displayedUser || (task.assignee && typeof task.assignee === 'object' ? task.assignee : null);
                                        if (!u) return 'U';
                                        const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
                                        return `${cap(u.first_name)} ${cap(u.last_name || '')}`.trim();
                                    })()}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1 text-[9px] font-bold text-gray-300 tracking-widest italic">
                                Atanmamış
                            </div>
                        )}

                        {/* Priority Badge Tiny */}
                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${priorityBg[p] || 'bg-gray-50'} ${priorityColors[p]?.replace('bg-', 'text-') || 'text-gray-400'}`}>
                            {label}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
