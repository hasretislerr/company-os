'use client';

import React, { useState, useEffect } from 'react';
import { HelpdeskRequest, CreateHelpdeskRequest, apiClient, User } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['IT', 'İnsan Kaynakları', 'Bakım Onarım', 'İdari İşler', 'Finans'];

const PROBLEMS_BY_DEPARTMENT: Record<string, string[]> = {
    'IT': ['Ağ/İnternet Sorunu', 'Donanım Arızası', 'Şifre Sorunları', 'Diğer'],
    'İnsan Kaynakları': ['İzin Talebi Gelemiyor', 'Bordro İtiraz', 'Performans Sistemi', 'Diğer'],
    'Bakım Onarım': ['Klima Arızası', 'Aydınlatma Sorunu', 'Tesisat Problemi', 'Diğer'],
    'İdari İşler': ['Araç Talebi', 'Kırtasiye İhtiyacı', 'Temizlik Talebi', 'Diğer'],
    'Finans': ['Harcama İtiraz', 'Bütçe Sorunu', 'Diğer'],
};

export default function RequestsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [requests, setRequests] = useState<HelpdeskRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'sent' | 'incoming'>('sent');

    const [form, setForm] = useState<CreateHelpdeskRequest>({
        department: '',
        role_name: '',
        problem_type: '',
        description: ''
    });

    useEffect(() => {
        loadUserAndRequests();
    }, []);

    const loadUserAndRequests = async () => {
        try {
            const [userData, reqData] = await Promise.all([
                apiClient.getProfile(),
                apiClient.listRequests()
            ]);
            setUser(userData);
            setRequests(reqData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.createRequest(form);
            toast.success('Talep başarıyla oluşturuldu.');
            setForm({ department: '', role_name: '', problem_type: '', description: '' });

            try {
                const reqData = await apiClient.listRequests();
                setRequests(reqData);
            } catch (err) {
                console.error(err);
            }
        } catch (error) {
            console.error('Failed to create request', error);
            toast.error('Talep oluşturulamadı.');
        }
    };

    const handleClose = async (id: string) => {
        try {
            await apiClient.closeRequest(id);
            setRequests(requests.map(r => r.id === id ? { ...r, status: 'closed' } : r));
            toast.success('Talep kapatıldı.');
        } catch (error) {
            console.error('Failed to close request', error);
            toast.error('Talep kapatılamadı.');
        }
    };

    // Açık olan talepler ve (kullanıcının kendi talebi değilse VEYA admin/yöneticiyse) 'Gelen Talepler' listesinde görünür.
    // Arka uç zaten yetkiye göre filtreleyip gönderiyor, sadece kendi gönderdiği talepleri ve kapalıları ayıklıyoruz.
    const isAdmin = user?.role === 'admin' || user?.role === 'manager';
    const incomingRequests = (requests || []).filter(r => (r.creator_id !== user?.id || isAdmin) && r.status === 'open');
    const sentRequests = (requests || []).filter(r => r.creator_id === user?.id);

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />

            <div className="flex-1 md:ml-80 overflow-y-auto bg-gray-50">
                <TopNavbar userName={user?.first_name} />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
                        {/* Form Section - Left Column */}
                        <div className="card bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Birim Seçiniz</label>
                                    <select
                                        required
                                        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50"
                                        value={form.department}
                                        onChange={e => setForm({ ...form, department: e.target.value, problem_type: '' })}
                                    >
                                        <option value="">İlgili departmanı seçiniz...</option>
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                {form.department && (
                                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">Sık Karşılaşılan Problemler</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {PROBLEMS_BY_DEPARTMENT[form.department]?.map(p => (
                                                <label key={p} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-200 ${form.problem_type === p ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 hover:bg-gray-50 hover:border-blue-300'}`}>
                                                    <input
                                                        type="radio"
                                                        name="problem_type"
                                                        value={p}
                                                        required
                                                        checked={form.problem_type === p}
                                                        onChange={e => setForm({ ...form, problem_type: e.target.value })}
                                                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                                    />
                                                    <span className={`ml-3 text-sm font-medium ${form.problem_type === p ? 'text-blue-700' : 'text-gray-700'}`}>{p}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                                    <textarea
                                        required
                                        rows={5}
                                        className="w-full border border-gray-300 rounded-xl p-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 resize-none"
                                        placeholder="Talebinizi detaylı bir şekilde açıklayın..."
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                    ></textarea>
                                </div>

                                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-[0.98]">
                                    Talebi Gönder
                                </button>
                            </form>
                        </div>

                        {/* Requests List Section */}
                        <div className="card bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-[400px]">
                            <div className="flex flex-col mb-6">
                                <h2 className="text-xl font-bold text-gray-800 mb-4">Taleplerim</h2>
                                <div className="flex self-start bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setActiveTab('sent')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'sent' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Gönderilen Talepler ({sentRequests.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('incoming')}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'incoming' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Gelen Talepler ({incomingRequests.length})
                                    </button>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                    {(activeTab === 'sent' ? sentRequests : incomingRequests).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-48 text-gray-500 space-y-3">
                                            <div className="p-4 bg-gray-50 rounded-full">
                                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                            </div>
                                            <span>Bu kategoride hiç talep bulunmuyor.</span>
                                        </div>
                                    ) : (
                                        (activeTab === 'sent' ? sentRequests : incomingRequests).map(req => (
                                            <div key={req.id} className="p-5 border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all bg-white relative overflow-hidden group">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${req.status === 'open' ? 'bg-amber-400' : 'bg-green-500'}`}></div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-lg">{req.problem_type}</h3>
                                                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                                            <span className="font-medium text-gray-700">{req.department}</span>
                                                            <span>•</span>
                                                            <span>{new Date(req.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </div>
                                                    <span className={`text-xs px-3 py-1 font-medium rounded-full ${req.status === 'open' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                                                        {req.status === 'open' ? 'Açık' : 'Kapalı'}
                                                    </span>
                                                </div>
                                                <div className="bg-gray-50 p-4 rounded-lg mt-3">
                                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>
                                                </div>
                                                {activeTab === 'incoming' && req.creator && (
                                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                                {req.creator.first_name?.[0] || 'U'}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700">Talep Sahibi: {req.creator.first_name} {req.creator.last_name}</span>
                                                        </div>

                                                        {req.status === 'open' && (
                                                            <button
                                                                onClick={() => handleClose(req.id)}
                                                                className="text-sm px-4 py-2 bg-blue-50 text-blue-600 font-semibold rounded-lg hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                                            >
                                                                ✓ Yapıldı
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
