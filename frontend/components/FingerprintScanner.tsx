'use client';

import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { startAuthentication } from '@simplewebauthn/browser';
import { apiClient } from '@/lib/api';

interface FingerprintScannerProps {
    onScanComplete: () => void;
    mode: 'check-in' | 'check-out';
}

export default function FingerprintScanner({ onScanComplete, mode }: FingerprintScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const startScan = async () => {
        if (status === 'success' || isScanning) return;

        setIsScanning(true);
        setStatus('scanning');
        setErrorMessage('');

        try {
            // 1. Get options from backend
            const optionsResponse = await apiClient.webauthnBeginLogin();

            // 2. Trigger native biometric prompt
            // The go-webauthn library wraps options inside a `publicKey` key
            const assertion = await startAuthentication(optionsResponse.publicKey ?? optionsResponse);

            // 3. Send assertion to backend
            await apiClient.webauthnFinishLogin(assertion);

            // 4. Success!
            setStatus('success');
            if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(200);
            }

            setTimeout(() => {
                onScanComplete();
                setTimeout(() => {
                    setStatus('idle');
                    setIsScanning(false);
                }, 1000);
            }, 500);

        } catch (err: any) {
            console.error('Biometrik doğrulama hatası:', err);
            setStatus('error');
            setIsScanning(false);
            if (err.message?.includes('Found no credentials')) {
                setErrorMessage('Önce cihazınızı Ayarlar\'dan kaydedin');
            } else if (err.name === 'NotAllowedError') {
                setErrorMessage('İzin reddedildi');
            } else {
                setErrorMessage(err.message || 'Doğrulama başarısız');
            }

            setTimeout(() => {
                setStatus('idle');
                setErrorMessage('');
            }, 4000);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center p-8 bg-card rounded-[3rem] border border-border-custom shadow-2xl">
            <div className="relative w-48 h-48 flex items-center justify-center">
                {/* Dış Halka */}
                <div className={`absolute inset-0 rounded-full border-4 ${status === 'success' ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' :
                    status === 'error' ? 'border-rose-500' :
                        isScanning ? 'border-indigo-600 animate-pulse' : 'border-gray-100 dark:border-gray-800'
                    } transition-all duration-500`} />

                {/* Parmak İzi İkonu / Buton */}
                <button
                    onClick={startScan}
                    disabled={isScanning || status === 'success'}
                    className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 select-none ${status === 'success'
                        ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/40'
                        : status === 'error'
                            ? 'bg-rose-500 text-white'
                            : isScanning
                                ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-lg'
                        }`}
                >
                    {status === 'success' ? (
                        <CheckCircle2 className="w-16 h-16 animate-in zoom-in duration-300" />
                    ) : status === 'scanning' ? (
                        <Loader2 className="w-16 h-16 animate-spin" />
                    ) : status === 'error' ? (
                        <XCircle className="w-16 h-16" />
                    ) : (
                        <Fingerprint className="w-16 h-16" />
                    )}
                </button>
            </div>

            <div className="mt-8 text-center min-h-[60px]">
                <h3 className={`text-xl font-black tracking-tight mb-2 ${status === 'success' ? 'text-emerald-600' :
                    status === 'error' ? 'text-rose-600' : 'text-foreground'
                    }`}>
                    {status === 'success' ? 'Doğrulandı' :
                        status === 'scanning' ? 'Cihaz Bekleniyor...' :
                            status === 'error' ? 'Hata Oluştu' :
                                mode === 'check-in' ? 'Biometrik Giriş' : 'Biometrik Çıkış'}
                </h3>
                <p className="text-gray-500 font-medium text-sm">
                    {status === 'success' ? 'Kayıt işlendi.' :
                        status === 'error' ? errorMessage : 'Taramak için simgeye tıklayın'}
                </p>
            </div>

        </div>
    );
}
