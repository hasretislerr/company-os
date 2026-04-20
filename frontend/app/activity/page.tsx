'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Calendar as CalendarIcon, 
    Clock, 
    Briefcase,
    TrendingUp,
    Play,
    MessageSquare,
    ArrowRight,
    Bell,
    Send,
    Activity,
    CheckCircle2
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { decodeToken } from '@/lib/token';
import { isAuthGracePeriod, traceRedirect } from '@/lib/auth-util';
import Link from 'next/link';

// --- Reusable Avatar Component ---
const ProfileAvatar = ({ name, src, size = "w-8 h-8", fontSize = "text-[10px]" }: { name: string, src?: string, size?: string, fontSize?: string }) => {
    const nameEncoded = encodeURIComponent(name.trim() || 'U');
    const defaultAvatar = `https://ui-avatars.com/api/?name=${nameEncoded}&background=6366f1&color=fff&size=128&bold=true`;
    const avatarSrc = src ? apiClient.getFileUrl(src) : defaultAvatar;

    return (
        <div className={`${size} rounded-xl overflow-hidden border border-white/50 shadow-sm shrink-0 flex items-center justify-center bg-indigo-50`}>
            <img 
                src={avatarSrc} 
                alt={name} 
                className="w-full h-full object-cover"
                onError={(e) => (e.target as HTMLImageElement).src = defaultAvatar}
            />
        </div>
    );
};

// --- Mini Calendar Component ---
// --- Mini Calendar Component ---
const MiniCalendar = ({ events, notes = {} }: { events: any[], notes?: Record<string, string[]> }) => {
    const [activeFilters, setActiveFilters] = useState<string[]>(['task', 'meeting', 'leave', 'holiday', 'notes']);
    const now = new Date();
    const month = now.toLocaleString('tr-TR', { month: 'long' });
    const year = now.getFullYear();
    
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    
    const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    
    const toggleFilter = (filter: string) => {
        setActiveFilters(prev => 
            prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
        );
    };

    const getEventsForDay = (day: number) => {
        const date = new Date(now.getFullYear(), now.getMonth(), day);
        return events.filter(e => {
            const start = new Date(e.start_date || e.due_date || e.start_time);
            if (date.toDateString() !== start.toDateString()) return false;
            
            const type = (e.type || '').toLowerCase();
            const isTask = type.includes('task') || !!e.due_date;
            const isMeeting = type.includes('meeting');
            const isLeave = type.includes('leave') || type.includes('izin');
            const isHoliday = type.includes('holiday');

            if (isTask && activeFilters.includes('task')) return true;
            if (isMeeting && activeFilters.includes('meeting')) return true;
            if (isLeave && activeFilters.includes('leave')) return true;
            if (isHoliday && activeFilters.includes('holiday')) return true;
            
            return false;
        });
    };

    const getNotesForDay = (day: number) => {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        return notes[dateStr] || [];
    };

    const isToday = (day: number) => day === now.getDate();

    return (
        <div className="flex flex-col h-full uppercase text-[10px]">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black tracking-widest text-emerald-900/60">{month} {year}</h3>
                
                <div className="flex gap-2 scale-90 origin-right">
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilter('task'); }}
                        className={`px-2 py-0.5 rounded-md border text-[7px] font-black transition-all ${
                            activeFilters.includes('task') ? 'bg-blue-500 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 opacity-50'
                        }`}
                    >
                        GÖREVLER
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilter('meeting'); }}
                        className={`px-2 py-0.5 rounded-md border text-[7px] font-black transition-all ${
                            activeFilters.includes('meeting') ? 'bg-orange-500 border-orange-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 opacity-50'
                        }`}
                    >
                        TOPLANTILAR
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilter('leave'); }}
                        className={`px-2 py-0.5 rounded-md border text-[7px] font-black transition-all ${
                            activeFilters.includes('leave') ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 opacity-50'
                        }`}
                    >
                        İZİNLER
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilter('holiday'); }}
                        className={`px-2 py-0.5 rounded-md border text-[7px] font-black transition-all ${
                            activeFilters.includes('holiday') ? 'bg-rose-500 border-rose-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 opacity-50'
                        }`}
                    >
                        ÖZEL GÜNLER
                    </button>
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFilter('notes'); }}
                        className={`px-2 py-0.5 rounded-md border text-[7px] font-black transition-all ${
                            activeFilters.includes('notes') ? 'bg-yellow-500 border-yellow-600 text-white shadow-sm' : 'bg-white border-gray-100 text-gray-400 opacity-50'
                        }`}
                    >
                        NOTLAR
                    </button>
                </div>
            </div>
            
            <div className="grid grid-cols-7 text-center border-t border-l border-emerald-900/10">
                {['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'].map((d, i) => (
                    <span key={i} className="text-[7px] font-bold text-gray-500/80 py-1 border-r border-b border-emerald-900/10 bg-white/30 truncate tracking-wider">{d}</span>
                ))}
            </div>
            
            <div className="grid grid-cols-7 flex-1 items-stretch border-l border-emerald-900/10 overflow-hidden rounded-b-xl shadow-inner bg-white/20">
                {Array.from({ length: offset }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-r border-b border-emerald-900/10 bg-white/5 opacity-50" />
                ))}
                {days.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const dayNotes = getNotesForDay(day);
                    const emojis = dayNotes.flatMap(n => n.match(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g) || []);
                    
                    return (
                        <div 
                            key={day} 
                            className={`
                                relative py-1 flex flex-col items-center justify-center text-[9px] font-bold transition-all border-r border-b border-emerald-900/10
                                ${isToday(day) ? 'bg-indigo-600/10' : 'text-gray-600 hover:bg-white'}
                                ${offset + daysInMonth > 35 ? 'min-h-[22px]' : 'min-h-[26px]'}
                            `}
                        >
                            {isToday(day) && (
                                <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-indigo-600" />
                            )}
                            <span className={`z-10 ${isToday(day) ? 'text-indigo-700 font-extrabold' : ''} mb-auto mt-1`}>{day}</span>
                            
                            {activeFilters.includes('notes') && emojis.length > 0 && (
                                <div className="absolute bottom-0.5 right-0.5 pointer-events-none z-10">
                                    <span className="text-base leading-none drop-shadow-sm">{emojis[0]}</span>
                                </div>
                            )}

                            <div className="absolute inset-0 flex flex-col items-center justify-end pointer-events-none pb-0.5">
                                <div className="flex gap-0.5">
                                    {dayEvents.slice(0, 3).map((e, i) => (
                                        <div 
                                            key={i} 
                                            className={`w-1 h-1 rounded-full ${
                                                e.type?.toLowerCase().includes('task') || e.due_date ? 'bg-blue-400' : 
                                                e.type?.toLowerCase().includes('meeting') ? 'bg-orange-400' : 
                                                e.type?.toLowerCase().includes('holiday') ? 'bg-rose-500' : 'bg-emerald-400'
                                            }`} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Announcements Component ---
const AnnouncementsList = ({ list }: { list: any[] }) => (
    <div className="space-y-2 h-full flex flex-col uppercase">
        <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {list.map(item => (
                <div key={item.id} className="p-3 rounded-2xl bg-white/60 border border-rose-100/30 hover:bg-white transition group cursor-pointer flex items-start gap-3">
                    <ProfileAvatar name={item.author_name || 'U'} src={item.author_avatar_url} size="w-7 h-7" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-rose-900 group-hover:text-rose-600 truncate uppercase">{item.title}</p>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[8px] font-bold text-rose-400/70">{item.author_name}</span>
                            <span className="text-[8px] font-black text-gray-300">
                                {new Date(item.created_at).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
            {list.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                    <p className="text-[9px] font-black tracking-widest">HENÜZ DUYURU YOK</p>
                </div>
            )}
        </div>
    </div>
);

// --- Requests Component ---
const RequestsList = ({ list }: { list: any[] }) => (
    <div className="space-y-2 h-full flex flex-col uppercase">
        <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {list.map(item => (
                <div key={item.id} className="p-3 rounded-2xl bg-white/60 border border-amber-100/30 hover:bg-white transition group cursor-pointer flex items-center gap-3">
                    <ProfileAvatar 
                        name={`${item.creator?.first_name || ''} ${item.creator?.last_name || ''}`} 
                        src={item.creator?.avatar_url} 
                        size="w-7 h-7" 
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md ${
                                item.status === 'open' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
                            }`}>
                                {item.status}
                            </span>
                            <span className="text-[7px] font-black text-gray-300">
                                {new Date(item.created_at).toLocaleDateString('tr-TR')}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-amber-900 truncate leading-tight uppercase">{item.problem_type}</p>
                    </div>
                </div>
            ))}
            {list.length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 opacity-30">
                    <p className="text-[9px] font-black tracking-widest">HENÜZ TALEP YOK</p>
                </div>
            )}
        </div>
    </div>
);

// --- Recent Chats / Mini Chat Component ---
const RecentChats = ({ chats, currentUser }: { chats: any[], currentUser: any }) => {
    const router = useRouter();

    if (chats.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full opacity-20 py-8">
                <MessageSquare className="w-12 h-12 mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">SOHBET YOK</p>
            </div>
        );
    }

    const renderAvatar = (room: any) => {
        let name = room.name || 'U';
        let src = '';
        
        // --- Robust Partner Detection ---
        // 1. Get current user's ID and Email from prop OR token
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const tokenPayload = token ? decodeToken(token) : null;
        
        const myId = currentUser?.id || currentUser?.user_id || tokenPayload?.user_id;
        const myEmail = currentUser?.email || currentUser?.Email || tokenPayload?.email;

        // 2. Find partner in members list
        if (room.members && Array.isArray(room.members)) {
            const partner = room.members.find((m: any) => {
                const mId = m.id || m.ID || m.user_id;
                const mEmail = m.email || m.Email;
                return (mId && mId !== myId) || (mEmail && mEmail !== myEmail);
            });

            if (partner) {
                const firstName = partner.first_name || partner.FirstName || '';
                const lastName = partner.last_name || partner.LastName || '';
                name = `${firstName} ${lastName}`.trim() || name;
                src = partner.avatar_url || partner.avatarUrl || partner.AvatarURL || '';
            }
        }

        const nameEncoded = encodeURIComponent(name.trim() || 'U');
        const defaultAvatar = `https://ui-avatars.com/api/?name=${nameEncoded}&background=6366f1&color=fff&size=128&bold=true`;
        const avatarSrc = src ? apiClient.getFileUrl(src) : defaultAvatar;

        return (
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-indigo-100/50 shadow-inner shrink-0 group-hover:scale-110 transition-all duration-300 bg-indigo-50 flex items-center justify-center">
                <img 
                    src={avatarSrc} 
                    alt={name} 
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target as HTMLImageElement).src = defaultAvatar}
                />
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1 custom-scrollbar">
            {chats.map(chat => {
                const lastMsg = chat.last_message;
                
                // --- Robust Me/Sender Detection ---
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const tokenPayload = token ? decodeToken(token) : null;
                const myId = currentUser?.id || currentUser?.user_id || tokenPayload?.user_id;
                const myEmail = currentUser?.email || currentUser?.Email || tokenPayload?.email;

                let isMe = false;
                if (lastMsg) {
                    const senderId = lastMsg.sender_id || lastMsg.SenderID;
                    const senderEmail = lastMsg.sender?.email || lastMsg.sender?.Email;
                    if (senderId && (senderId === myId)) isMe = true;
                    if (senderEmail && (senderEmail === myEmail)) isMe = true;
                }
                
                let senderDisplay = '';
                if (lastMsg) {
                    if (isMe) {
                        senderDisplay = 'Siz';
                    } else {
                        const sender = lastMsg.sender || chat.members?.find((m: any) => (m.id || m.ID) === (lastMsg.sender_id || lastMsg.SenderID));
                        if (sender) {
                            const fName = sender.first_name || sender.FirstName || '';
                            const lName = sender.last_name || sender.LastName || '';
                            senderDisplay = `${fName} ${lName}`.trim() || 'Bilinmiyor';
                        } else {
                            senderDisplay = 'Bilinmiyor';
                        }
                    }
                }
                
                // --- Robust Room Name ---
                let roomDisplayName = chat.name;
                if (chat.type === 'direct' && chat.members) {
                    const partner = chat.members.find((m: any) => {
                        const mId = m.id || m.ID || m.user_id;
                        const mEmail = m.email || m.Email;
                        return (mId && mId !== myId) || (mEmail && mEmail !== myEmail);
                    });
                    if (partner) {
                        const fName = partner.first_name || partner.FirstName || '';
                        const lName = partner.last_name || partner.LastName || '';
                        roomDisplayName = `${fName} ${lName}`.trim() || roomDisplayName;
                    }
                }

                return (
                    <div 
                        key={chat.id} 
                        onClick={() => router.push(`/organization/chat?roomId=${chat.id}`)}
                        className="flex items-center gap-4 p-3.5 rounded-[1.8rem] bg-white/60 border border-indigo-100/30 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer active:scale-95"
                    >
                        {renderAvatar(chat)}
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-black text-gray-900 truncate tracking-tight uppercase">{roomDisplayName}</p>
                                <span className="text-[8px] font-black text-indigo-300 whitespace-nowrap">
                                    {lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {senderDisplay && <span className="text-[9px] font-black text-indigo-500 uppercase">{senderDisplay}:</span>}
                                <p className="text-[10px] font-bold text-gray-500 truncate normal-case tracking-normal">
                                    {lastMsg?.content || 'Henüz mesaj yok'}
                                </p>
                            </div>
                        </div>
                        
                        <div className="opacity-0 group-hover:opacity-100 transition-all">
                            <ArrowRight className="w-4 h-4 text-indigo-300" />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- Personal Progress Component ---
const PersonalProgress = ({ stats }: { stats: any }) => (
    <div className="flex flex-col h-full uppercase gap-4 py-2">
        <div className="grid grid-cols-2 gap-3 flex-1">
            {/* Tasks Stat */}
            <div className="bg-white/60 border border-indigo-100/30 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center hover:bg-white transition-all group">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-2 group-hover:scale-110 transition shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[14px] font-black text-indigo-900 leading-none">%{stats.tasks}</p>
                    <p className="text-[7px] font-black text-indigo-300 mt-1 tracking-widest whitespace-nowrap">TAMAMLANAN GÖREV</p>
                </div>
            </div>

            {/* Attendance Stat */}
            <div className="bg-white/60 border border-emerald-100/30 rounded-[1.5rem] p-4 flex flex-col items-center justify-center text-center hover:bg-white transition-all group">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 mb-2 group-hover:scale-110 transition shrink-0">
                    <Activity className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-[14px] font-black text-emerald-900 leading-none">%{stats.attendance}</p>
                    <p className="text-[7px] font-black text-emerald-300 mt-1 tracking-widest whitespace-nowrap">BUGÜNKÜ KATILIM</p>
                </div>
            </div>
        </div>

        {/* Level/Rating Bar */}
        <div className="bg-white/60 border border-indigo-100/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-black text-indigo-900/60 tracking-widest">SİSTEM PUANI</span>
                <span className="text-[9px] font-black text-indigo-600">{stats.rating}/100</span>
            </div>
            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${stats.rating}%` }} />
            </div>
        </div>
    </div>
);

export default function ActivityDashboard() {
    const [user, setUser] = useState<any>(null);
    const [events, setEvents] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [leaves, setLeaves] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [calendarNotes, setCalendarNotes] = useState<Record<string, string[]>>({});
    const [stats, setStats] = useState({
        attendance: 0,
        tasks: 0,
        rating: 75
    });
    const [loading, setLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null); // Added for MiniChat integration fallback if needed

    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        const orgId = typeof window !== 'undefined' ? localStorage.getItem('organization_id') : null;

        if (!token) {
            if (isAuthGracePeriod()) {
                console.log('[ActivityGuard] Token yok ama Hoşgörü Süresi içinde; yönlendirme ertelendi.');
                return;
            }
            traceRedirect('/login', 'Activity page guard: No token found');
            router.push('/login');
            return;
        }

        if (!orgId) {
            router.push('/select-organization');
            return;
        }

        // Token ve orgId varsa verileri yükle
        apiClient.getProfile()
            .then(u => {
                setUser(u);
                loadData();
                setIsChecking(false);
            })
            .catch(err => {
                console.error('Profil yükleme hatası:', err);
                // Artık api.ts merkezi olarak 401 yönettiği için buradan yönlendirme yapmıyoruz.
            });
        fetchCalendarNotes();
    }, []);

    const fetchCalendarNotes = () => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('calendar_notes') : null;
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCalendarNotes(parsed);
                console.log('[Activity] Loaded notes:', Object.keys(parsed).length);
            } catch (e) {
                console.error('Activity: Notes parse error:', e);
            }
        }
    };

    const loadData = async () => {
        try {
            setLoading(true);
            fetchCalendarNotes();
            const orgId = localStorage.getItem('organization_id');
            if (!orgId) return;

            const [eventsData, projectsData, myTasks, chatsData, leavesData, announcementsData, requestsData, dailyAttendance] = await Promise.all([
                apiClient.getCalendarEvents().catch(() => []), 
                apiClient.listProjects().catch(() => []), 
                apiClient.listMyTasks().catch(() => []), 
                apiClient.listChatRooms().catch(() => []),
                apiClient.listMyLeaveRequests().catch(() => []),
                apiClient.listAnnouncements().catch(() => []),
                apiClient.listRequests().catch(() => []),
                apiClient.listDailyAttendance().catch(() => [])
            ]);

            // Özel Günler ve Resmi Tatiller (2026)
            const holidayEvents = [
                { title: 'Yılbaşı', start: '2026-01-01', backgroundColor: '#94a3b8', type: 'holiday' },
                { title: '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı', start: '2026-04-23', backgroundColor: '#ef4444', type: 'holiday' },
                { title: '1 Mayıs İşçi Bayramı', start: '2026-05-01', backgroundColor: '#ef4444', type: 'holiday' },
                { title: 'Anneler Günü', start: '2026-05-10', backgroundColor: '#ec4899', type: 'holiday' },
                { title: '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı', start: '2026-05-19', backgroundColor: '#ef4444', type: 'holiday' },
                { title: 'Babalar Günü', start: '2026-06-21', backgroundColor: '#3b82f6', type: 'holiday' },
                { title: '15 Temmuz Demokrasi ve Milli Birlik Günü', start: '2026-07-15', backgroundColor: '#ef4444', type: 'holiday' },
                { title: '30 Ağustos Zafer Bayramı', start: '2026-08-30', backgroundColor: '#ef4444', type: 'holiday' },
                { title: '29 Ekim Cumhuriyet Bayramı', start: '2026-10-29', backgroundColor: '#ef4444', type: 'holiday' },
                { title: '10 Kasım Atatürk\'ü Anma Günü', start: '2026-11-10', backgroundColor: '#475569', type: 'holiday' },
            ].map(h => ({ 
                ...h, 
                start_date: h.start, // Match the expected key in MiniCalendar
                type: 'holiday' 
            }));

            const combinedEvents = [
                ...(Array.isArray(eventsData) ? eventsData : []),
                ...holidayEvents
            ];

            setEvents(combinedEvents);
            setProjects(Array.isArray(projectsData) ? projectsData.slice(0, 4) : []);
            setTasks(Array.isArray(myTasks) ? myTasks : []);
            setAnnouncements(Array.isArray(announcementsData) ? announcementsData.slice(0, 5) : []);
            setRequests(Array.isArray(requestsData) ? requestsData.slice(0, 5) : []);
            
            // Filter and sort chats (limit to 4)
            const activeChats = Array.isArray(chatsData) 
                ? [...chatsData]
                    .sort((a, b) => {
                        const dateB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
                        const dateA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
                        return dateB - dateA;
                    })
                    .slice(0, 4)
                : [];
            setRecentChats(activeChats);
            
            setLeaves(Array.isArray(leavesData) ? leavesData.filter(l => l.status === 'Approved') : []);

            // MATHEMATICAL CALCULATIONS
            // 1. Task Completion Rate
            const totalTasks = Array.isArray(myTasks) ? myTasks.length : 0;
            const completedTasks = Array.isArray(myTasks) ? myTasks.filter((t: any) => 
                (t.column_name?.toLowerCase().includes('tamamlandı') || 
                 t.column_name?.toLowerCase().includes('done') ||
                 t.is_completed === true)
            ).length : 0;
            const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

            // 2. Daily Attendance Performance
            // Basic logic: If checked in today, calculate performance based on hours since check-in vs 8h goal
            let attendanceRate = 0;
            if (Array.isArray(dailyAttendance) && dailyAttendance.length > 0) {
                const todayLog = dailyAttendance[0]; // Assuming first is most recent
                if (todayLog.check_in_time && !todayLog.check_out_time) {
                    const checkInDate = new Date(todayLog.check_in_time);
                    const now = new Date();
                    const hoursWorked = (now.getTime() - checkInDate.getTime()) / (1000 * 60 * 60);
                    attendanceRate = Math.min(Math.round((hoursWorked / 8) * 100), 100);
                } else if (todayLog.check_out_time) {
                    attendanceRate = 100; // Completed the shift
                }
            }

            setStats({ 
                tasks: taskRate, 
                attendance: attendanceRate,
                rating: 75 
            });

        } catch (error) {
            console.error('Veri çekme hatası:', error);
        } finally {
            setLoading(false);
        }
    };

    if (isChecking || loading) return (
        <div className="flex h-screen items-center justify-center bg-[#FDF8F5]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest animate-pulse">Sistem Hazırlanıyor...</p>
            </div>
        </div>
    );

    // Greeting function removed per user request
    return (
        <div className="flex bg-[#FDF8F5] min-h-screen font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
            <LeftSidebar />
            
            <div className="flex-1 md:ml-80 flex flex-col h-screen overflow-hidden">
                <TopNavbar />
                
                <main className="flex-1 p-4 lg:p-6 overflow-hidden h-full">
                    <div className="grid grid-cols-12 grid-rows-2 gap-4 h-full">
                        
                        {/* ROW 1: CALENDAR & CHATS (6-6) */}
                        
                        {/* Calendar Summary - Span 6 */}
                        <Link id="guide-activity-calendar" href="/calendar" className="col-span-6 h-full block group/cal-card">
                            <section className="bg-[#FEF1F2] border border-rose-100 rounded-[2.5rem] p-6 shadow-xl h-full flex flex-col group/card transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-rose-500/10 cursor-pointer">
                                <div className="flex-1 overflow-hidden">
                                    <MiniCalendar events={events} notes={calendarNotes} />
                                </div>
                            </section>
                        </Link>

                        {/* Mini Chat - Span 6 */}
                        <div id="guide-activity-chats" className="col-span-6 h-full">
                            <section className="bg-[#ECFDF5] border border-emerald-100 rounded-[2.5rem] p-6 shadow-xl h-full flex flex-col group/card transition-all hover:scale-[1.01]">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-sm font-black text-emerald-900/70 uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                                        SON MESAJLAR
                                    </h2>
                                </div>
                                <div className="flex-1 overflow-hidden min-h-0">
                                    <RecentChats chats={recentChats} currentUser={user} />
                                </div>
                                <Link href="/organization/chat" className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:gap-3 transition-all">
                                    TÜM SOHBETLER <ArrowRight className="w-3 h-3" />
                                </Link>
                            </section>
                        </div>

                        {/* ROW 2: BOTTOM 3 WIDGETS (4-4-4) */}

                        {/* Tasks - Span 4 */}
                        <div id="guide-activity-tasks" className="col-span-4 h-full">
                            <section className="bg-[#E0F2FE] border border-sky-100 rounded-[2rem] p-6 shadow-xl h-full flex flex-col group/card transition-all hover:scale-[1.01]">
                                <h2 className="text-sm font-black text-sky-900/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Clock className="w-4 h-4 text-sky-400" />
                                    GÜNLÜK GÖREVLER
                                </h2>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                                    {tasks.slice(0, 4).map((task) => (
                                        <div key={task.id} className="p-3 rounded-2xl bg-white/60 border border-sky-200/50 hover:bg-white transition group flex items-center gap-3">
                                            <ProfileAvatar 
                                                name={`${task.assignee?.first_name || task.creator?.first_name || 'U'} ${task.assignee?.last_name || task.creator?.last_name || ''}`} 
                                                src={task.assignee?.avatar_url || task.creator?.avatar_url} 
                                                size="w-7 h-7"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[10px] font-black text-sky-900 group-hover:text-indigo-600 transition truncate uppercase">{task.title}</p>
                                                <p className="text-[8px] font-bold text-sky-500/70 mt-0.5 uppercase tracking-wider">
                                                    {task.due_date ? new Date(task.due_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'SÜRESİZ'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                    {tasks.length === 0 && <p className="text-center text-sky-400/40 text-[9px] font-black uppercase py-8 tracking-widest leading-loose">HENÜZ GÖREV<br/>ATANMAMIŞ</p>}
                                </div>
                                <Link href="/dashboard" className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-sky-600 uppercase tracking-widest hover:gap-3 transition-all">
                                    TÜMÜ <ArrowRight className="w-3 h-3" />
                                </Link>
                            </section>
                        </div>

                        {/* Requests - Span 4 */}
                        <div id="guide-activity-requests" className="col-span-4 h-full">
                            <section className="bg-[#FFF9E5] border border-amber-100 rounded-[2rem] p-6 shadow-xl h-full flex flex-col group/card transition-all hover:scale-[1.01]">
                                <h2 className="text-sm font-black text-amber-900/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Briefcase className="w-4 h-4 text-amber-500" />
                                    TALEPLERİM
                                </h2>
                                <div className="flex-1 overflow-hidden">
                                     <RequestsList list={requests} />
                                </div>
                                <Link href="/requests" className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest hover:gap-3 transition-all">
                                    TÜMÜ <ArrowRight className="w-3 h-3" />
                                </Link>
                            </section>
                        </div>

                        {/* Announcements - Span 4 */}
                        <div id="guide-activity-announcements" className="col-span-4 h-full">
                            <section className="bg-[#F5F3FF] border border-violet-100 rounded-[2rem] p-6 shadow-xl h-full flex flex-col group/card transition-all hover:scale-[1.01]">
                                <h2 className="text-sm font-black text-violet-900/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                                    <Bell className="w-4 h-4 text-violet-400" />
                                    DUYURULAR
                                </h2>
                                <div className="flex-1 overflow-hidden">
                                    <AnnouncementsList list={announcements} />
                                </div>
                                <Link href="/announcements" className="mt-4 flex items-center justify-center gap-2 text-[9px] font-black text-violet-600 uppercase tracking-widest hover:gap-3 transition-all">
                                    TÜMÜ <ArrowRight className="w-3 h-3" />
                                </Link>
                            </section>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
}
