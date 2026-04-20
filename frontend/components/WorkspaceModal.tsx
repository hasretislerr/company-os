'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import toast from 'react-hot-toast';
import UserSelect from './UserSelect';

interface WorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    users?: any[];
}

export default function WorkspaceModal({ isOpen, onClose, onSuccess, users = [] }: WorkspaceModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await apiClient.createWorkspace({ 
                name, 
                description,
            });
            toast.success('Çalışma alanı oluşturuldu');
            setName('');
            setDescription('');
            setOwnerId('');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error('Oluşturma başarısız oldu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl">
                            📁
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">Yeni Çalışma Alanı</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Çalışma Alanı Adı *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                            placeholder="Örn: Pazarlama Projeleri"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Açıklama</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                            placeholder="Bu çalışma alanında neler yapılacak?"
                        />
                    </div>

                    <UserSelect 
                        users={users}
                        selectedUserId={ownerId}
                        onSelect={setOwnerId}
                        label="Sorumlu Seç"
                        placeholder="Çalışma alanı sorumlusu seçin..."
                    />

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
