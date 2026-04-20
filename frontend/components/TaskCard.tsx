'use client';

import { Task, User } from '@/lib/api';
import Link from 'next/link';

interface TaskCardProps {
    task: Task;
    getUserById: (userId: string | undefined) => User | undefined;
    getPriorityBadge: (priority: string) => React.ReactNode;
    isOverlay?: boolean;
}

export function TaskCard({ task, getUserById, getPriorityBadge, isOverlay }: TaskCardProps) {
    return (
        <div className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 ${isOverlay ? 'cursor-grabbing shadow-xl scale-105 rotate-2' : 'hover:shadow-md cursor-grab active:cursor-grabbing'} transition`}>
            {/* If overlay, we don't want a link functionality usually, but for visual consistency we keep structure. 
                However, drag overlay shouldn't be clickable. */}
            <div className="block">
                <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 flex-1 truncate mr-2">
                        {task.title}
                    </h4>
                    {getPriorityBadge(task.priority)}
                </div>
                {task.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {task.description}
                    </p>
                )}
                <div className="flex items-center justify-between mt-2">
                    {task.due_date && (
                        <div className="text-xs text-gray-500">
                            📅 {new Date(task.due_date).toLocaleDateString('tr-TR')}
                        </div>
                    )}
                    {task.assignee_id ? (
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-[10px] font-medium text-indigo-700">
                                {getUserById(task.assignee_id)?.first_name[0] || '?'}{getUserById(task.assignee_id)?.last_name?.[0] || ''}
                            </div>
                            <span className="text-[10px] text-gray-600 truncate max-w-[60px]">
                                {task.assignee?.first_name || getUserById(task.assignee_id)?.first_name || 'Bilinmiyor'}
                            </span>
                        </div>
                    ) : task.creator ? (
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-[10px] font-medium text-purple-700">
                                {task.creator.first_name[0]}{task.creator.last_name?.[0] || ''}
                            </div>
                            <span className="text-[10px] text-gray-600 truncate max-w-[60px]">
                                {task.creator.first_name}
                            </span>
                        </div>
                    ) : (
                        <div className="text-[10px] text-gray-400 italic">Atanmadı</div>
                    )}
                </div>
            </div>
        </div>
    );
}
