'use client';

import { useState, useEffect } from 'react';
import { apiClient, User } from '@/lib/api';
import { deptMapper, roleMapper, availableDepts, availableRoles } from '@/lib/mappers';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import toast from 'react-hot-toast';
import { decodeToken } from '@/lib/token';
import { Trash2, Edit3, UserPlus, Shield, Briefcase, Mail, X } from 'lucide-react';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function MembersPage() {
    const [members, setMembers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    
    // Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

    const [inviteStep, setInviteStep] = useState(1); 
    const [inviteForm, setInviteForm] = useState({
        first_name: '', last_name: '', email: '', role: 'member', department: 'IT'
    });
    const [verifyCode, setVerifyCode] = useState('');
    const [inviteLoading, setInviteLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            setCurrentUser(JSON.parse(userStr));
        }
        const token = localStorage.getItem('token');
        if (token) {
            const payload = decodeToken(token);
            if (payload && payload.role) {
                setCurrentUser(prev => prev ? { ...prev, role: payload.role } : { role: payload.role } as any);
            }
        }
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setIsLoading(true);
        try {
            const data = await apiClient.listUsers();
            setMembers(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Üyeler yüklenirken bir hata oluştu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMemberUpdate = async (userId: string, newRole: string, newDept: string) => {
        const orgId = localStorage.getItem('organization_id');
        if (!orgId) return;
        try {
            await apiClient.updateMemberRole(orgId, userId, newRole || 'member', newDept);
            await fetchMembers();
            toast.success('Üye güncellendi');
        } catch (err: any) {
            toast.error(err.message || 'Güncelleme hatası');
        }
    };

    const handleInviteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            if (!inviteForm.email.endsWith('@gmail.com')) throw new Error('Sadece @gmail.com uzantılı e-postalar eklenebilir.');
            await apiClient.inviteUser(inviteForm);
            toast.success('Doğrulama kodu gönderildi.');
            setInviteStep(2);
        } catch (err: any) {
            toast.error(err.message || 'Davet hatası');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleVerifySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        try {
            await apiClient.verifyUser({ email: inviteForm.email, code: verifyCode });
            toast.success('Kullanıcı başarıyla eklendi!');
            setIsInviteModalOpen(false);
            setInviteStep(1);
            fetchMembers();
        } catch (err: any) {
            toast.error(err.message || 'Doğrulama başarısız');
        } finally {
            setInviteLoading(false);
        }
    };

    const handleDeleteMember = async (userId: string) => {
        setPendingDeleteId(userId);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteMember = async () => {
        if (!pendingDeleteId) return;
        setIsDeleteModalOpen(false);
        try {
            await apiClient.deleteUser(pendingDeleteId);
            toast.success('Kullanıcı silindi');
            fetchMembers();
        } catch (err: any) {
            toast.error(err.message || 'Silme hatası');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.email === 'hasretisler0@gmail.com';



    if (isLoading) {
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
                <div className="hidden md:block"><TopNavbar userName={currentUser?.first_name} /></div>
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gray-50/50">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div id="guide-members-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Personel Yönetimi</h1>
                                <p className="text-gray-500 mt-1 font-medium">Organizasyon personelini yönetin.</p>
                            </div>
                            {isAdmin && (
                                <button onClick={() => setIsInviteModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
                                    <UserPlus className="w-5 h-5" /> Kullanıcı Davet Et
                                </button>
                            )}
                        </div>

                        {/* PC View: Table */}
                        <div id="guide-members-table" className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 tracking-widest">Kullanıcı</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 tracking-widest">Yetki</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 tracking-widest">Birim</th>
                                        <th className="px-6 py-4 text-xs font-black text-gray-400 tracking-widest text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {members.map((member) => (
                                        <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {member.avatar_url ? (
                                                        <img 
                                                            src={apiClient.getFileUrl(member.avatar_url)} 
                                                            alt="Avatar" 
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-black">
                                                            {member.first_name?.[0]}{member.last_name?.[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-gray-900 leading-none mb-1">{member.first_name} {member.last_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-medium">{member.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isAdmin && member.id !== currentUser?.id ? (
                                                    <select 
                                                        value={member.role || 'member'} 
                                                        onChange={(e) => handleMemberUpdate(member.id, e.target.value, member.department || 'unassigned')}
                                                        className="text-[10px] font-bold border-none bg-gray-50 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                                    >
                                                        {availableRoles.map(role => (
                                                            <option key={role.id} value={role.id}>{role.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                                                        {roleMapper(member.role)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isAdmin && member.id !== currentUser?.id ? (
                                                    <select 
                                                        value={member.department || 'unassigned'} 
                                                        onChange={(e) => handleMemberUpdate(member.id, member.role || 'member', e.target.value)}
                                                        className="text-[10px] font-bold border-none bg-indigo-50/50 text-indigo-700 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                                    >
                                                        <option value="unassigned">Birim Seçin</option>
                                                        {availableDepts.map(dept => (
                                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold">
                                                        {deptMapper(member.department)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isAdmin && member.id !== currentUser?.id ? (
                                                    <button onClick={() => handleDeleteMember(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                ) : <span className="text-xs text-gray-400 font-bold italic">Korumalı</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-4">
                            {members.map((member) => (
                                <div key={member.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                                    <div className="flex items-center gap-4">
                                        {member.avatar_url ? (
                                            <img 
                                                src={apiClient.getFileUrl(member.avatar_url)} 
                                                alt="Avatar" 
                                                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-md mx-auto"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-lg font-black">
                                                {member.first_name?.[0]}{member.last_name?.[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-900 tracking-tight truncate">{member.first_name} {member.last_name}</p>
                                            <div className="flex items-center gap-1 text-gray-400"><Mail className="w-3 h-3" /><p className="text-[10px] font-bold truncate">{member.email}</p></div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                                            <p className="text-[9px] font-black text-gray-400 tracking-widest mb-1.5 flex items-center gap-1 uppercase"><Shield className="w-2.5 h-2.5" /> Yetki</p>
                                            {isAdmin && member.id !== currentUser?.id ? (
                                                <select 
                                                    value={member.role || 'member'} 
                                                    onChange={(e) => handleMemberUpdate(member.id, e.target.value, member.department || 'unassigned')}
                                                    className="w-full bg-transparent text-xs font-bold text-gray-700 outline-none cursor-pointer"
                                                >
                                                    {availableRoles.map(role => (
                                                        <option key={role.id} value={role.id}>{role.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-xs font-bold text-gray-700">{roleMapper(member.role)}</p>
                                            )}
                                        </div>
                                        <div className="p-3 bg-indigo-50/30 rounded-2xl border border-indigo-50 flex flex-col">
                                            <p className="text-[9px] font-black text-indigo-300 tracking-widest mb-1.5 flex items-center gap-1 uppercase"><Briefcase className="w-2.5 h-2.5" /> Birim</p>
                                            {isAdmin && member.id !== currentUser?.id ? (
                                                <select 
                                                    value={member.department || 'unassigned'} 
                                                    onChange={(e) => handleMemberUpdate(member.id, member.role || 'member', e.target.value)}
                                                    className="w-full bg-transparent text-xs font-bold text-indigo-700 outline-none cursor-pointer"
                                                >
                                                    <option value="unassigned">Birim Seçin</option>
                                                    {availableDepts.map(dept => (
                                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <p className="text-xs font-bold text-indigo-700">{deptMapper(member.department)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {isAdmin && member.id !== currentUser?.id && (
                                        <div className="pt-2">
                                            <button 
                                                onClick={() => handleDeleteMember(member.id)} 
                                                className="w-full py-3 bg-rose-50 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" /> Personeli Sil
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black tracking-tight">Kullanıcı Davet Et</h2>
                            <button onClick={() => setIsInviteModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={inviteStep === 1 ? handleInviteSubmit : handleVerifySubmit} className="space-y-4">
                            {inviteStep === 1 ? (
                                <>
                                    <input required placeholder="Ad" value={inviteForm.first_name} onChange={e => setInviteForm({...inviteForm, first_name: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold" />
                                    <input required placeholder="Soyad" value={inviteForm.last_name} onChange={e => setInviteForm({...inviteForm, last_name: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold" />
                                    <input required type="email" placeholder="E-posta (@gmail.com)" value={inviteForm.email} onChange={e => setInviteForm({...inviteForm, email: e.target.value})} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold" />
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Yetki</label>
                                            <select 
                                                value={inviteForm.role}
                                                onChange={e => setInviteForm({...inviteForm, role: e.target.value})}
                                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                            >
                                                {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Birim</label>
                                            <select 
                                                value={inviteForm.department}
                                                onChange={e => setInviteForm({...inviteForm, department: e.target.value})}
                                                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                                            >
                                                {availableDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={inviteLoading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-2">Devam Et</button>
                                </>
                            ) : (
                                <>
                                    <input required placeholder="6 Haneli Kod" maxLength={6} value={verifyCode} onChange={e => setVerifyCode(e.target.value)} className="w-full border-2 border-gray-100 rounded-2xl px-5 py-4 text-center text-2xl font-black tracking-widest outline-none focus:border-green-500" />
                                    <button type="submit" disabled={inviteLoading} className="w-full bg-green-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-green-600/20 active:scale-95 transition-all">Doğrula ve Ekle</button>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Personeli Sil"
                message="Bu personeli silmek istediğinizden emin misiniz? Bu işlem geri alınamaz."
                confirmText="Sil"
                cancelText="Vazgeç"
                onConfirm={confirmDeleteMember}
                onCancel={() => setIsDeleteModalOpen(false)}
                variant="danger"
            />
        </div>
    );
}

