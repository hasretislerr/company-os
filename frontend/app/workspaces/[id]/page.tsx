'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, type Workspace, type Project } from '@/lib/api';
import Link from 'next/link';
import LeftSidebar from '@/components/LeftSidebar';
import TopNavbar from '@/components/TopNavbar';

export default function WorkspaceDetail() {
    const router = useRouter();
    const params = useParams();
    const workspaceId = params.id as string;

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadWorkspace();
        loadProjects();
    }, [workspaceId]);

    const loadWorkspace = async () => {
        try {
            const data = await apiClient.getWorkspace(workspaceId);
            setWorkspace(data);
        } catch (err) {
            setError('Çalışma alanı yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const data = await apiClient.listProjectsByWorkspace(workspaceId);
            setProjects(data);
        } catch (err) {
            console.error('Projeler yüklenirken hata:', err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-600">Yükleniyor...</div>
            </div>
        );
    }

    if (error || !workspace) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error || 'Çalışma alanı bulunamadı'}</div>
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
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.active}`}>
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
                            href="/dashboard"
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition py-2 rounded-lg"
                        >
                            <span>←</span>
                            <span>Dashboard'a Dön</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                    {workspace.name}
                                </h1>
                                {workspace.description && (
                                    <p className="text-gray-600">{workspace.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Projeler</h2>
                            <Link
                                href={`/projects/new?workspace=${workspaceId}`}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                            >
                                + Yeni Proje
                            </Link>
                        </div>

                        {projects.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                                <div className="text-6xl mb-4">📋</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Henüz proje yok
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Bu çalışma alanında ilk projeyi oluştur
                                </p>
                                <Link
                                    href={`/projects/new?workspace=${workspaceId}`}
                                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
                                >
                                    Proje Oluştur
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/projects/${project.id}`}
                                        className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="text-3xl">📊</div>
                                            {getStatusBadge(project.status)}
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                            {project.name}
                                        </h3>
                                        {project.description && (
                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                {project.description}
                                            </p>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {new Date(project.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
