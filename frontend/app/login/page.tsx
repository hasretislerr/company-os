'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, API_BASE_URL } from '@/lib/api';
import { useGoogleLogin } from '@react-oauth/google';

export default function Login() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    const lightVideoRef = useRef<HTMLVideoElement>(null);
    const darkVideoRef = useRef<HTMLVideoElement>(null);

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            
            // Sync the videos exactly when switching themes
            if (lightVideoRef.current && darkVideoRef.current) {
                if (newTheme === 'dark') {
                    if (Math.abs(darkVideoRef.current.currentTime - lightVideoRef.current.currentTime) > 0.1) {
                        darkVideoRef.current.currentTime = lightVideoRef.current.currentTime;
                    }
                } else {
                    if (Math.abs(lightVideoRef.current.currentTime - darkVideoRef.current.currentTime) > 0.1) {
                        lightVideoRef.current.currentTime = darkVideoRef.current.currentTime;
                    }
                }
            }
            return newTheme;
        });
    };

    const loginWithGoogle = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            setError('');
            try {
                // Send the access token to our backend for verification
                const response = await fetch(`${API_BASE_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: tokenResponse.access_token }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Giriş yapılamadı.');
                }

                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                // Eski oturumdan kalma organizasyon bilgisini temizle
                localStorage.removeItem('organization_id');

                console.log("[Login] Ana auth başarılı, organizasyonlar yükleniyor...");

                try {
                    const orgs = await apiClient.listOrganizations();
                    console.log("[Login] Organizasyon listesi:", orgs?.length || 0);
                    
                    if (orgs && orgs.length > 0) {
                        // Eğer tek organizasyon varsa veya varsayılan seçilecekse
                        const selectRes = await apiClient.selectOrganization(orgs[0].id);
                        localStorage.setItem('token', selectRes.token);
                        localStorage.setItem('organization_id', orgs[0].id);
                        
                        console.log("[Login] Organizasyon otomatik seçildi ve token güncellendi:", orgs[0].name);
                    }
                    
                    // KRİTİK: Koruma Kalkanı (Grace Period) başlat
                    // Girişten sonraki ilk 5 saniye boyunca hiçbir guard yönlendirme yapmayacak.
                    localStorage.setItem('auth_grace_period', Date.now().toString());
                    console.log("[Login] Auth Grace Period (Koruma Kalkanı) başlatıldı.");
                    
                } catch (e) {
                    console.error("[Login] Organizasyon seçimi sırasında hata (yine de devam ediliyor):", e);
                }

                const finalToken = localStorage.getItem('token');
                console.log("[Login] Yönlendirme öncesi son token kontrolü:", finalToken ? "Mevcut (uzunluk: " + finalToken.length + ")" : "Eksik!");

                const isMobile = window.innerWidth < 768;
                // router.push yerine window.location.href kullanarak sayfayı tertemiz bir şekilde yüküyoruz.
                window.location.href = isMobile ? '/dashboard' : '/activity';


            } catch (err) {
                console.error("[Login] Genel login hatası:", err);
                setError(err instanceof Error ? err.message : 'Bir hata oluştu.');
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            setError('Google ile giriş iptal edildi veya başarısız oldu.');
        }
    });

    return (
        <div className="min-h-[100dvh] relative bg-black overflow-hidden flex items-center justify-center">
            
            {/* Background Videos - Playing simultaneously for seamless transition */}
            <div className="absolute inset-0 z-0 w-full h-full">
                {/* Dark Theme Video (Bottom Layer) */}
                <video 
                    ref={darkVideoRef}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    <source src="/koyuTema.mp4" type="video/mp4" />
                </video>
                
                {/* Light Theme Video (Top Layer, fading in/out) */}
                <video 
                    ref={lightVideoRef}
                    autoPlay 
                    loop 
                    muted 
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`}
                >
                    <source src="/aydinlikTema.mp4" type="video/mp4" />
                </video>
            </div>

            {/* Top Right Theme Toggle (Lamp) */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 md:top-10 md:right-10 z-20 p-3 rounded-full hover:bg-black/10 transition-all duration-300 group"
                title="Temayı Değiştir"
            >
                {/* Lightbulb Icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill={theme === 'light' ? 'transparent' : 'white'} stroke={theme === 'light' ? 'black' : 'white'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="transition-colors duration-500 hover:text-yellow-500 hover:fill-yellow-500">
                    <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5"/>
                    <path d="M9 18h6"/>
                    <path d="M10 22h4"/>
                </svg>
            </button>

            {/* 16:9 Object-Cover Coordinate Wrapper */}
            {/* This invisible wrapper scales exactly like `object-cover` for a 16:9 video. */}
            {/* Any element inside it using percentages (left/top) will perfectly stick to its position on the video across all screen sizes. */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[56.25vw] min-h-[100vh] min-w-[177.777vh] pointer-events-none">
                
                {/* The button container, precisely located in the 16:9 video space */}
                {/* Coordinates chosen horizontally to push entirely right into the drawn frame, and vertically below the text */}
                <div 
                    className="absolute flex flex-col items-center pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300" 
                    style={{ left: '83%', top: '68%' }}
                >
                    {error && (
                        <div className="w-[260px] mb-3 bg-red-500/90 text-white font-medium text-sm px-4 py-2 rounded-xl shadow-lg border border-red-400 text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={() => loginWithGoogle()}
                        disabled={loading}
                        className="w-[260px] h-[48px] px-4 bg-[#1a73e8] text-white rounded-full font-medium text-[15px] hover:bg-[#1557b0] hover:shadow-[0_4px_14px_rgba(26,115,232,0.4)] transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#1a73e8]/30 disabled:opacity-50 flex items-center justify-center gap-3 transform hover:-translate-y-0.5 shadow-md"
                    >
                        <svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg" className="bg-white rounded-full p-[2px]">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {loading ? 'Giriş Yapılıyor...' : 'Google ile Giriş Yap'}
                    </button>
                </div>
            </div>
        </div>
    );
}
