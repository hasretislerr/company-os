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
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <div className="hidden md:block">
                <LeftSidebar />
            </div>

            <div className="flex-1 md:ml-80 flex flex-col min-w-0">
                <div className="hidden md:block">
                    <TopNavbar userName={userName} />
                </div>

                <main className="flex-1 flex flex-col overflow-hidden relative">
                    <div className="flex-1 overflow-hidden md:p-8">
                        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Yükleniyor...</div>}>
                            <Chat />
                        </Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}
