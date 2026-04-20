'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Users, Settings, ArrowLeftRight } from 'lucide-react';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';
import { useCall } from '@/context/CallContext';

export default function VideoCallPage() {
    const params = useParams();
    const router = useRouter();
    const toplantiId = params.id as string;

    // GorusmeContext'ten verileri ve fonksiyonları alıyoruz (Türkçe isimlerle)
    const { durum, gorusmeyiBaslat, gorusmeyiBitir, sesiAcKapat, kamerayiAcKapat, kamerayiDegistir } = useCall();

    const [yerelGörüntüAnaEkrandaMi, setYerelGörüntüAnaEkrandaMi] = useState(false);
    const [cihazSeciciGosterilsinMi, setCihazSeciciGosterilsinMi] = useState(false);
    const [hataMesaji, setHataMesaji] = useState<string | null>(null);

    const yerelVideoRef = useRef<HTMLVideoElement>(null);
    const yuzenVideoRef = useRef<HTMLVideoElement>(null);

    // Sayfa açıldığında veya ID değiştiğinde görüşmeyi başlat (eğer aktif değilse)
    useEffect(() => {
        if (!durum.aktifMi || durum.toplantiId !== toplantiId) {
            handleGorusmeBaslat();
        }
    }, [toplantiId]);

    // Ana ekranda kendi görüntümüz varsa akışı oraya bağla
    useEffect(() => {
        const videoElementi = yerelVideoRef.current;
        if (videoElementi && durum.yerelYayin && yerelGörüntüAnaEkrandaMi) {
            videoElementi.srcObject = durum.yerelYayin;
            videoElementi.play().catch(e => console.error('Ana video oynatılamadı:', e));
        }
    }, [durum.yerelYayin, yerelGörüntüAnaEkrandaMi, durum.aktifMi]);

    // Yüzen ekranda kendi görüntümüz varsa akışı oraya bağla
    useEffect(() => {
        const yuzenElement = yuzenVideoRef.current;
        if (yuzenElement && durum.yerelYayin && !yerelGörüntüAnaEkrandaMi) {
            yuzenElement.srcObject = durum.yerelYayin;
            yuzenElement.play().catch(e => console.error('Yüzen video oynatılamadı:', e));
        }
    }, [durum.yerelYayin, yerelGörüntüAnaEkrandaMi, durum.aktifMi]);

    const handleGorusmeBaslat = async () => {
        try {
            setHataMesaji(null);
            await gorusmeyiBaslat(toplantiId);
        } catch (err: any) {
            console.error('Görüşme başlatılırken hata:', err);
            if (err.name === 'NotReadableError') {
                setHataMesaji('Kamera başka bir uygulama veya sekme tarafından kullanılıyor olabilir. Lütfen başka bir kamera seçin.');
            } else {
                setHataMesaji('Görüntülü görüşme başlatılamadı. Kamera izinlerinizi kontrol edin.');
            }
            setCihazSeciciGosterilsinMi(true);
        }
    };

    const handleGorusmeyiKapat = () => {
        gorusmeyiBitir();
        router.push('/meetings');
    };

    // Bağlı olan ilk katılımcının bilgilerini al
    const ilkUzakKullaniciId = Array.from(durum.uzakYayinlar.keys())[0];
    const ilkUzakYayin = ilkUzakKullaniciId ? durum.uzakYayinlar.get(ilkUzakKullaniciId) : null;

    return (
        <div className="flex h-screen overflow-hidden bg-gray-900 border-none">
            <LeftSidebar />
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-900">
                <TopNavbar />

                <div className="flex-1 relative flex flex-col overflow-hidden">
                    {/* Üst Bilgi Çubuğu */}
                    <div className="p-4 flex items-center justify-between bg-gray-900/80 backdrop-blur-md border-b border-white/5 z-20">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">
                                V
                            </div>
                            <div>
                                <h1 className="font-bold text-sm text-white capitalize">Canlı Toplantı</h1>
                                <p className="text-[10px] text-gray-400 flex items-center gap-1 uppercase">
                                    <Users className="w-3 h-3" /> {durum.uzakYayinlar.size + 1} Katılımcı
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setCihazSeciciGosterilsinMi(!cihazSeciciGosterilsinMi)}
                                className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-lg transition border border-white/5"
                                title="Cihaz Ayarları"
                            >
                                <Settings className="w-4 h-4" />
                            </button>
                            <div className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-[10px] font-bold flex items-center gap-2 border border-red-500/20">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> CANLI
                            </div>
                        </div>
                    </div>

                    {/* Cihaz Seçim Menüsü */}
                    {cihazSeciciGosterilsinMi && (
                        <div className="absolute inset-x-0 top-20 mx-auto w-full max-w-sm bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                            <h3 className="text-white font-bold mb-4 text-sm uppercase">Cihaz Ayarları</h3>
                            {hataMesaji && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] mb-4 font-bold lowercase">
                                    {hataMesaji}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">KAMERA</label>
                                {durum.videoCihazlari.map(cihaz => (
                                    <button
                                        key={cihaz.deviceId}
                                        onClick={async () => {
                                            try {
                                                await kamerayiDegistir(cihaz.deviceId);
                                                setHataMesaji(null);
                                                setCihazSeciciGosterilsinMi(false);
                                            } catch (e) {
                                                setHataMesaji('Bu kamera şu an kullanılamıyor.');
                                            }
                                        }}
                                        className={`w-full text-left p-3 rounded-xl text-xs transition border ${durum.seciliKameraId === cihaz.deviceId
                                                ? 'bg-purple-600 text-white border-purple-500'
                                                : 'bg-white/5 text-gray-400 border-transparent hover:bg-white/10'
                                            }`}
                                    >
                                        {cihaz.label || `Kamera ${cihaz.deviceId.slice(0, 4)}`}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCihazSeciciGosterilsinMi(false)}
                                className="w-full mt-6 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 transition uppercase"
                            >
                                Kapat
                            </button>
                        </div>
                    )}

                    {/* Görüntü Alanı */}
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-gray-950">
                        {/* Ana Ekran Konteynırı */}
                        <div className="w-full h-full relative group">
                            {(!yerelGörüntüAnaEkrandaMi && ilkUzakYayin) ? (
                                <UzakVideo yayin={ilkUzakYayin} />
                            ) : (yerelGörüntüAnaEkrandaMi && durum.yerelYayin) ? (
                                <video
                                    ref={yerelVideoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className={`w-full h-full object-cover ${durum.kameraKapaliMi ? 'hidden' : ''}`}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 bg-gray-900">
                                    <div className="w-24 h-24 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center text-4xl font-bold border-2 border-purple-500/20">
                                        ?
                                    </div>
                                    <p className="text-gray-500 font-bold tracking-widest text-sm uppercase">KATILIMCI BEKLENİYOR...</p>
                                </div>
                            )}

                            {/* Ekrandaki isim etiketi */}
                            <div className="absolute bottom-6 left-6 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl text-xs font-bold text-white border border-white/10 flex items-center gap-2 z-10 uppercase">
                                {!yerelGörüntüAnaEkrandaMi && ilkUzakKullaniciId ? `Katılımcı` : `Siz`}
                            </div>
                        </div>

                        {/* Yüzen Pencere (WhatsApp Stili) */}
                        {(ilkUzakYayin || durum.yerelYayin) && (
                            <div
                                className="absolute top-8 right-8 w-48 h-64 bg-gray-800 rounded-2xl shadow-2xl border-2 border-white/10 overflow-hidden group z-30 ring-1 ring-black/40 transition-all"
                            >
                                <div className="w-full h-full relative">
                                    {(!yerelGörüntüAnaEkrandaMi && durum.yerelYayin) ? (
                                        <video
                                            ref={yuzenVideoRef}
                                            autoPlay
                                            muted
                                            playsInline
                                            className={`w-full h-full object-cover ${durum.kameraKapaliMi ? 'hidden' : ''}`}
                                        />
                                    ) : (yerelGörüntüAnaEkrandaMi && ilkUzakYayin) ? (
                                        <UzakVideo yayin={ilkUzakYayin} />
                                    ) : (
                                        <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                                            <Users className="w-8 h-8 text-gray-500" />
                                        </div>
                                    )}

                                    {yerelGörüntüAnaEkrandaMi && !ilkUzakYayin && (
                                        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center text-[10px] text-gray-500 uppercase">Bekleniyor...</div>
                                    )}

                                    {(!yerelGörüntüAnaEkrandaMi && durum.kameraKapaliMi) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 font-bold text-purple-500 text-[10px] text-center p-2 uppercase">
                                            Kamera Kapalı
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Alt Kontrol Paneli */}
                    <div className="h-28 flex items-center justify-center gap-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent z-20">
                        {/* Mikrofon Butonu */}
                        <button
                            onClick={sesiAcKapat}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${durum.sessizMi ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                                }`}
                            title="Mikrofonu Kapat/Aç"
                        >
                            {durum.sessizMi ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>

                        {/* Kamera Butonu */}
                        <button
                            onClick={kamerayiAcKapat}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${durum.kameraKapaliMi ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10'
                                }`}
                            title="Kamerayı Kapat/Aç"
                        >
                            {durum.kameraKapaliMi ? <CameraOff className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                        </button>

                        {/* Ekran Değiştirme Butonu */}
                        <button
                            onClick={() => setYerelGörüntüAnaEkrandaMi(!yerelGörüntüAnaEkrandaMi)}
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10 ${yerelGörüntüAnaEkrandaMi ? 'ring-2 ring-purple-500 border-purple-500 text-purple-400' : ''}`}
                            title="Görüntüleri Yer Değiştir"
                        >
                            <ArrowLeftRight className="w-6 h-6" />
                        </button>

                        {/* Kapatma Butonu */}
                        <button
                            onClick={handleGorusmeyiKapat}
                            className="w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-3xl flex items-center justify-center transition-all shadow-xl shadow-red-600/30 active:scale-95"
                            title="Görüşmeyi Sonlandır"
                        >
                            <PhoneOff className="w-8 h-8" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Karşı tarafın görüntüsünü oynatan bileşen
function UzakVideo({ yayin }: { yayin: MediaStream }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.srcObject = yayin;
            videoRef.current.play().catch(e => console.error('Uzak video oynatılamadı:', e));
        }
    }, [yayin]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
        />
    );
}
