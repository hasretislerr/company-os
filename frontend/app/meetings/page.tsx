'use client';

import { useState, useEffect } from 'react';
import { apiClient, Meeting, User } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { Calendar, Clock, Video, Users, Plus, X, ArrowRight, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { deptMapper, roleMapper } from '@/lib/mappers';

export default function MeetingsPage() {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        member_ids: [] as string[]
    });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadMeetings();
        loadUsers();
    }, []);

    const loadMeetings = async () => {
        try {
            const data = await apiClient.listMeetings();
            setMeetings(data || []);
        } catch (error) {
            toast.error('Toplantılar yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const data = await apiClient.listUsers();
            setUsers(data || []);
        } catch (error) {
            console.error('User load failed');
        }
    };

    const filteredUsers = users.filter(u => 
        u.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.last_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.department && deptMapper(u.department).toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await apiClient.createMeeting(formData);
            setShowModal(false);
            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                member_ids: []
            });
            loadMeetings();
            toast.success('Toplantı hazır!');
        } catch (error) {
            toast.error('Toplantı oluşturulamadı');
        }
    };

    const groupedMeetings = {
        Bugün: (meetings || []).filter(m => m.start_time && new Date(m.start_time).toDateString() === new Date().toDateString()),
        Gelecek: (meetings || []).filter(m => m.start_time && new Date(m.start_time) > new Date() && new Date(m.start_time).toDateString() !== new Date().toDateString()),
        Geçmiş: (meetings || []).filter(m => m.start_time && new Date(m.start_time) < new Date() && new Date(m.start_time).toDateString() !== new Date().toDateString())
    };

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
        <div className="flex bg-background md:min-h-screen font-sans">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <main className="flex-1 p-6 lg:p-10 overflow-y-auto bg-gray-50/50">
                    <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Toplantılar</h1>
                                <p className="text-gray-500 mt-1 font-medium">Ekibinizle olan randevularınızı yönetin.</p>
                            </div>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                            >
                                <Plus className="w-5 h-5" /> Yeni Toplantı
                            </button>
                        </div>

                        <div className="space-y-10">
                            {Object.entries(groupedMeetings).map(([day, meetings]) => meetings.length > 0 && (
                                <div key={day}>
                                    <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> {day}
                                    </h2>
                                    <div className="grid gap-4">
                                        {meetings.map((meeting) => (
                                            <div key={meeting.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all group">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                <Video className="w-5 h-5" />
                                                            </span>
                                                            <h3 className="text-xl font-bold text-gray-900">{meeting.title}</h3>
                                                        </div>
                                                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 font-medium">
                                                            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-indigo-400" /> {new Date(meeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {meeting.end_time ? `- ${new Date(meeting.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                                                            <span className="flex items-center gap-1"><Users className="w-4 h-4 text-indigo-400" /> {meeting.participants?.length || 0} Katılımcı</span>
                                                        </div>
                                                        <p className="mt-3 text-gray-400 text-sm italic">"{meeting.description}"</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                            {(meetings?.length || 0) === 0 && (
                                <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                                    <Video className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                    <p className="text-gray-400 font-medium">Henüz planlanmış bir toplantı yok.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black uppercase tracking-tight">Yeni Toplantı Planla</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateMeeting} className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Başlık</label>
                                <input
                                    required
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold"
                                    placeholder="Toplantı konusu..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Başlangıç</label>
                                    <input
                                        required
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                                        className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Bitiş</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                                        className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Katılımcı Seçin</label>
                                
                                <div className="relative mb-4">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="text"
                                        placeholder="İsim veya birim ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-5 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none focus:border-indigo-500 font-medium text-sm transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto border-2 border-gray-100 rounded-[2rem] p-3 bg-gray-50/30 custom-scrollbar">
                                    {filteredUsers.length > 0 ? filteredUsers.map(u => {
                                        const isSelected = formData.member_ids.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => {
                                                    const ids = isSelected
                                                        ? formData.member_ids.filter(id => id !== u.id)
                                                        : [...formData.member_ids, u.id];
                                                    setFormData({ ...formData, member_ids: ids });
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all text-left ${
                                                    isSelected 
                                                        ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                                        : 'bg-white border-transparent hover:border-gray-200 shadow-sm'
                                                }`}
                                            >
                                                <div className="relative">
                                                    {u.avatar_url ? (
                                                        <img 
                                                            src={apiClient.getFileUrl(u.avatar_url)} 
                                                            alt="" 
                                                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs border-2 border-white shadow-sm uppercase">
                                                            {u.first_name[0]}{u.last_name?.[0] || ''}
                                                        </div>
                                                    )}
                                                    {isSelected && (
                                                        <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-sm border border-white">
                                                            <Check className="w-2 h-2" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-900 text-sm truncate uppercase tracking-tight">
                                                        {u.first_name} {u.last_name}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded uppercase leading-none">
                                                            {deptMapper(u.department)}
                                                        </span>
                                                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-bold rounded leading-none">
                                                            {roleMapper(u.role)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    }) : (
                                        <div className="py-10 text-center">
                                            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                            <p className="text-gray-400 text-xs font-medium">Kullanıcı bulunamadı</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Açıklama</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full border-2 border-gray-100 rounded-2xl px-5 py-3 outline-none focus:border-indigo-500 font-bold min-h-[100px]"
                                    placeholder="Toplantı detayı..."
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all mt-4"
                            >
                                Toplantıyı Planla
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
