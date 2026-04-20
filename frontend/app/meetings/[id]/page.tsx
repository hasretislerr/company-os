'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type Meeting, type User } from '@/lib/api';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { Calendar, Clock, Users, Check, X, ArrowLeft, Video, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function MeetingDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUser(payload);
            } catch (e) {
                console.error('Invalid token');
            }
        }
        loadMeeting();
    }, [params.id]);

    const loadMeeting = async () => {
        if (!params.id) return;
        try {
            const data = await apiClient.getMeeting(params.id as string);
            setMeeting(data);
        } catch (error) {
            console.error('Failed to load meeting:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateStatus = async (status: 'accepted' | 'declined') => {
        if (!meeting) return;
        try {
            await apiClient.updateMeetingStatus(meeting.id, status);
            loadMeeting();
        } catch (error) {
            console.error('Failed to update status:', error);
            toast.error('Durum güncellenemedi');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!meeting) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <p className="text-gray-500">Toplantı bulunamadı.</p>
                <button onClick={() => router.back()} className="text-purple-500 font-bold hover:underline">Geri Dön</button>
            </div>
        );
    }

    const myParticipant = meeting.participants?.find(p => p.user_id === currentUser?.user_id);

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />
            <div className="flex-1 overflow-y-auto bg-gray-50">
                <TopNavbar />
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-500 hover:text-purple-600 transition mb-6 font-medium"
                    >
                        <ArrowLeft className="w-5 h-5" /> Toplantılara Dön
                    </button>

                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Header */}
                        <div className="p-8 bg-purple-500 text-white">
                            <div className="flex justify-between items-start mb-4">
                                <h1 className="text-3xl font-bold">{meeting.title}</h1>
                                {meeting.end_time && new Date(meeting.end_time) < new Date() ? (
                                    <div className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 border border-white/30 cursor-not-allowed">
                                        <Clock className="w-5 h-5" /> Süresi Geçti
                                    </div>
                                ) : (
                                    <Link
                                        href={`/meetings/${meeting.id}/call`}
                                        className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-purple-50 transition shadow-lg flex items-center gap-2"
                                    >
                                        <Video className="w-5 h-5" /> Görüntülü Katıl
                                    </Link>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-6 text-white/90">
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    {new Date(meeting.start_time).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    {new Date(meeting.start_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                    {meeting.end_time && ` - ${new Date(meeting.end_time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Users className="w-5 h-5" /> {meeting.participants?.length || 0} Katılımcı
                                </span>
                            </div>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Main Info */}
                            <div className="md:col-span-2 space-y-8">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Toplantı Gündemi</h3>
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-wrap">
                                        {meeting.description || 'Bu toplantı için henüz bir gündem belirtilmemiş.'}
                                    </p>
                                </div>

                                {myParticipant && (
                                    <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                                        <h3 className="font-bold text-purple-900 mb-4">Katılım Durumunuz</h3>
                                        <div className="flex gap-4">
                                            <button
                                                onClick={() => handleUpdateStatus('accepted')}
                                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-sm ${myParticipant.status === 'accepted'
                                                    ? 'bg-green-600 text-white border-2 border-green-700 scale-[1.02]'
                                                    : 'bg-green-500 text-white hover:bg-green-600'
                                                    }`}
                                            >
                                                <Check className="w-5 h-5" /> Katılıyorum
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus('declined')}
                                                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition shadow-sm ${myParticipant.status === 'declined'
                                                    ? 'bg-red-600 text-white border-2 border-red-700 scale-[1.02]'
                                                    : 'bg-red-500 text-white hover:bg-red-600'
                                                    }`}
                                            >
                                                <X className="w-5 h-5" /> Katılamıyorum
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Participants List */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Katılımcılar</h3>
                                <div className="space-y-3">
                                    {meeting.participants?.map((p) => (
                                        <div key={p.user_id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <div className="px-3 py-1 bg-purple-100 rounded-full font-bold text-purple-600 text-xs">
                                                    {p.user?.first_name} {p.user?.last_name}
                                                </div>
                                            </div>
                                            <span className={`p-1 rounded-full ${p.status === 'accepted' ? 'text-green-500' :
                                                p.status === 'declined' ? 'text-red-500' :
                                                    'text-gray-300'
                                                }`}>
                                                {p.status === 'accepted' ? <CheckCircle className="w-5 h-5" /> :
                                                    p.status === 'declined' ? <XCircle className="w-5 h-5" /> :
                                                        <div className="w-2 h-2 rounded-full bg-gray-300 m-1.5" />}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
