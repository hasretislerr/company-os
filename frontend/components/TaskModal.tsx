'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import UserSelect from './UserSelect';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    boardId: string;
    columnId?: string;
    users?: any[];
}

export default function TaskModal({ isOpen, onClose, onSuccess, boardId, columnId, users = [] }: TaskModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [assigneeId, setAssigneeId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Set current user as default assignee if found
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const parsed = JSON.parse(storedUser);
                    setAssigneeId(parsed.id || '');
                } catch (e) {}
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiClient.createTask({
                board_id: boardId,
                column_id: columnId || '',
                title,
                description,
                priority,
                assignee_id: assigneeId || undefined
            });
            toast.success('Görev oluşturuldu');
            setTitle('');
            setDescription('');
            setPriority('Medium');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Görev oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl">
                            📝
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">Yeni Görev</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Görev Başlığı *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold"
                            placeholder="Yapılacak iş..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Açıklama</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none font-medium"
                            placeholder="Detaylı açıklama..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Öncelik</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition font-bold"
                            >
                                <option value="low">🟢 Düşük</option>
                                <option value="medium">🟡 Orta</option>
                                <option value="high">🔴 Yüksek</option>
                                <option value="critical">🆘 Kritik</option>
                            </select>
                        </div>
                        <div>
                            <UserSelect 
                                users={users}
                                selectedUserId={assigneeId}
                                onSelect={setAssigneeId}
                                label="Sorumlu"
                                placeholder="Görev sorumlusu seçin..."
                            />
                        </div>
                    </div>


                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !title}
                            className="flex-1 px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {loading ? 'Ekleniyor...' : 'Görevi Ekle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
