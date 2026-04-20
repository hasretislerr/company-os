'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { isAuthGracePeriod, traceRedirect } from '@/lib/auth-util';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const isMobile = window.innerWidth < 768;
      router.push(isMobile ? '/dashboard' : '/activity');
    } else {
      // KRİTİK: Koruma Kalkanı Kontrolü
      if (isAuthGracePeriod()) {
        console.log('[RootGuard] Token yok ama Hoşgörü Süresi (Grace Period) içinde; yönlendirme ertelendi.');
        return;
      }
      
      traceRedirect('/login', 'Root page guard: No token found');
      router.push('/login');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-600">Redirecting...</div>
    </div>
  );
}
