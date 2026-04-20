'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';

export default function CreateOrganization() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            console.log('Creating organization:', name);
            const org = await apiClient.createOrganization(name);
            console.log('Organization created:', org);

            // After creating org, select it to get token with org context
            console.log('Selecting organization:', org.id);
            const { token } = await apiClient.selectOrganization(org.id);
            console.log('Organization selected, got new token');

            localStorage.setItem('token', token);
            router.push('/dashboard');
        } catch (err) {
            console.error('Error creating organization:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create organization';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Organization</h1>
                        <p className="text-gray-600">Set up your company workspace</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Organization Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                placeholder="Acme Inc."
                                required
                            />
                        </div>

                        {name && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-xs text-gray-500 mb-1">Your organization URL will be:</p>
                                <p className="text-sm font-mono text-indigo-600">
                                    company-os.com/<span className="font-semibold">{generateSlug(name)}</span>
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !name}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Creating...' : 'Create Organization'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
