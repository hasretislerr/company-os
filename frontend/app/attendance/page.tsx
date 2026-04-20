'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ArrowUpRight,
    Search,
    Zap
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { hasOrganizationContext } from '@/lib/token';
import { isAuthGracePeriod, traceRedirect } from '@/lib/auth-util';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import FingerprintScanner from '@/components/FingerprintScanner';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function AttendancePage() {
    const router = useRouter();
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !hasOrganizationContext(token)) {
            if (isAuthGracePeriod()) {
                console.log('[AttendanceGuard] Token veya Org yok ama Hoşgörü Süresi içinde; yönlendirme ertelendi.');
                return;
            }
            traceRedirect('/login', 'Attendance page guard: No token or org context found');
            router.push('/login');
            return;
        }
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            const data = await apiClient.listDailyAttendance();
            const sorted = Array.isArray(data)
                ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                : [];
            setRecords(sorted || []);
        } catch (err) {
            console.error('Katılım verileri yüklenemedi:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScanComplete = async () => {
        const needsCheckOut = records.length > 0 && records[0].check_in_at && !records[0].check_out_at;

        try {
            if (needsCheckOut) {
                await apiClient.checkOut();
            } else {
                await apiClient.checkIn();
            }
            fetchAttendance();
        } catch (err) {
            toast.error('İşlem başarısız: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
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

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'present': return 'Mevcut';
            case 'absent': return 'Gelmedi';
            case 'late': return 'Geç Kaldı';
            case 'early_out': return 'Erken Çıktı';
            default: return status;
        }
    };

    const needsCheckOut = records.length > 0 && records[0].check_in_at && !records[0].check_out_at;

    return (
        <div className="flex bg-background md:min-h-screen">
            <LeftSidebar />

            <div className="flex-1 md:ml-80 flex flex-col min-h-0">
                <div className="hidden md:block"><TopNavbar /></div>
                <div className="flex-1 flex flex-col p-10 pb-32">
                    <div className="flex-1 bg-white rounded-3xl md:border md:border-gray-100 md:shadow-sm p-6 flex flex-col min-h-[500px]">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-10 px-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/20">
                                        <Clock className="w-7 h-7 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black text-foreground tracking-tight">Katılım Durumum</h1>
                                        <p className="text-gray-500 font-medium tracking-tight text-sm">Giriş-çıkış takibi</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 px-2">
                                {/* Fingerprint Scanner Section */}
                                <div id="guide-attendance-scanner" className="flex justify-center">
                                    <FingerprintScanner
                                        mode={needsCheckOut ? 'check-out' : 'check-in'}
                                        onScanComplete={handleScanComplete}
                                    />
                                </div>

                                {/* Status Card */}
                                <div className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center gap-8">
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Bugünün Tarihi</p>
                                        <p className="text-2xl font-black text-gray-900">{format(new Date(), 'dd MMMM yyyy', { locale: tr })}</p>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Çalışma Saatleri</p>
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-sm font-bold border border-gray-100 shadow-sm">09:00</div>
                                            <div className="w-4 h-[2px] bg-gray-200"></div>
                                            <div className="px-3 py-1 bg-white text-indigo-600 rounded-lg text-sm font-bold border border-gray-100 shadow-sm">18:00</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Sistem Durumu</p>
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                                            <p className="text-xl font-black text-emerald-600 tracking-tight">Aktif</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div id="guide-attendance-history" className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mx-2">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                                    <h3 className="font-bold text-foreground">Son Hareketler</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Tarih</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Giriş</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Çıkış</th>
                                                <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Durum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {records.map((rec) => (
                                                <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4 font-bold text-foreground">
                                                        {format(new Date(rec.created_at), 'dd MMM', { locale: tr })}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                        {rec.check_in_at ? format(new Date(rec.check_in_at), 'HH:mm') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                                        {rec.check_out_at ? format(new Date(rec.check_out_at), 'HH:mm') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusStyle(rec.status)}`}>
                                                            {getStatusLabel(rec.status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {records.length === 0 && !loading && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center">
                                                        <AlertCircle className="w-10 h-10 text-gray-200 mx-auto mb-4" />
                                                        <p className="text-gray-400 font-medium text-sm">Henüz kayıt bulunamadı.</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
