'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import trLocale from '@fullcalendar/core/locales/tr';
import { apiClient } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { isAuthGracePeriod, traceRedirect } from '@/lib/auth-util';
import { Calendar, Filter, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarPage() {
    const router = useRouter();
    const [events, setEvents] = useState<any[]>([]);
    const [allEvents, setAllEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['task', 'meeting', 'leave', 'holiday', 'note']));
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<Record<string, string[]>>({});
    const [newNote, setNewNote] = useState('');
    const [mounted, setMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setMounted(true);
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);

        const token = localStorage.getItem('token');
        if (!token) {
            if (isAuthGracePeriod()) {
                console.log('[CalendarGuard] Token yok ama Hoşgörü Süresi içinde; yönlendirme ertelendi.');
                return;
            }
            traceRedirect('/login', 'Calendar page guard: No token found');
            router.push('/login');
            return;
        }
        fetchEvents();

        const savedNotes = localStorage.getItem('calendar_notes');
        if (savedNotes) {
            try {
                setNotes(JSON.parse(savedNotes));
            } catch (e) {
                console.error('Notes parse error:', e);
            }
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const addNote = () => {
        if (!newNote.trim()) return;
        const updated = {
            ...notes,
            [selectedDate]: [...(notes[selectedDate] || []), newNote]
        };
        setNotes(updated);
        localStorage.setItem('calendar_notes', JSON.stringify(updated));
        setNewNote('');
    };

    const deleteNote = (index: number) => {
        const dayNotes = notes[selectedDate] || [];
        const updatedNotes = dayNotes.filter((_, i) => i !== index);
        const updated = { ...notes, [selectedDate]: updatedNotes };
        setNotes(updated);
        localStorage.setItem('calendar_notes', JSON.stringify(updated));
    };

    const currentDayNotes = notes[selectedDate] || [];

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const [tasksData, leavesData, meetingsData] = await Promise.all([
                apiClient.listMyTasks(),
                apiClient.listMyLeaveRequests(),
                apiClient.listMeetings()
            ]);

            const tasks = tasksData || [];
            const leaves = leavesData || [];
            const meetings = meetingsData || [];

            const taskEvents = tasks.filter(t => t.due_date).map(t => ({
                id: `task-${t.id}`,
                title: `📝 ${t.title}`,
                start: t.due_date,
                backgroundColor: t.priority === 'high' ? '#f87171' : '#818cf8',
                borderColor: 'transparent',
                extendedProps: { type: 'task', id: t.id }
            }));

            const leaveEvents = leaves.filter(l => l.status === 'Approved').map(l => ({
                id: l.id,
                title: `İzin: ${l.type}`,
                description: l.reason,
                start: l.start_date,
                end: l.end_date,
                backgroundColor: '#34d399',
                borderColor: 'transparent',
                extendedProps: { type: 'leave', status: l.status }
            }));

            const meetingEvents = meetings.map(m => ({
                id: `meeting-${m.id}`,
                title: `🤝 ${m.title}`,
                start: m.start_time,
                end: m.end_time,
                backgroundColor: '#fbbf24',
                borderColor: 'transparent',
                extendedProps: { type: 'meeting', id: m.id }
            }));

            // Özel Günler ve Resmi Tatiller (2026)
            const holidayEvents = [
                { title: 'Yılbaşı', start: '2026-01-01', backgroundColor: '#a5b4fc', type: 'holiday' },
                { title: 'Ulusal Egemenlik ve Çocuk Bayramı', start: '2026-04-23', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'İşçi Bayramı', start: '2026-05-01', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'Anneler Günü', start: '2026-05-10', backgroundColor: '#f472b6', type: 'holiday' },
                { title: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', start: '2026-05-19', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'Babalar Günü', start: '2026-06-21', backgroundColor: '#60a5fa', type: 'holiday' },
                { title: 'Demokrasi ve Milli Birlik Günü', start: '2026-07-15', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'Zafer Bayramı', start: '2026-08-30', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'Cumhuriyet Bayramı', start: '2026-10-29', backgroundColor: '#fb7185', type: 'holiday' },
                { title: 'Atatürk\'ü Anma Günü', start: '2026-11-10', backgroundColor: '#94a3b8', type: 'holiday' },
            ].map(h => ({
                ...h,
                id: `holiday-${h.start}`,
                borderColor: 'transparent',
                allDay: true,
                extendedProps: { type: 'holiday' }
            }));

            const combined = [...taskEvents, ...leaveEvents, ...meetingEvents, ...holidayEvents];
            setAllEvents(combined);
            setEvents(combined);
        } catch (error) {
            console.error('Events load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFilter = (type: string) => {
        const next = new Set(activeFilters);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setActiveFilters(next);
        setEvents(allEvents.filter(e => next.has(e.extendedProps.type)));
    };

    const handleEventClick = (info: any) => {
        const { type, id } = info.event.extendedProps;
        if (type === 'task') router.push(`/tasks/${id}`);
        else if (type === 'leave') router.push(`/leave-requests`);
        else if (type === 'meeting') router.push(`/meetings/${id}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col h-full items-center justify-center bg-gray-50">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-4 text-sm font-black text-gray-500 animate-pulse uppercase tracking-widest">Takvim yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="flex bg-background md:min-h-screen">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <div className="flex-1 flex flex-col p-4 pt-2 max-w-[1600px] mx-auto w-full h-[calc(100vh-64px)] overflow-hidden">

                    {/* Calendar & Agenda Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                        {/* Calendar Card */}
                        <div className="lg:col-span-8 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                            <div className="flex items-center gap-2 mb-4 px-2 shrink-0 overflow-x-auto no-scrollbar py-1">
                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap mr-1">FİLTRE:</span>
                                <button
                                    onClick={() => toggleFilter('task')}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeFilters.has('task') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                >
                                    Görevler
                                </button>
                                <button
                                    onClick={() => toggleFilter('meeting')}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeFilters.has('meeting') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                >
                                    Toplantılar
                                </button>
                                <button
                                    onClick={() => toggleFilter('leave')}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeFilters.has('leave') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                >
                                    İzinler
                                </button>
                                <button
                                    onClick={() => toggleFilter('holiday')}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeFilters.has('holiday') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                >
                                    Özel Günler
                                </button>
                                <button
                                    onClick={() => toggleFilter('note')}
                                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeFilters.has('note') ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'bg-gray-50 text-gray-400 border border-transparent'}`}
                                >
                                    Notlar
                                </button>
                            </div>
                            <div id="guide-calendar" className="flex-1 calendar-container">
                                {mounted && (
                                    <FullCalendar
                                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                                        initialView="dayGridMonth"
                                        headerToolbar={{
                                            left: isMobile ? 'prev,next' : 'prev,next today',
                                            center: 'title',
                                            right: ''
                                        }}
                                        dayMaxEvents={3}
                                        locale={trLocale}
                                        firstDay={1}
                                        height="100%"
                                        fixedWeekCount={false}
                                        dayHeaderFormat={{ weekday: 'long' }}
                                        eventClick={handleEventClick}
                                        dateClick={(info) => {
                                            setSelectedDate(info.dateStr);
                                            if (window.innerWidth < 768) {
                                                const el = document.getElementById('agenda-panel');
                                                el?.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        eventTimeFormat={{
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            meridiem: false,
                                            hour12: false
                                        }}
                                        events={[
                                            ...events,
                                            ...(activeFilters.has('note') ? Object.entries(notes).flatMap(([date, dayNotes]) => 
                                                dayNotes.map((note, idx) => {
                                                    const emojis = note.match(/(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g);
                                                    const displayTitle = emojis ? emojis.join('') : '📌';
                                                    
                                                    return {
                                                        id: `note-${date}-${idx}`,
                                                        title: displayTitle,
                                                        start: date,
                                                        backgroundColor: 'transparent',
                                                        textColor: '#4f46e5',
                                                        borderColor: 'transparent',
                                                        className: 'custom-note-event',
                                                        extendedProps: { type: 'note', fullText: note }
                                                    };
                                                })
                                            ) : [])
                                        ]}
                                    />
                                )}
                            </div>
                        </div>

                        <div id="guide-agenda" className="lg:col-span-4 flex flex-col gap-4 h-full overflow-hidden">
                            <div className="bg-[#EEF2FF] rounded-[2rem] p-6 text-gray-900 border border-indigo-100 shadow-sm relative overflow-hidden group shrink-0">
                                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
                                    <Calendar className="w-24 h-24 text-indigo-400" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-900/40 mb-2">SEÇİLİ GÜN</p>
                                    <h3 className="text-2xl font-black tracking-tight mb-6 text-indigo-950">
                                        {new Date(selectedDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                                    </h3>
                                    
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar-indigo">
                                        {currentDayNotes.length > 0 ? (
                                            currentDayNotes.map((note, idx) => (
                                                <div key={idx} className="group/note flex items-start justify-between gap-3 p-4 bg-white/80 rounded-2xl border border-white shadow-sm hover:bg-white transition-all">
                                                    <p className="text-xs font-bold leading-relaxed text-indigo-950">{note}</p>
                                                    <button 
                                                        onClick={() => deleteNote(idx)}
                                                        className="opacity-0 group-hover/note:opacity-100 p-1 hover:text-rose-600 transition text-indigo-300"
                                                    >
                                                        <Plus className="w-4 h-4 rotate-45" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center">
                                                <Plus className="w-10 h-10 mb-4 stroke-[1px] text-indigo-400" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900">HENÜZ NOT YOK</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#FEF1F2] rounded-[2rem] p-6 border border-rose-100 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-black text-rose-900/40 uppercase tracking-[0.2em]">NOT EKLE</p>
                                    <div className="flex gap-1">
                                        {['🎂', '🎉', '📝', '💡', '🚨', '✅', '⭐'].map(emoji => (
                                            <button 
                                                key={emoji}
                                                onClick={() => setNewNote(prev => prev + emoji)}
                                                className="text-lg hover:scale-125 transition-transform p-1 filter drop-shadow-sm"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <textarea
                                    className="w-full bg-white/60 border-none rounded-2xl p-4 text-xs font-bold text-rose-950 placeholder:text-rose-200 focus:ring-2 focus:ring-rose-500/10 transition-all flex-1 resize-none mb-4 shadow-inner"
                                    placeholder="Bugün için bir not yazın..."
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            addNote();
                                        }
                                    }}
                                />
                                <button 
                                    onClick={addNote}
                                    className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    AJANDAYA KAYDET
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <style jsx global>{`
                .calendar-container .fc {
                    --fc-border-color: #e2e8f0;
                    --fc-daygrid-event-dot-width: 8px;
                    --fc-page-bg-color: #fbfdfe;
                    --fc-neutral-bg-color: #f8fafc;
                    --fc-list-event-hover-bg-color: #f1f5f9;
                    --fc-today-bg-color: #f0fdf4;
                    font-family: inherit;
                }
                .calendar-container .fc-view-harness {
                    background: #fbfdfe;
                    border-radius: 1.5rem;
                    overflow: hidden;
                }
                .calendar-container .fc-daygrid-day {
                    background: rgba(255, 255, 255, 0.4);
                    transition: background 0.2s ease;
                }
                .calendar-container .fc-daygrid-day:hover {
                    background: rgba(255, 255, 255, 0.8);
                }
                .calendar-container .fc-day-today {
                    background: #f0fdf4 !important;
                    box-shadow: inset 0 0 0 2px #22c55e !important;
                }
                .calendar-container .fc-daygrid-day-number {
                    color: #0f172a !important;
                    font-weight: 800 !important;
                    font-size: 0.85rem !important;
                    padding: 8px !important;
                    text-decoration: none !important;
                    z-index: 10;
                }
                .calendar-container .fc-col-header-cell {
                    background: #f8fafc;
                    border-bottom: 2px solid #e2e8f0 !important;
                }
                .calendar-container .fc-col-header-cell-cushion {
                    color: #334155 !important;
                    font-weight: 900 !important;
                    text-transform: uppercase;
                    font-size: 0.75rem !important;
                    letter-spacing: 0.1em;
                    padding: 12px !important;
                    text-decoration: none !important;
                }
                .calendar-container .fc-header-toolbar {
                    padding: 0.5rem 0;
                    margin-bottom: 0.75rem !important;
                }
                .calendar-container .fc-toolbar-title {
                    font-size: 1.25rem !important;
                    font-weight: 900 !important;
                    text-transform: capitalize;
                    letter-spacing: -0.025em;
                    color: #0f172a;
                }
                .calendar-container .fc-button {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    color: #475569 !important;
                    font-weight: 800 !important;
                    font-size: 0.75rem !important;
                    text-transform: uppercase !important;
                    padding: 0.4rem 0.8rem !important;
                    border-radius: 0.75rem !important;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
                }
                .calendar-container .fc-button:hover {
                    background: #f8fafc !important;
                    border-color: #cbd5e1 !important;
                    color: #0f172a !important;
                }
                .calendar-container .fc-button-active {
                    background: #4f46e5 !important;
                    color: white !important;
                    border-color: #4f46e5 !important;
                    box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2) !important;
                }
                .calendar-container .fc-event {
                    border-radius: 8px !important;
                    padding: 2px 6px !important;
                    font-size: 0.75rem !important;
                    font-weight: 700 !important;
                    border: none !important;
                    box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
                    transition: transform 0.2s ease !important;
                }
                .calendar-container .fc-event:hover {
                    transform: translateY(-1px);
                    filter: brightness(0.95);
                }
                .calendar-container .fc-day-sun, .calendar-container .fc-day-sat {
                    background-color: rgba(79, 70, 229, 0.04) !important;
                } 
                .calendar-container .custom-note-event {
                    box-shadow: none !important;
                    background: transparent !important;
                }
                .calendar-container .custom-note-event:hover {
                    transform: scale(1.1) !important;
                }
                .calendar-container .custom-note-event .fc-event-title {
                    font-size: 1.1rem !important;
                    color: #4f46e5 !important;
                    font-weight: 900 !important;
                    position: relative;
                    padding-left: 0;
                    display: flex;
                    justify-content: center;
                }
                .calendar-container .custom-note-event .fc-event-title::before {
                    display: none;
                }
                .custom-scrollbar-indigo::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar-indigo::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar-indigo::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
                .custom-scrollbar-indigo::-webkit-scrollbar-thumb:hover {
                    background: #cbd5e1;
                }
            `}</style>
        </div>
    );
}
