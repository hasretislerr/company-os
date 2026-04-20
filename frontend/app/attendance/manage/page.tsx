'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Users,
    Calendar,
    Search,
    Edit2,
    CheckCircle2,
    XCircle,
    History,
    Filter,
    MoreVertical,
    CheckSquare
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { hasOrganizationContext } from '@/lib/token';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function AttendanceManagePage() {
    const [attendances, setAttendances] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [editModal, setEditModal] = useState<{ open: boolean; record?: any; reason: string; status: string }>({
        open: false,
        reason: '',
        status: ''
    });
    const [logModal, setLogModal] = useState<{ open: boolean; record?: any; logs: any[] }>({
        open: false,
        logs: []
    });

    useEffect(() => {
        fetchDailyAttendance();
    }, [selectedDate]);

    const fetchDailyAttendance = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listDailyAttendance(selectedDate);
            setAttendances(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Veriler çekilemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async (record: any) => {
        try {
            const logs = await apiClient.getAttendanceLogs(record.id);
            setLogModal({ open: true, record, logs: Array.isArray(logs) ? logs : [] });
        } catch (err) {
            toast.error('Loglar yüklenemedi.');
        }
    };

    const handleUpdate = async () => {
        if (!editModal.record || !editModal.reason) {
            toast.error('Değişiklik sebebi zorunludur!');
            return;
        }

        try {
            await apiClient.updateAttendance(editModal.record.id, {
                status: editModal.status,
                reason: editModal.reason
            });
            setEditModal({ open: false, reason: '', status: '' });
            fetchDailyAttendance();
        } catch (err) {
            toast.error('Güncelleme başarısız.');
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'present': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'absent': return 'bg-red-50 text-red-700 border-red-100';
            case 'late': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'early_out': return 'bg-blue-50 text-blue-700 border-blue-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getStatusTranslation = (status: string) => {
        switch (status) {
            case 'present': return 'MEVCUT';
            case 'absent': return 'GELMEDİ';
            case 'late': return 'GEÇ KALDI';
            case 'early_out': return 'ERKEN ÇIKTI';
            default: return status?.toUpperCase() || 'BİLİNMİYOR';
        }
    };

    const filtered = attendances.filter(a =>
        `${a.user?.first_name} ${a.user?.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <LeftSidebar />

            <div className="flex-1 md:ml-80 flex flex-col h-full overflow-hidden">
                <TopNavbar />

                <main className="flex-1 overflow-y-auto bg-background">
                    <div className="max-w-7xl mx-auto px-12 py-10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
                                    <Users className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-foreground tracking-tight">Personel Katılım Yönetimi</h1>
                                    <p className="text-gray-500 font-medium">Günlük giriş-çıkış takibi ve manuel düzenleme</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="px-4 py-2 bg-card border border-border-custom rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all text-foreground"
                                />
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="bg-card p-4 rounded-3xl border border-border-custom shadow-sm mb-6 flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Personel ara..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-background border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all text-foreground"
                                />
                            </div>
                            <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                                <Filter className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List */}
                        <div className="bg-card rounded-3xl border border-border-custom shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personel</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Giriş / Çıkış</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Durum</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Audit Logs</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((att) => (
                                        <tr key={att.id}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center font-bold text-indigo-600">
                                                        {att.user?.first_name?.[0]}{att.user?.last_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-foreground">{att.user?.first_name} {att.user?.last_name}</p>
                                                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Yazılım Ekibi</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-foreground">
                                                    {att.check_in_at ? format(new Date(att.check_in_at), 'HH:mm') : '-'}
                                                    <span className="mx-1 text-gray-300">/</span>
                                                    {att.check_out_at ? format(new Date(att.check_out_at), 'HH:mm') : '-'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${getStatusStyle(att.status)}`}>
                                                    {getStatusTranslation(att.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => fetchLogs(att)}
                                                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                                                >
                                                    <History className="w-3 h-3" />
                                                    Geçmişi Gör
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setEditModal({ open: true, record: att, status: att.status, reason: '' })}
                                                    className="p-2 hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Edit Modal */}
            {editModal.open && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-border-custom">
                        <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-indigo-600 text-white">
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Durumu Güncelle</h3>
                                <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
                                    {editModal.record?.user?.first_name} {editModal.record?.user?.last_name}
                                </p>
                            </div>
                            <button onClick={() => setEditModal({ ...editModal, open: false })}>
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Yeni Durum</label>
                                <select
                                    value={editModal.status}
                                    onChange={(e) => setEditModal({ ...editModal, status: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border-none rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all text-foreground"
                                >
                                    <option value="present">Mevcut</option>
                                    <option value="absent">Gelmedi</option>
                                    <option value="late">Geç Kaldı</option>
                                    <option value="early_out">Erken Çıktı</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Değişiklik Sebebi (Audit Log)</label>
                                <textarea
                                    value={editModal.reason}
                                    onChange={(e) => setEditModal({ ...editModal, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-background border-none rounded-2xl text-sm font-medium h-32 outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all resize-none text-foreground"
                                    placeholder="Neden güncelleme yapılıyor?"
                                />
                            </div>
                            <button
                                onClick={handleUpdate}
                                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                            >
                                KAYDET VE LOGLA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Audit Log Modal */}
            {logModal.open && (
                <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-card w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-border-custom">
                        <div className="p-8 border-b border-border-custom flex items-center justify-between bg-background">
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-foreground">Değişiklik Geçmişi</h3>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                                    {logModal.record?.user?.first_name} {logModal.record?.user?.last_name} - {format(new Date(logModal.record?.check_in_at), 'dd MMMM', { locale: tr })}
                                </p>
                            </div>
                            <button
                                onClick={() => setLogModal({ ...logModal, open: false })}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white shadow-sm text-gray-400 hover:text-gray-900 transition-all"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-10 max-h-[60vh] overflow-y-auto">
                            <div className="relative border-l-2 border-indigo-50 pl-8 space-y-12 py-4">
                                {logModal.logs.map((log, idx) => (
                                    <div key={log.id} className="relative">
                                        <div className="absolute -left-[41px] top-0 w-5 h-5 bg-white border-4 border-indigo-600 rounded-full" />
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                                                    {format(new Date(log.timestamp), 'dd MMM yyyy, HH:mm', { locale: tr })}
                                                </p>
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                                    DÜZENLENDİ
                                                </span>
                                            </div>
                                            <div className="bg-background/50 p-6 rounded-3xl border border-border-custom">
                                                <p className="text-sm font-bold text-foreground mb-4 italic">"{log.reason}"</p>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Eski Durum</p>
                                                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black rounded uppercase border border-red-100">
                                                            {getStatusTranslation(log.old_value)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Yeni Durum</p>
                                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded uppercase border border-emerald-100">
                                                            {getStatusTranslation(log.new_value)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 italic">
                                                İşlemi Yapan: <span className="text-gray-600">Yönetici</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {logModal.logs.length === 0 && (
                                    <div className="text-center py-10 opacity-40">
                                        <History className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                                        <p className="text-sm font-bold">Henüz bir manuel müdahale yapılmamış.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
