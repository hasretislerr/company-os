'use client';

import { useEffect } from 'react';
import { CallProvider } from '@/context/CallContext';
import { TourProvider } from '@/context/TourContext';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Tema özellikleri kaldırıldı.
    }, []);

    return (
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'BURAYA_CLIENT_ID_GELECEK'}>
            <TourProvider>
                <CallProvider>
                    <Toaster position="top-right" />
                    {children}
                </CallProvider>
            </TourProvider>
        </GoogleOAuthProvider>
    );
}
