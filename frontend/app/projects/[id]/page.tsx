'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type Project } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';

export default function ProjectDetail() {
    const router = useRouter();
    const params = useParams();
    const projectId = params.id as string;

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadProject();
    }, [projectId]);

    const loadProject = async () => {
        try {
            const data = await apiClient.getProject(projectId);
            setProject(data);
        } catch (err) {
            setError('Proje yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Yükleniyor...</div>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error || 'Proje bulunamadı'}</div>
                    <Link href="/dashboard" className="text-indigo-600 hover:text-indigo-700">
                        Dashboard'a Dön
                    </Link>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        const styles = {
            active: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            archived: 'bg-gray-100 text-gray-800',
        };
        const labels = {
            active: 'Aktif',
            completed: 'Tamamlandı',
            archived: 'Arşivlendi',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || styles.active}`}>
                {labels[status as keyof typeof labels] || status}
            </span>
        );
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <LeftSidebar />

            <div className="flex-1 md:ml-64 overflow-y-auto bg-gray-50">
                <TopNavbar />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-6">
                        <Link
                            href={`/workspaces/${project.workspace_id}`}
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition py-2 rounded-lg"
                        >
                            <span>←</span>
                            <span>Çalışma Alanına Dön</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <h1 className="text-3xl font-bold text-gray-900">
                                        {project.name}
                                    </h1>
                                    {getStatusBadge(project.status)}
                                </div>
                                {project.description && (
                                    <p className="text-gray-600 text-lg">{project.description}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Oluşturulma Tarihi</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {new Date(project.created_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Son Güncelleme</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {new Date(project.updated_at).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="text-sm text-gray-600 mb-1">Durum</div>
                                <div className="text-lg font-semibold text-gray-900">
                                    {project.status === 'active' && 'Aktif'}
                                    {project.status === 'completed' && 'Tamamlandı'}
                                    {project.status === 'archived' && 'Arşivlendi'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Panolar</h2>
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-gray-600 mb-6">
                                Görevleri organize etmek için bir pano oluştur
                            </p>
                            <Link
                                href={`/boards/new?project=${projectId}`}
                                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                            >
                                Pano Oluştur
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
