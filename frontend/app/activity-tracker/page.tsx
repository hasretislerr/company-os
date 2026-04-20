'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { apiClient, type User } from '@/lib/api';

const TRACKER_API = process.env.NEXT_PUBLIC_TRACKER_API_URL || 'http://localhost:3099';
const REFRESH_INTERVAL = 30;   // sayfa yenileme aralığı (saniye)
const TRACKER_INTERVAL = 10;   // client gönderim aralığı (saniye) — client .env ile eşleşmeli

// ─── Tipler ──────────────────────────────────────────────────
interface ActivityLog {
    id: number; employee_id: string; timestamp: string;
    app_name: string | null; window_title: string | null;
    status: 'active' | 'audio' | 'idle'; audio_status: string | null;
}
interface AppStat { name: string; minutes: number; color: string; }

const APP_COLORS = [
    '#6366f1', '#f59e0b', '#10b981', '#8b5cf6',
    '#ef4444', '#3b82f6', '#ec4899', '#14b8a6',
];

function formatDuration(m: number): string {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}s ${min}dk` : `${min}dk`;
}
function formatTime(isoStr: string): string {
    return new Date(isoStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}
function initials(u: User): string {
    return `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase();
}
function fullName(u: User): string {
    return `${u.first_name} ${u.last_name}`.trim() || u.email;
}
function timeToPercent(isoStr: string): number {
    const d = new Date(isoStr);
    return ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
}

// ─── Donut Grafik ─────────────────────────────────────────────
function DonutChart({ data, total }: { data: AppStat[]; total: number }) {
    const R = 72; const cx = 96; const cy = 96;
    const circ = 2 * Math.PI * R;
    let cum = 0;
    const slices = data.slice(0, 7).map(d => {
        const pct = total > 0 ? d.minutes / total : 0;
        const offset = circ * (1 - cum);
        cum += pct;
        return { ...d, dash: `${pct * circ} ${circ}`, offset };
    });

    return (
        <div className="flex items-center gap-5">
            <svg width={192} height={192} className="flex-shrink-0">
                <circle cx={cx} cy={cy} r={R} fill="none" strokeWidth={28}
                    stroke="currentColor" className="text-gray-100 dark:text-gray-800" />
                {slices.map((s, i) => (
                    <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                        stroke={s.color} strokeWidth={28} strokeLinecap="round"
                        strokeDasharray={s.dash} strokeDashoffset={s.offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        className="transition-all duration-500" />
                ))}
                <text x={cx} y={cy - 5} textAnchor="middle"
                    className="fill-gray-900 dark:fill-white" style={{ fontSize: 13, fontWeight: 700 }}>
                    {formatDuration(total)}
                </text>
                <text x={cx} y={cy + 13} textAnchor="middle"
                    className="fill-gray-400" style={{ fontSize: 10 }}>
                    Toplam Aktif
                </text>
            </svg>
            <div className="flex-1 space-y-2">
                {slices.length === 0
                    ? <p className="text-xs text-gray-400 text-center py-6">Kayıt yok</p>
                    : slices.map((s, i) => (
                        <div key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">
                                {formatDuration(s.minutes)}
                            </span>
                        </div>
                    ))
                }
            </div>
        </div>
    );
}

// ─── Bar Grafik — Saatlik ─────────────────────────────────────
function HourlyBar({ logs }: { logs: ActivityLog[] }) {
    const hours = Array.from({ length: 24 }, (_, h) => ({
        h,
        active: logs.filter(l => new Date(l.timestamp).getHours() === h && l.status === 'active').length,
        audio: logs.filter(l => new Date(l.timestamp).getHours() === h && l.status === 'audio').length,
    }));
    const maxVal = Math.max(...hours.map(h => h.active + h.audio), 1);
    const H = 72;

    return (
        <svg viewBox={`0 0 240 ${H + 18}`} className="w-full">
            {[0, 0.5, 1].map((p, i) => (
                <line key={i} x1={0} y1={H * (1 - p)} x2={240} y2={H * (1 - p)}
                    stroke="currentColor" strokeWidth={0.4} className="text-gray-200 dark:text-gray-700" />
            ))}
            {hours.map((h, i) => {
                const x = i * 10 + 0.5; const w = 9;
                const aH = (h.active / maxVal) * H;
                const auH = (h.audio / maxVal) * H;
                const isNow = new Date().getHours() === h.h;
                return (
                    <g key={i}>
                        {isNow && <rect x={x} y={0} width={w} height={H} fill="#6366f1" fillOpacity={0.07} />}
                        {auH > 0 && <rect x={x} y={H - aH - auH} width={w} height={auH} fill="#f59e0b" rx={1.5} />}
                        {aH > 0 && <rect x={x} y={H - aH} width={w} height={aH} fill="#6366f1" rx={1.5} />}
                        {h.h % 6 === 0 && (
                            <text x={x + w / 2} y={H + 12} textAnchor="middle"
                                className="fill-gray-400" style={{ fontSize: 7 }}>
                                {String(h.h).padStart(2, '0')}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}

// ─── Zaman Şeridi ─────────────────────────────────────────────
function TimelineTrack({ logs }: { logs: ActivityLog[] }) {
    const [tip, setTip] = useState<{ log: ActivityLog; x: number; y: number } | null>(null);
    const bw = (1 / (24 * 60)) * 100;
    const nowPct = timeToPercent(new Date().toISOString());

    return (
        <div>
            <div className="flex mb-1">
                {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
                    <div key={h} className="flex-1 text-[8px] text-gray-400 text-center">
                        {String(h).padStart(2, '0')}
                    </div>
                ))}
            </div>
            <div className="relative h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {Array.from({ length: 25 }, (_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"
                        style={{ left: `${(i / 24 * 100).toFixed(1)}%` }} />
                ))}
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 z-10"
                    style={{ left: `${nowPct.toFixed(1)}%` }} />
                {logs.filter(l => l.status !== 'idle').map(log => (
                    <div key={log.id}
                        className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all hover:brightness-110 ${log.status === 'active'
                            ? 'bg-indigo-500 shadow-[0_0_4px_rgba(99,102,241,0.6)]'
                            : 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]'
                            }`}
                        style={{ left: `${timeToPercent(log.timestamp).toFixed(2)}%`, width: `${Math.max(0.4, bw).toFixed(2)}%` }}
                        onMouseEnter={e => setTip({ log, x: e.clientX, y: e.clientY })}
                        onMouseMove={e => setTip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                        onMouseLeave={() => setTip(null)}
                    />
                ))}
                {logs.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                        Bu tarih için kayıt yok
                    </div>
                )}
            </div>
            {tip && (
                <div className="fixed z-50 pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-sm"
                    style={{ left: tip.x + 12, top: tip.y - 10, maxWidth: 260 }}>
                    <div className="font-semibold text-white">{tip.log.app_name || '—'}</div>
                    <div className="text-gray-400 text-xs mt-0.5 truncate">{tip.log.window_title || '—'}</div>
                    <div className="text-indigo-400 text-xs mt-1">{formatTime(tip.log.timestamp)}</div>
                </div>
            )}
        </div>
    );
}

// ─── Ana Sayfa ───────────────────────────────────────────────
export default function ActivityTrackerPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [orgUsers, setOrgUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [trackerOnline, setTrackerOnline] = useState(true);
    const [loading, setLoading] = useState(false);

    // Auth + kullanıcı yükle
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { router.push('/login'); return; }

        // Mevcut kullanıcı
        const userStr = localStorage.getItem('user');
        if (userStr) setCurrentUser(JSON.parse(userStr));

        // Organizasyon üyelerini Company OS API'den çek
        apiClient.listUsers().then(users => {
            // Admin/müdür hariç diğer üyeleri göster
            // (veya isteğe göre herkesi — şimdi kendisi dahil herkesi göster)
            setOrgUsers(users);
            if (users.length > 0) setSelectedUser(users[0]);
        }).catch(console.error);
    }, [router]);

    const loadLogs = useCallback(async () => {
        if (!selectedUser) return;
        setLoading(true);
        try {
            const res = await fetch(`${TRACKER_API}/api/activity/${selectedUser.id}?date=${date}`);
            const data = await res.json();
            setLogs(data.logs || []);
            setTrackerOnline(true);
        } catch {
            setTrackerOnline(false);
            setLogs([]);
        } finally { setLoading(false); }
    }, [selectedUser, date]);

    useEffect(() => { loadLogs(); setCountdown(REFRESH_INTERVAL); }, [selectedUser, date]);

    useEffect(() => {
        const ri = setInterval(loadLogs, REFRESH_INTERVAL * 1000);
        const ci = setInterval(() => setCountdown(c => c <= 1 ? REFRESH_INTERVAL : c - 1), 1000);
        return () => { clearInterval(ri); clearInterval(ci); };
    }, [loadLogs]);

    // İstatistikler
    const activeLogs = logs.filter(l => l.status === 'active');
    const audioLogs = logs.filter(l => l.status === 'audio');
    const idleLogs = logs.filter(l => l.status === 'idle');

    const appStats: AppStat[] = (() => {
        const map: Record<string, number> = {};
        logs.filter(l => l.status !== 'idle' && l.app_name)
            .forEach(l => { map[l.app_name!] = (map[l.app_name!] || 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 7)
            .map(([name, m], i) => ({ name, minutes: m, color: APP_COLORS[i % APP_COLORS.length] }));
    })();

    return (
        <div className="flex bg-background md:min-h-screen overflow-hidden">
            <LeftSidebar />
            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <TopNavbar userName={currentUser?.first_name} />

                <div className="flex flex-1 overflow-hidden">

                    {/* ─── Personel Listesi (Company OS kullanıcıları) ─── */}
                    <div id="guide-tracker-team" className="w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
                        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ekip</span>
                            {!trackerOnline && (
                                <span className="text-[9px] bg-red-100 text-red-500 px-1.5 py-0.5 rounded-full">Sunucu Kapalı</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                            {orgUsers.length === 0 ? (
                                <div className="text-xs text-gray-400 text-center p-4">Üye yükleniyor…</div>
                            ) : orgUsers.map(user => {
                                const isSel = user.id === selectedUser?.id;
                                const lastLog = logs.filter(l => l.employee_id === user.id).slice(-1)[0];
                                const dotColor = lastLog?.status === 'active' ? 'bg-indigo-500'
                                    : lastLog?.status === 'audio' ? 'bg-amber-400' : 'bg-gray-300 dark:bg-gray-600';

                                return (
                                    <button key={user.id} onClick={() => setSelectedUser(user)}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition ${isSel ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}>
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                                                {initials(user)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold truncate">{fullName(user)}</div>
                                            <div className="text-[10px] text-gray-400 truncate">
                                                {user.role === 'admin' ? '🛡️ Yönetici' : user.department || user.role || 'Personel'}
                                            </div>
                                        </div>
                                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                                    </button>
                                );
                            })}
                        </div>

                        <div className="p-3 border-t border-gray-100 dark:border-gray-800 text-[9px] text-gray-400 text-center">
                            Takip ajanı otomatik bağlanır
                        </div>
                    </div>

                    {/* ─── Ana Panel ─── */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">

                        {/* Başlık */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {selectedUser ? fullName(selectedUser) : 'Aktivite Takip Paneli'}
                                </h1>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {logs.length} kayıt · Yenileme <span className="text-green-500 font-semibold">{countdown}s</span>
                                    {selectedUser && (
                                        <span className="ml-2 font-mono opacity-50">#{selectedUser.id.slice(0, 8)}</span>
                                    )}
                                </p>
                            </div>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                  text-gray-800 dark:text-gray-200 rounded-lg px-3 py-1.5 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        {/* Sunucu uyarısı */}
                        {!trackerOnline && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
                                ⚠️ Aktivite takip sunucusuna bağlanılamıyor. Sunucuyu başlatmak için:<br />
                                <code className="bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded text-xs mt-1 inline-block">
                                    cd activity-tracker/server &amp;&amp; node src/index.js
                                </code>
                            </div>
                        )}

                        {/* Donut + Bar */}
                        <div id="guide-tracker-dashboard" className="grid grid-cols-2 gap-4">
                            <div id="guide-tracker-donut" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-500 mb-3">🍩 Uygulama Dağılımı</h3>
                                <DonutChart data={appStats} total={activeLogs.length + audioLogs.length} />
                            </div>
                            <div id="guide-tracker-hourly" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                                <h3 className="text-xs font-bold text-gray-500 mb-3">📊 Saatlik Aktivite</h3>
                                <HourlyBar logs={logs} />
                                <div className="flex gap-4 mt-2">
                                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block" />Klavye/Mouse
                                    </span>
                                    <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                                        <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block" />Ses/Toplantı
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stat Kartları — her log kaydı TRACKER_INTERVAL saniyelik periyodu temsil eder */}
                        <div id="guide-tracker-stats" className="grid grid-cols-3 gap-3">
                            {[
                                { label: '⌨️ Aktif', count: activeLogs.length, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800' },
                                { label: '🎙️ Toplantı', count: audioLogs.length, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800' },
                                { label: '💤 Boşta', count: idleLogs.length, color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800' },
                            ].map(s => {
                                const minutes = Math.round((s.count * TRACKER_INTERVAL) / 60);
                                return (
                                    <div key={s.label} className={`rounded-2xl border p-4 ${s.bg}`}>
                                        <p className="text-[10px] text-gray-500 mb-1">{s.label}</p>
                                        <p className={`text-2xl font-extrabold ${s.color}`}>{formatDuration(minutes)}</p>
                                        <p className="text-[9px] text-gray-400 mt-1">{s.count} kayıt</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Zaman Şeridi */}
                        <div id="guide-tracker-timeline" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-gray-500">⏱ Zaman Çizelgesi</h3>
                                <div className="flex gap-3 text-[10px] text-gray-400">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500 inline-block" /> Aktif</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400 inline-block" /> Ses</span>
                                    <span className="flex items-center gap-1"><span className="w-1 h-3 bg-red-400 inline-block" /> Şimdi</span>
                                </div>
                            </div>
                            <TimelineTrack logs={logs} />
                        </div>

                        {/* Tablo */}
                        <div id="guide-tracker-table" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Kronolojik Kayıtlar</h3>
                            </div>
                            {loading ? (
                                <div className="p-8 text-center text-sm text-gray-400">Yükleniyor…</div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center space-y-2">
                                    <div className="text-2xl">📭</div>
                                    <p className="text-sm text-gray-400">{selectedUser ? `${fullName(selectedUser)} için bugün kayıt yok.` : 'Kayıt yok.'}</p>
                                    <p className="text-xs text-gray-400">
                                        Takip ajanını çalıştırın ve bu kişi tarayıcıda giriş yapsın.
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto max-h-64">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                                            <tr className="border-b border-gray-100 dark:border-gray-800">
                                                {['Saat', 'Durum', 'Uygulama', 'Pencere Başlığı', 'Ses'].map(h => (
                                                    <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-semibold whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...logs].reverse().slice(0, 100).map(log => (
                                                <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800/40 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition">
                                                    <td className="px-4 py-2 font-mono text-gray-400 whitespace-nowrap">{formatTime(log.timestamp)}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${log.status === 'active' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
                                                            : log.status === 'audio' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300'
                                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                                                            }`}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {log.status === 'active' ? 'Aktif' : log.status === 'audio' ? 'Toplantı' : 'Boşta'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300 max-w-[130px] truncate">{log.app_name || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-400 max-w-[220px] truncate">{log.window_title || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-400 whitespace-nowrap">{log.audio_status || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
