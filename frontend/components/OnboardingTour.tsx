'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTour } from '@/context/TourContext';
import './OnboardingTour.css';

interface Step {
    selector: string;
    title: string;
    content: string;
}

const commonStepsBefore: Step[] = [
    {
        selector: '#guide-sidebar',
        title: 'Yan Menü',
        content: 'Burası ana kontrol panelinizdir. Tüm modüllere buradan hızlıca erişebilirsiniz.'
    },
    {
        selector: '.guide-search-element',
        title: 'Hızlı Arama',
        content: 'Tüm sistem içinde; ekip arkadaşlarınızı, projeleri veya belirli görevleri anında bulmak için burayı kullanın.'
    }
];

const commonStepsAfter: Step[] = [
    {
        selector: '#guide-tour-toggle',
        title: 'Kullanım Kılavuzu',
        content: 'Herhangi bir adımda yardıma ihtiyacınız olursa buradan rehberi tekrar başlatabilirsiniz.'
    },
    {
        selector: '#guide-profile',
        title: 'Profil ve Ayarlar',
        content: 'Kişisel bilgilerinizi güncellemek ve sistem ayarlarına ulaşmak için burayı kullanın.'
    }
];

const dashboardSteps: Step[] = [
    {
        selector: '#guide-summary',
        title: 'Özet Kartları',
        content: 'Aktif çalışma alanlarınızın ve projelerinizin toplam sayısını buradan görebilirsiniz.'
    },
    {
        selector: '#guide-filters',
        title: 'Filtreleme Çubuğu',
        content: 'Görevleri belirli bir kişiye veya öncelik durumuna göre filtreleyebilirsiniz.'
    },
    {
        selector: '#guide-kanban',
        title: 'Görev Yönetimi',
        content: 'Tüm projeleriniz ve görevleriniz burada listelenir. Sürükle-bırak ile durumlarını yönetebilirsiniz.'
    }
];

const calendarSteps: Step[] = [
    {
        selector: '#guide-calendar',
        title: 'Takvim Görünümü',
        content: 'Tüm görevlerinizi, toplantılarınızı ve izinlerinizi bu takvim üzerinde tarihsel olarak takip edebilirsiniz.'
    },
    {
        selector: '#guide-agenda',
        title: 'Günlük Ajanda',
        content: 'Seçtiğiniz güne ait detaylı planları ve notları buradan görebilir, yeni notlar ekleyebilirsiniz.'
    }
];

const activitySteps: Step[] = [
    {
        selector: '#guide-activity-calendar',
        title: 'Mini Takvim',
        content: 'Hızlıca bugünün planlarına ve bekleyen etkinliklerinize göz atın.'
    },
    {
        selector: '#guide-activity-chats',
        title: 'Son Sohbetler',
        content: 'Ekip arkadaşlarınızıla olan son mesajlarınıza buradan ulaşabilirsiniz.'
    },
    {
        selector: '#guide-activity-tasks',
        title: 'Günlük Görev Özetleri',
        content: 'Size atanan en yakın tarihli 4 görevi buradan takip edebilirsiniz.'
    },
    {
        selector: '#guide-activity-requests',
        title: 'Talepleriniz',
        content: 'Açtığınız destek veya yardım taleplerinin durumunu buradan izleyin.'
    },
    {
        selector: '#guide-activity-announcements',
        title: 'Duyurular',
        content: 'Şirket içi en güncel duyurulara buradan hızlıca göz atabilirsiniz.'
    }
];

const trackerSteps: Step[] = [
    {
        selector: '#guide-tracker-team',
        title: 'Ekip Listesi',
        content: 'Aktivitesini incelemek istediğiniz ekip arkadaşınızı buradan seçebilirsiniz.'
    },
    {
        selector: '#guide-tracker-donut',
        title: 'Uygulama Dağılımı',
        content: 'Hangi uygulamanın ne kadar süre kullanıldığını bu grafik üzerinden görebilirsiniz.'
    },
    {
        selector: '#guide-tracker-hourly',
        title: 'Saatlik Aktivite',
        content: 'Gün içindeki aktiflik yoğunluğunu saat bazında analiz edin.'
    },
    {
        selector: '#guide-tracker-stats',
        title: 'Özet Bilgiler',
        content: 'Toplam aktif, toplantı ve boşta kalınan süreleri buradan takip edebilirsiniz.'
    },
    {
        selector: '#guide-tracker-timeline',
        title: 'Zaman Çizelgesi',
        content: 'Tüm günün aktivite akışını görsel bir şerit üzerinde inceleyin.'
    },
    {
        selector: '#guide-tracker-table',
        title: 'Detaylı Kayıtlar',
        content: 'Tüm aktiviteleri uygulama ve pencere başlığı detaylarıyla kronolojik olarak görün.'
    }
];

const membersSteps: Step[] = [
    {
        selector: '#guide-members-header',
        title: 'Personel Yönetimi',
        content: 'Organizasyonun tüm üyelerini buradan yönetebilir, yeni kullanıcılar davet edebilirsiniz.'
    },
    {
        selector: '#guide-members-table',
        title: 'Üye Listesi',
        content: 'Üyelerin rollerini ve birimlerini bu tablo üzerinden güncelleyebilirsiniz.'
    }
];

const attendanceSteps: Step[] = [
    {
        selector: '#guide-attendance-scanner',
        title: 'Giriş-Çıkış İşlemi',
        content: 'Mesaiye başlamak veya bitirmek için sanal parmak izi okuyucuyu kullanın.'
    },
    {
        selector: '#guide-attendance-history',
        title: 'Hareket Geçmişi',
        content: 'Giriş-çıkış saatlerinizi ve günlük katılım durumunuzu buradan takip edin.'
    }
];

export default function OnboardingTour() {
    const { isActive, currentStep, nextStep, stopTour } = useTour();
    const pathname = usePathname();
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const steps = useMemo(() => {
        let pageSteps: Step[] = [];
        if (pathname === '/dashboard') {
            pageSteps = dashboardSteps;
        } else if (pathname === '/calendar') {
            pageSteps = calendarSteps;
        } else if (pathname === '/activity') {
            pageSteps = activitySteps;
        } else if (pathname === '/activity-tracker') {
            pageSteps = trackerSteps;
        } else if (pathname === '/organization/members') {
            pageSteps = membersSteps;
        } else if (pathname === '/attendance') {
            pageSteps = attendanceSteps;
        }
        return [...commonStepsBefore, ...pageSteps, ...commonStepsAfter];
    }, [pathname]);

    const updateRect = useCallback(() => {
        if (!isActive || currentStep >= steps.length) return;
        
        const step = steps[currentStep];
        const elements = document.querySelectorAll(step.selector);
        let element: Element | null = null;
        
        if (elements.length > 1) {
            element = Array.from(elements).find(el => (el as HTMLElement).offsetWidth > 0) || elements[0];
        } else {
            element = elements[0] || null;
        }
        
        if (element) {
            const newRect = element.getBoundingClientRect();
            if (newRect.width === 0 && newRect.height === 0) {
                if (retryCount < 20) {
                    setRetryCount(prev => prev + 1);
                    return;
                }
                if (currentStep < steps.length - 1) nextStep();
                else stopTour();
                return;
            }
            setRect(newRect);
            setRetryCount(0);
        } else {
            // Clear current highlight if element is not found
            setRect(null);
            if (retryCount < 20) {
                setRetryCount(prev => prev + 1);
                return;
            }
            if (currentStep < steps.length - 1) nextStep();
            else stopTour();
        }
    }, [isActive, currentStep, steps, nextStep, stopTour, retryCount]);

    // Reset rect and retryCount when step changes to avoid "stuck" highlights
    useEffect(() => {
        setRect(null);
        setRetryCount(0);
    }, [currentStep]);

    useEffect(() => {
        if (isActive) {
            const timer = setTimeout(updateRect, 300);
            window.addEventListener('resize', updateRect);
            window.addEventListener('scroll', updateRect, true);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateRect);
                window.removeEventListener('scroll', updateRect, true);
            };
        } else {
            setRect(null);
            setRetryCount(0);
        }
    }, [isActive, currentStep, updateRect]);

    if (!isActive) return null;

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (currentStep < steps.length - 1) nextStep();
        else stopTour();
    };

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation();
        stopTour();
    };

    const getClipPath = () => {
        if (!rect) return 'none';
        
        const { top, left, width, height } = rect;
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        const t = top;
        const l = left;
        const r = left + width;
        const b = top + height;
        
        // This polygon construction creates a hole in the overlay
        // It draws the outer box and then the inner box in a reverse direction
        return `polygon(
            0% 0%, 
            0% 100%, 
            ${l}px 100%, 
            ${l}px ${t}px, 
            ${r}px ${t}px, 
            ${r}px ${b}px, 
            ${l}px ${b}px, 
            ${l}px 100%, 
            100% 100%, 
            100% 0%
        )`;
    };

    const getStyles = () => {
        if (!rect) return { highlight: {}, popover: {}, overlay: {} };

        const padding = 20;
        const popoverWidth = 340;
        const popoverHeight = 220; 

        let top = rect.bottom + padding;
        let left = rect.left + (rect.width / 2) - (popoverWidth / 2);

        if (rect.height > window.innerHeight * 0.7 && rect.left < 100) {
            top = 100;
            left = rect.right + padding;
        } 
        else {
            if (left < 10) left = 10;
            if (left + popoverWidth > window.innerWidth - 10) left = window.innerWidth - popoverWidth - 10;
            
            if (top + popoverHeight > window.innerHeight) {
                top = rect.top - popoverHeight - padding;
                if (top < 10) top = 50;
            }
        }

        return {
            highlight: {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`
            },
            popover: {
                top: `${top}px`,
                left: `${left}px`
            },
            overlay: {
                clipPath: getClipPath(),
                WebkitClipPath: getClipPath()
            }
        };
    };

    const styles = getStyles();

    return (
        <div className="tour-root">
            <div className="tour-overlay" onClick={handleClose} style={styles.overlay} />
            {rect && (
                <>
                    <div className="tour-highlight" style={styles.highlight} />
                    <div 
                        className="tour-popover" 
                        style={styles.popover}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="tour-popover-header">
                            <span className="tour-popover-title">{steps[currentStep].title}</span>
                            <button onClick={handleClose} className="text-gray-400 hover:text-indigo-600 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="tour-popover-content">
                            {steps[currentStep].content}
                        </div>
                        <div className="tour-popover-footer">
                            <span className="tour-step-indicator">ADIM {currentStep + 1} / {steps.length}</span>
                            <button onClick={handleNext} className="tour-btn-next">
                                {currentStep === steps.length - 1 ? 'BİTİR' : 'SIRADAKİ'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
