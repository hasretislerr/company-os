'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasOrganizationContext } from '@/lib/token';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';

function SearchPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const query = searchParams?.get('q') || '';

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !hasOrganizationContext(token)) {
            router.push('/login');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const recentSearches = [
        'API endpoint\'leri',
        'Sprint 1',
        'Kullanıcı yönetimi',
        'Dashboard tasarımı',
    ];

    const quickFilters = [
        { id: 'tasks', label: 'Görevler', icon: '✓', count: 45 },
        { id: 'projects', label: 'Projeler', icon: '📁', count: 12 },
        { id: 'files', label: 'Dosyalar', icon: '📄', count: 89 },
        { id: 'people', label: 'Kişiler', icon: '👥', count: 23 },
    ];

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />

            <div className="flex-1 overflow-y-auto bg-gray-50">
                <TopNavbar />
                <div className="max-w-4xl mx-auto px-6 py-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Arama Sonuçları</h1>
                        {query && (
                            <p className="text-gray-600">
                                <span className="font-medium">"{query}"</span> için sonuçlar
                            </p>
                        )}
                    </div>

                    <div className="mb-8">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Hızlı Filtreler</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {quickFilters.map((filter) => (
                                <button
                                    key={filter.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition text-left"
                                >
                                    <div className="text-2xl mb-2">{filter.icon}</div>
                                    <div className="font-medium text-gray-900">{filter.label}</div>
                                    <div className="text-sm text-gray-500">{filter.count} sonuç</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Son Aramalar</h2>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                            {recentSearches.map((search, index) => (
                                <button
                                    key={index}
                                    className="w-full px-5 py-3 text-left hover:bg-gray-50 transition flex items-center gap-3"
                                >
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-gray-700">{search}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
            <SearchPageContent />
        </Suspense>
    );
}
