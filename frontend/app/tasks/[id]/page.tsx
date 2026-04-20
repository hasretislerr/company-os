'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type Task, type User, type Board } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import toast from 'react-hot-toast';

export default function TaskDetail() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [task, setTask] = useState<Task | null>(null);
    const [board, setBoard] = useState<Board | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    // Edit states
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editPriority, setEditPriority] = useState('');
    const [editAssigneeId, setEditAssigneeId] = useState('');
    const [editDueDate, setEditDueDate] = useState('');

    useEffect(() => {
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const loadData = async () => {
        try {
            setLoading(true);
            const taskData = await apiClient.getTask(taskId);
            setTask(taskData);

            // Initialize edit states
            setEditTitle(taskData.title);
            setEditDescription(taskData.description || '');
            setEditStatus(taskData.column_id); // Assuming status maps to column_id for now, or we need column info
            setEditPriority(taskData.priority);
            setEditAssigneeId(taskData.assignee_id || '');
            setEditDueDate(taskData.due_date ? new Date(taskData.due_date).toISOString().split('T')[0] : '');

            // Load board info to get columns
            if (taskData.board_id) {
                const boardData = await apiClient.getBoard(taskData.board_id);
                setBoard(boardData);
            }

            // Load users
            const usersData = await apiClient.listUsers();
            setUsers(usersData);
        } catch (err) {
            setError('Görev detayları yüklenemedi');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bu görevi silmek istediğinize emin misiniz?')) return;

        try {
            await apiClient.deleteTask(taskId);
            if (task) {
                router.push(`/boards/${task.board_id}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err) {
            toast.error('Görev silinemedi');
        }
    };

    const handleUpdate = async () => {
        try {
            await apiClient.updateTask(taskId, {
                title: editTitle,
                description: editDescription,
                priority: editPriority,
                column_id: editStatus,
                assignee_id: editAssigneeId || undefined,
                due_date: editDueDate || undefined,
            });
            setIsEditing(false);
            loadData(); // Reload to get fresh data
        } catch (err) {
            toast.error('Görev güncellenemedi');
        }
    };

    const getPriorityBadge = (priority: string) => {
        const colors = {
            low: 'bg-green-100 text-green-800',
            medium: 'bg-yellow-100 text-yellow-800',
            high: 'bg-orange-100 text-orange-800',
            critical: 'bg-red-100 text-red-800',
        };
        const labels = {
            low: 'Düşük',
            medium: 'Orta',
            high: 'Yüksek',
            critical: 'Kritik',
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {labels[priority as keyof typeof labels] || priority}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Yükleniyor...</div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Görev bulunamadı</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <TopNavbar />

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Breadcrumb */}
                    <nav className="mb-6 text-sm text-gray-500">
                        <Link href="/dashboard" className="hover:text-indigo-600">Dashboard</Link>
                        <span className="mx-2">/</span>
                        {board && (
                            <>
                                <Link href={`/projects/${board.project_id}`} className="hover:text-indigo-600">Proje</Link>
                                <span className="mx-2">/</span>
                                <Link href={`/boards/${board.id}`} className="hover:text-indigo-600">{board.name}</Link>
                                <span className="mx-2">/</span>
                            </>
                        )}
                        <span className="text-gray-900 font-medium">Görev Detayı</span>
                    </nav>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header Actions */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">✅</span>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        className="text-xl font-bold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                ) : (
                                    <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={handleUpdate}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                                        >
                                            Kaydet
                                        </button>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                                        >
                                            İptal
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition font-medium"
                                        >
                                            Düzenle
                                        </button>
                                        <button
                                            onClick={handleDelete}
                                            className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition font-medium"
                                        >
                                            Sil
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Main Content */}
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-2">Açıklama</h3>
                                    {isEditing ? (
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                        />
                                    ) : (
                                        <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-4 rounded-lg">
                                            {task.description || 'Açıklama yok.'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sidebar / Meta Info */}
                            <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100 h-fit">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Durum
                                    </label>
                                    {isEditing && board ? (
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {board.columns?.map(col => (
                                                <option key={col.id} value={col.id}>{col.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="inline-flex">
                                            {board?.columns?.find(c => c.id === task.column_id)?.name ? (
                                                <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                                                    {board.columns.find(c => c.id === task.column_id)?.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Öncelik
                                    </label>
                                    {isEditing ? (
                                        <select
                                            value={editPriority}
                                            onChange={(e) => setEditPriority(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="low">Düşük</option>
                                            <option value="medium">Orta</option>
                                            <option value="high">Yüksek</option>
                                            <option value="critical">Kritik</option>
                                        </select>
                                    ) : (
                                        <div>{getPriorityBadge(task.priority)}</div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Atanan Kişi
                                    </label>
                                    {isEditing ? (
                                        <select
                                            value={editAssigneeId}
                                            onChange={(e) => setEditAssigneeId(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Atanmadı</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            {task.assignee_id ? (
                                                <>
                                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-bold text-indigo-700">
                                                        {users.find(u => u.id === task.assignee_id)?.first_name[0] || '?'}
                                                    </div>
                                                    <div className="text-sm text-gray-900 font-medium">
                                                        {users.find(u => u.id === task.assignee_id)?.first_name || 'Bilinmiyor'} {users.find(u => u.id === task.assignee_id)?.last_name || ''}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-500 italic">Atanmadı</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                        Son Tarih
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editDueDate}
                                            onChange={(e) => setEditDueDate(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                        />
                                    ) : (
                                        <div className="text-sm text-gray-900">
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR') : <span className="text-gray-500">-</span>}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-200 mt-6 pt-6 text-xs text-gray-500 space-y-2">
                                    <div>Oluşturuldu: {task.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR') : '-'}</div>
                                    {task.updated_at && <div>Güncellendi: {new Date(task.updated_at).toLocaleDateString('tr-TR')}</div>}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
