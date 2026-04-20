'use client';

import React from 'react';
import { Task, apiClient } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Calendar, User, Flag, AlignLeft, Hash } from 'lucide-react';

interface TaskViewModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function TaskViewModal({ task, isOpen, onClose }: TaskViewModalProps) {
    if (!isOpen || !task) return null;

    const priorityColors: Record<string, string> = {
        'high': 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
        'critical': 'text-red-600 bg-red-50 dark:bg-red-900/20',
        'medium': 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
        'low': 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
    };

    const priorityBg: Record<string, string> = {
        'high': 'bg-rose-500',
        'critical': 'bg-red-600',
        'medium': 'bg-amber-500',
        'low': 'bg-emerald-500'
    };

    const p = (task.priority || 'medium').toLowerCase();

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300" 
                onClick={onClose}
            />
            
            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header with Priority Color Strip */}
                <div className={`h-2 w-full ${priorityBg[p] || 'bg-gray-400'}`} />
                
                <div className="p-8">
                    <div className="flex justify-between items-start mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${priorityColors[p]}`}>
                                    {task.priority || 'Medium'} Öncelik
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                    ID: #{task.id.substring(0, 8)}
                                </span>
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                {task.title}
                            </h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-rose-500 rounded-2xl transition-all hover:rotate-90"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Details Sidebar */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <User className="w-5 h-5 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Atanan Kişi</p>
                                    <div className="flex items-center gap-2">
                                        {task.assignee ? (
                                            <>
                                                {task.assignee.avatar_url && (
                                                    <img 
                                                        src={apiClient.getFileUrl(task.assignee.avatar_url)} 
                                                        className="w-5 h-5 rounded-full object-cover"
                                                        alt="Avatar"
                                                    />
                                                )}
                                                <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                                                    {task.assignee.first_name} {task.assignee.last_name}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="font-bold text-sm text-gray-400 italic">Atanmamış (Herkes)</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Eklenme Tarihi</p>
                                    <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                                        {task.created_at ? format(new Date(task.created_at), 'd MMMM yyyy HH:mm', { locale: tr }) : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                                    <Flag className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Oluşturan</p>
                                    <p className="font-bold text-sm text-gray-700 dark:text-gray-200">
                                        {task.creator ? `${task.creator.first_name} ${task.creator.last_name || ''}` : 'Sistem'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-gray-400" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Açıklama</span>
                            </div>
                            <div className="p-6 flex-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed overflow-y-auto max-h-[250px] custom-scrollbar">
                                {task.description || (
                                    <span className="italic text-gray-300 dark:text-gray-600">Açıklama belirtilmemiş.</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button 
                            onClick={onClose}
                            className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition active:scale-95"
                        >
                            Kapat
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
