'use client';

import { useState, useEffect } from 'react';
import { apiClient, LeaveRequest, LeaveRequestStatus } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import toast from 'react-hot-toast';

export default function LeaveRequestsPage() {
    const [myRequests, setMyRequests] = useState<LeaveRequest[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        type: 'Annual',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setUser(JSON.parse(userStr));
        }
        loadMyRequests();
        loadIncomingRequests();
    }, []);

    const loadMyRequests = async () => {
        try {
            const data = await apiClient.listMyLeaveRequests();
            setMyRequests(data);
        } catch (error) {
            console.error('Failed to load my requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadIncomingRequests = async () => {
        try {
            const data = await apiClient.listIncomingLeaveRequests();
            setIncomingRequests(data);
        } catch (error) {
            console.error('Failed to load incoming requests:', error);
        }
    };

    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.createLeaveRequest(formData);
            setShowModal(false);
            setFormData({ type: 'Annual', start_date: '', end_date: '', reason: '' });
            loadMyRequests();
            toast.success('İzin talebi oluşturuldu');
        } catch (error) {
            toast.error('İzin talebi oluşturulamadı');
        }
    };

    const handleUpdateStatus = async (id: string, status: LeaveRequestStatus, rejectionReason?: string) => {
        try {
            await apiClient.updateLeaveRequestStatus(id, status, rejectionReason);
            loadIncomingRequests();
            loadMyRequests();
            toast.success('Talep güncellendi');
        } catch (error) {
            toast.error('Durum güncellenemedi');
        }
    };

    const getStatusBadge = (req: LeaveRequest) => {
        if (req.status === 'Approved') {
            return <span className="text-green-600 font-medium">✅ Onaylandı</span>;
        }
        if (req.status === 'Rejected') {
            return <span className="text-red-600 font-medium">❌ Reddedildi</span>;
        }

        // Multi-stage approval
        if (req.manager_status === 'Pending') {
            return <span className="text-yellow-600 font-medium">1️⃣ Müdür Onayı Bekliyor</span>;
        }
        if (req.manager_status === 'Rejected') {
            return <span className="text-red-600 font-medium">❌ Müdür Tarafından Reddedildi</span>;
        }
        if (req.hr_status === 'Pending') {
            return <span className="text-blue-600 font-medium">2️⃣ İK Onayı Bekliyor</span>;
        }

        return <span className="text-gray-600 font-medium">⏳ İşlemde</span>;
    };

    if (loading) {
        return (
            <div className="flex bg-background md:min-h-screen">
                <LeftSidebar />
                <div className="flex-1 md:ml-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex bg-background md:min-h-screen">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar userName={user?.first_name} /></div>
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gray-50/50">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {/* Header */}
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">İzin Talepleri</h2>
                                <p className="text-gray-500 mt-1 font-medium">İzin taleplerinizi yönetin ve takip edin.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                            >
                                Yeni İzin Talebi
                            </button>
                        </div>

                        {/* Incoming Requests (For Managers/HR) */}
                        {incomingRequests.length > 0 && (
                            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8">
                                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                    <h3 className="font-black text-gray-900 uppercase tracking-tight">Onay Bekleyen Talepler</h3>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {incomingRequests.map((req) => (
                                        <div key={req.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <div>
                                                <p className="font-bold text-gray-900">{req.user?.first_name} {req.user?.last_name}</p>
                                                <p className="text-sm text-gray-500">{req.type} - {new Date(req.start_date).toLocaleDateString()} / {new Date(req.end_date).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-400 mt-1 italic">"{req.reason}"</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUpdateStatus(req.id, 'Approved')}
                                                    className="px-4 py-2 bg-green-50 text-green-600 rounded-xl font-bold text-sm hover:bg-green-100 transition-colors"
                                                >
                                                    Onayla
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const reason = prompt('Reddetme nedeni:');
                                                        if (reason) handleUpdateStatus(req.id, 'Rejected', reason);
                                                    }}
                                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors"
                                                >
                                                    Reddet
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* My Requests */}
                        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                                <h3 className="font-black text-gray-900 uppercase tracking-tight">Taleplerim</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/30 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tür</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Tarih Aralığı</th>
                                            <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-widest">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {myRequests.map((req) => (
                                            <tr key={req.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-gray-900">{req.type}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(req.start_date).toLocaleDateString()} - {new Date(req.end_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {getStatusBadge(req)}
                                                </td>
                                            </tr>
                                        ))}
                                        {myRequests.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-gray-400 font-medium">Henüz bir izin talebiniz bulunmuyor.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Yeni İzin Talebi</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateRequest} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">İzin Türü</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold appearance-none bg-white"
                                    required
                                >
                                    <option value="Annual">Yıllık İzin</option>
                                    <option value="Sick">Hastalık İzni</option>
                                    <option value="Remote">Uzaktan Çalışma</option>
                                    <option value="Unpaid">Ücretsiz İzin</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Başlangıç</label>
                                    <input
                                        type="date"
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bitiş</label>
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Açıklama</label>
                                <textarea
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold min-h-[100px]"
                                    placeholder="İzin talebiniz hakkında kısa bilgi verin..."
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                                >
                                    Talep Oluştur
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase active:scale-95 transition-all"
                                >
                                    İptal
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
