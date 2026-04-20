'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import Chat from '@/components/Chat';
import { decodeToken } from '@/lib/token';

export default function ChatPage() {
    const router = useRouter();
    const [userName, setUserName] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const payload = decodeToken(token);
        if (payload) {
            setUserName(payload.email.split('@')[0]);
        }
    }, [router]);

    return (
        <div className="flex h-full bg-gray-50 dark:bg-slate-950 overflow-hidden">
            <LeftSidebar />

            <div className="flex-1 md:ml-64 flex flex-col min-h-0 h-full overflow-hidden">
                <div className="hidden md:block"><TopNavbar userName={userName} /></div>
                <div className="flex-1 flex flex-col md:p-4 overflow-hidden h-full">
                    <div className="flex-1 bg-white md:rounded-3xl md:border md:border-gray-100 md:shadow-sm overflow-hidden flex flex-col h-full">
                        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Yükleniyor...</div>}>
                            <Chat />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
