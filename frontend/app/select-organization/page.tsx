'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, Organization } from '@/lib/api';

export default function SelectOrganization() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            const orgs = await apiClient.listOrganizations();
            setOrganizations(orgs);
        } catch (err) {
            setError('Failed to load organizations');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (orgId: string) => {
        try {
            const { token } = await apiClient.selectOrganization(orgId);
            localStorage.setItem('token', token);
            localStorage.setItem('organization_id', orgId);

            // Refresh user profile to get the new role immediately
            try {
                const user = await apiClient.getProfile();
                localStorage.setItem('user', JSON.stringify(user));
            } catch (profileErr) {
                console.error('Profile refresh failed, using stale data:', profileErr);
            }

            router.push('/dashboard');
        } catch (err) {
            setError('Failed to select organization');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Loading organizations...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-2xl">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Select Organization</h1>
                        <p className="text-gray-600">Choose which organization to work with</p>
                    </div>

                    {/* Stats Cards Mockup */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                            <div className="text-2xl mb-1">📊</div>
                            <div className="text-2xl font-bold text-indigo-900">3</div>
                            <div className="text-xs text-indigo-600 font-medium">Projeler</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                            <div className="text-2xl mb-1">📋</div>
                            <div className="text-2xl font-bold text-purple-900">0</div>
                            <div className="text-xs text-purple-600 font-medium">Panolar</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                            <div className="text-2xl mb-1">✅</div>
                            <div className="text-2xl font-bold text-green-900">0</div>
                            <div className="text-xs text-green-600 font-medium">Aktif Görevler</div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    {organizations.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 mb-6">You don't have any organizations yet.</p>
                            <button
                                onClick={() => router.push('/create-organization')}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
                            >
                                Create Your First Organization
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {organizations.map((org) => (
                                <button
                                    key={org.id}
                                    onClick={() => handleSelect(org.id)}
                                    className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-left group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition">
                                                {org.name}
                                            </h3>
                                            <p className="text-sm text-gray-500 font-mono">{org.slug}</p>
                                            <p className="text-xs text-gray-400 mt-1 capitalize">{org.plan_type} Plan</p>
                                        </div>
                                        <svg
                                            className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </div>
                                </button>
                            ))}

                            <div className="pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => router.push('/create-organization')}
                                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition text-center text-gray-600 hover:text-indigo-600 font-medium"
                                >
                                    + Create New Organization
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
