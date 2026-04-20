'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// WebRTC sinyalleşme mesaj yapısı
interface SinyalMesaji {
    type: string;
    sender_id: string;
    target_id?: string;
    meeting_id: string;
    payload: any;
}

// Görüşme durumunu tutan veri yapısı
interface GorusmeDurumu {
    aktifMi: boolean;
    toplantiId: string | null;
    yerelYayin: MediaStream | null;
    uzakYayinlar: Map<string, MediaStream>;
    sessizMi: boolean;
    kameraKapaliMi: boolean;
    videoCihazlari: MediaDeviceInfo[];
    seciliKameraId: string;
}

// Context üzerinden dışarı açılan fonksiyonlar
interface GorusmeContextTipi {
    durum: GorusmeDurumu;
    gorusmeyiBaslat: (toplantiId: string, cihazId?: string) => Promise<void>;
    gorusmeyiBitir: () => void;
    sesiAcKapat: () => void;
    kamerayiAcKapat: () => void;
    kamerayiDegistir: (cihazId: string) => Promise<void>;
}

const GorusmeContext = createContext<GorusmeContextTipi | undefined>(undefined);

// Google STUN sunucuları (Bağlantı kurmak için kullanılır)
const ICE_SUNUCULARI = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

export function CallProvider({ children }: { children: React.ReactNode }) {
    const [durum, setDurum] = useState<GorusmeDurumu>({
        aktifMi: false,
        toplantiId: null,
        yerelYayin: null,
        uzakYayinlar: new Map(),
        sessizMi: false,
        kameraKapaliMi: false,
        videoCihazlari: [],
        seciliKameraId: '',
    });

    const currentPath = usePathname();
    const gorusmeSayfasindaMi = currentPath?.includes('/call');

    const wsRef = useRef<WebSocket | null>(null);
    const peerBaglantilariRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    // Bilgisayardaki mevcut kameraları listele
    useEffect(() => {
        const cihazlariGetir = async () => {
            if (!navigator.mediaDevices) {
                console.warn('Medya cihazlarına erişilemedi: Güvensiz ortam (HTTP) veya tarayıcı desteği yok.');
                return;
            }
            try {
                const cihazlar = await navigator.mediaDevices.enumerateDevices();
                const videoGirisleri = cihazlar.filter(d => d.kind === 'videoinput');
                setDurum(prev => ({ ...prev, videoCihazlari: videoGirisleri }));
            } catch (err) {
                console.error('Cihazlar listelenirken hata oluştu:', err);
            }
        };
        cihazlariGetir();
        
        if (navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener('devicechange', cihazlariGetir);
            return () => navigator.mediaDevices.removeEventListener('devicechange', cihazlariGetir);
        }
    }, []);

    // Sunucuya mesaj gönder (Sinyalleşme)
    const mesajGonder = useCallback((mesaj: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(mesaj));
        }
    }, []);

    // Diğer kullanıcılarla bağlantı kur (Peer-to-Peer)
    const peerBaglantisiOlustur = useCallback((kullaniciId: string, yayin: MediaStream, baslaticiMi: boolean, toplantiId: string) => {
        const peer = new RTCPeerConnection(ICE_SUNUCULARI);
        peerBaglantilariRef.current.set(kullaniciId, peer);

        // Kendi ses/görüntü track'lerimizi ekle
        yayin.getTracks().forEach(track => peer.addTrack(track, yayin));

        // Karşı taraftan görüntü gelince kaydet
        peer.ontrack = (event) => {
            setDurum(prev => {
                const yeniUzakYayinlar = new Map(prev.uzakYayinlar);
                yeniUzakYayinlar.set(kullaniciId, event.streams[0]);
                return { ...prev, uzakYayinlar: yeniUzakYayinlar };
            });
        };

        // Bağlantı yollarını (ICE candidates) paylaş
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                mesajGonder({
                    type: 'candidate',
                    target_id: kullaniciId,
                    meeting_id: toplantiId,
                    payload: event.candidate
                });
            }
        };

        // Eğer aramayı biz başlattıysak teklif (offer) gönder
        if (baslaticiMi) {
            peer.createOffer().then(offer => {
                peer.setLocalDescription(offer);
                mesajGonder({
                    type: 'offer',
                    target_id: kullaniciId,
                    meeting_id: toplantiId,
                    payload: offer
                });
            });
        }

        return peer;
    }, [mesajGonder]);

    // WebSocket üzerinden sinyalleşme sunucusuna bağlan
    const websocketBaglan = useCallback((toplantiId: string, yayin: MediaStream) => {
        if (wsRef.current) wsRef.current.close();

        const token = localStorage.getItem('token');
        const wsUrl = `ws://localhost:8081/api/meetings/call/ws?meetingId=${toplantiId}&token=${token}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            mesajGonder({ type: 'ready', meeting_id: toplantiId, payload: {} });
        };

        ws.onmessage = async (event) => {
            const sinyal: SinyalMesaji = JSON.parse(event.data);
            switch (sinyal.type) {
                case 'ready': // Yeni biri geldi, bağlantı kur
                    peerBaglantisiOlustur(sinyal.sender_id, yayin, true, toplantiId);
                    break;
                case 'offer': { // birinden teklif geldi, cevap ver
                    const peer = peerBaglantisiOlustur(sinyal.sender_id, yayin, false, toplantiId);
                    await peer.setRemoteDescription(new RTCSessionDescription(sinyal.payload));
                    const cevap = await peer.createAnswer();
                    await peer.setLocalDescription(cevap);
                    mesajGonder({
                        type: 'answer',
                        target_id: sinyal.sender_id,
                        meeting_id: toplantiId,
                        payload: cevap
                    });
                    break;
                }
                case 'answer': { // teklifimize cevap geldi
                    const peer = peerBaglantilariRef.current.get(sinyal.sender_id);
                    if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sinyal.payload));
                    break;
                }
                case 'candidate': { // Bağlantı yolu bulundu
                    const peer = peerBaglantilariRef.current.get(sinyal.sender_id);
                    if (peer) await peer.addIceCandidate(new RTCIceCandidate(sinyal.payload));
                    break;
                }
                case 'leave': { // Biri ayrıldı
                    const peer = peerBaglantilariRef.current.get(sinyal.sender_id);
                    if (peer) { peer.close(); peerBaglantilariRef.current.delete(sinyal.sender_id); }
                    setDurum(prev => {
                        const yeniUzakYayinlar = new Map(prev.uzakYayinlar);
                        yeniUzakYayinlar.delete(sinyal.sender_id);
                        return { ...prev, uzakYayinlar: yeniUzakYayinlar };
                    });
                    break;
                }
            }
        };
    }, [peerBaglantisiOlustur, mesajGonder]);

    // Görüntülü görüşmeyi başlat
    const gorusmeyiBaslat = async (toplantiId: string, cihazId?: string) => {
        try {
            const kisitlamalar: MediaStreamConstraints = {
                video: cihazId ? { deviceId: { exact: cihazId } } : true,
                audio: true
            };
            const yayin = await navigator.mediaDevices.getUserMedia(kisitlamalar);
            const videoIzleyici = yayin.getVideoTracks()[0];

            setDurum(prev => ({
                ...prev,
                aktifMi: true,
                toplantiId,
                yerelYayin: yayin,
                seciliKameraId: videoIzleyici?.getSettings().deviceId || cihazId || '',
            }));

            websocketBaglan(toplantiId, yayin);
        } catch (err) {
            console.error('Medya cihazlarına erişilemedi:', err);
            setDurum(prev => ({ ...prev, toplantiId, aktifMi: false }));
            throw err;
        }
    };

    // Görüşmeyi sonlandır
    const gorusmeyiBitir = useCallback(() => {
        durum.yerelYayin?.getTracks().forEach(t => t.stop());
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        peerBaglantilariRef.current.forEach(p => p.close());
        peerBaglantilariRef.current.clear();
        setDurum(prev => ({
            ...prev,
            aktifMi: false,
            toplantiId: null,
            yerelYayin: null,
            uzakYayinlar: new Map(),
            sessizMi: false,
            kameraKapaliMi: false,
        }));
    }, [durum.yerelYayin]);

    // Mikrofonu aç/kapat
    const sesiAcKapat = () => {
        if (durum.yerelYayin) {
            const yeniSesDurumu = !durum.sessizMi;
            durum.yerelYayin.getAudioTracks().forEach(t => t.enabled = !yeniSesDurumu);
            setDurum(prev => ({ ...prev, sessizMi: yeniSesDurumu }));
        }
    };

    // Kamerayı aç/kapat
    const kamerayiAcKapat = () => {
        if (durum.yerelYayin) {
            const yeniKameraDurumu = !durum.kameraKapaliMi;
            durum.yerelYayin.getVideoTracks().forEach(t => t.enabled = !yeniKameraDurumu);
            setDurum(prev => ({ ...prev, kameraKapaliMi: yeniKameraDurumu }));
        }
    };

    // Kamera cihazını değiştir
    const kamerayiDegistir = async (cihazId: string) => {
        // Eğer henüz yayın yoksa (ilk açılış hatası), baştan başlat
        if (!durum.yerelYayin) {
            if (durum.toplantiId) {
                return gorusmeyiBaslat(durum.toplantiId, cihazId);
            }
            return;
        }

        try {
            const yeniYayin = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: cihazId } }
            });
            const yeniVideoTrack = yeniYayin.getVideoTracks()[0];

            // Mevcut yayındaki track'i durdur ve yenisiyle değiştir
            const eskiVideoTrackler = durum.yerelYayin.getVideoTracks();
            eskiVideoTrackler.forEach(track => {
                durum.yerelYayin?.removeTrack(track);
                track.stop();
            });
            durum.yerelYayin.addTrack(yeniVideoTrack);

            // Tüm bağlı kullanıcılara yeni track'i bildir
            peerBaglantilariRef.current.forEach(peer => {
                const videoGonderici = peer.getSenders().find(s => s.track?.kind === 'video');
                if (videoGonderici) {
                    videoGonderici.replaceTrack(yeniVideoTrack);
                }
            });

            // React'in değişikliği algılaması için yeni bir akış referansı oluştur
            const guncellenmişYayin = new MediaStream(durum.yerelYayin.getTracks());

            setDurum(prev => ({
                ...prev,
                yerelYayin: guncellenmişYayin,
                seciliKameraId: cihazId,
                kameraKapaliMi: false
            }));
        } catch (err) {
            console.error('Kamera değiştirilirken hata oluştu:', err);
            throw err;
        }
    };

    return (
        <GorusmeContext.Provider value={{
            durum,
            gorusmeyiBaslat,
            gorusmeyiBitir,
            sesiAcKapat,
            kamerayiAcKapat,
            kamerayiDegistir
        }}>
            {children}
            {durum.aktifMi && !gorusmeSayfasindaMi && <CallOverlay />}
        </GorusmeContext.Provider>
    );
}

// Navigasyon sırasında görünen küçük video overlay'i (PiP)
function CallOverlay() {
    const { durum, gorusmeyiBitir, sesiAcKapat, kamerayiAcKapat, kamerayiDegistir } = useCall();
    const [kucultulmusMu, setKucultulmusMu] = useState(false);
    const [kameraMenusuAcikMi, setKameraMenusuAcikMi] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const uzakVideoRef = useRef<HTMLVideoElement>(null);

    const ilkUzakYayin = Array.from(durum.uzakYayinlar.values())[0];

    useEffect(() => {
        if (videoRef.current && durum.yerelYayin) {
            videoRef.current.srcObject = durum.yerelYayin;
            videoRef.current.play().catch(() => { });
        }
    }, [durum.yerelYayin]);

    useEffect(() => {
        if (uzakVideoRef.current && ilkUzakYayin) {
            uzakVideoRef.current.srcObject = ilkUzakYayin;
            uzakVideoRef.current.play().catch(() => { });
        }
    }, [ilkUzakYayin]);

    if (kucultulmusMu) {
        return (
            <div
                className="fixed bottom-6 right-6 w-16 h-16 bg-purple-600 rounded-full shadow-2xl flex items-center justify-center cursor-pointer z-[9999] hover:scale-110 transition-transform"
                onClick={() => setKucultulmusMu(false)}
            >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse absolute top-0 right-0 border-2 border-white" />
            </div>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-72 bg-gray-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden z-[9999] flex flex-col group animate-in slide-in-from-right fade-in duration-300">
            <div className="relative aspect-video bg-black overflow-hidden">
                {ilkUzakYayin ? (
                    <video ref={uzakVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-gray-950">
                        Bekleniyor...
                    </div>
                )}

                <div className="absolute top-2 right-2 w-20 aspect-[3/4] bg-gray-800 rounded-lg border border-white/10 shadow-lg overflow-hidden">
                    <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${durum.kameraKapaliMi ? 'hidden' : ''}`} />
                    {durum.kameraKapaliMi && <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">Cam Off</div>}
                </div>

                <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setKucultulmusMu(true)} className="p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70"><div className="w-3 h-3 border-b-2 border-white" /></button>
                </div>
            </div>

            <div className="p-3 flex items-center justify-between gap-3 bg-gray-900">
                <div className="flex gap-1">
                    <button onClick={sesiAcKapat} className={`p-2 rounded-xl transition text-[10px] font-bold ${durum.sessizMi ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                        Mic
                    </button>
                    <div className="relative">
                        <button onClick={() => setKameraMenusuAcikMi(!kameraMenusuAcikMi)} className={`p-2 rounded-xl transition text-[10px] font-bold ${durum.kameraKapaliMi ? 'bg-red-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                            Cam
                        </button>
                        {kameraMenusuAcikMi && (
                            <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-800 rounded-xl shadow-2xl border border-white/10 p-2 z-20">
                                {durum.videoCihazlari.map(cihaz => (
                                    <button
                                        key={cihaz.deviceId}
                                        onClick={() => { kamerayiDegistir(cihaz.deviceId); setKameraMenusuAcikMi(false); }}
                                        className={`w-full text-left p-2 rounded-lg text-[10px] transition ${durum.seciliKameraId === cihaz.deviceId ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-white/5'}`}
                                    >
                                        {cihaz.label || `Kamera ${cihaz.deviceId.slice(0, 4)}`}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <button onClick={gorusmeyiBitir} className="p-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-bold text-[10px]">Kapat</button>
            </div>
        </div>
    );
}

// Hook: Context'e erişmek için kullanılır
export function useCall() {
    const context = useContext(GorusmeContext);
    if (context === undefined) {
        throw new Error('useCall bir CallProvider içerisinde kullanılmalıdır');
    }
    return context;
}
