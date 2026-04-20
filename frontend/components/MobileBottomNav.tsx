'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Home, 
    Calendar, 
    MessageSquare, 
    User, 
    Plus 
} from 'lucide-react';
import MobileActionMenu from './MobileActionMenu';

export default function MobileBottomNav() {
    const pathname = usePathname();
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Ana Sayfa', icon: Home, path: '/dashboard' },
        { id: 'calendar', label: 'Takvim', icon: Calendar, path: '/calendar' },
        { id: 'placeholder', label: '', icon: null, path: '#' }, // Space for center button
        { id: 'chat', label: 'Mesajlar', icon: MessageSquare, path: '/chat' },
        { id: 'profile', label: 'Profil', icon: User, path: '/profile' },
    ];

    return (
        <>
            <nav className="relative z-40 w-[92%] max-w-md px-6 py-3 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-[2.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.1)] md:hidden">
                <div className="flex items-center justify-between relative">
                    {navItems.map((item) => {
                        if (item.id === 'placeholder') {
                            return <div key={item.id} className="w-12" />;
                        }

                        const isActive = pathname === item.path;
                        const Icon = item.icon!;

                        return (
                            <Link 
                                key={item.id} 
                                href={item.path}
                                className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${
                                    isActive ? 'text-indigo-600' : 'text-gray-400'
                                }`}
                            >
                                <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'scale-110' : ''}`} />
                                <span className={`text-[8px] font-black uppercase tracking-[0.15em] transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* Central Plus Button - Circular Neon */}
                    <button 
                        onClick={() => setIsActionMenuOpen(true)}
                        className="absolute left-1/2 -top-12 -translate-x-1/2 w-16 h-16 bg-gradient-to-tr from-[#7C3AED] via-[#8B5CF6] to-[#2563EB] text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)] transform active:scale-90 transition-all hover:scale-110 border-4 border-background z-50 group"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                        <Plus className={`w-8 h-8 transition-all duration-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] ${isActionMenuOpen ? 'rotate-90 scale-110' : ''}`} />
                    </button>
                </div>
            </nav>

            <MobileActionMenu 
                isOpen={isActionMenuOpen} 
                onClose={() => setIsActionMenuOpen(false)} 
            />
        </>
    );
}
