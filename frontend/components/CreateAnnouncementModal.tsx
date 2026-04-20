'use client';

import React, { useState, useEffect } from 'react';
import { X, Bell, Megaphone, Users, Target, Check, Shield, Building2, ChevronDown } from 'lucide-react';
import { apiClient, User } from '@/lib/api';

interface CreateAnnouncementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export default function CreateAnnouncementModal({ isOpen, onClose, onCreated }: CreateAnnouncementModalProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<'normal' | 'high'>('normal');
    const [targetType, setTargetType] = useState<'all' | 'multiple'>('all');
    const [sendEmail, setSendEmail] = useState(false);
    const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

    // Get unique departments from existing users + common defaults
    useEffect(() => {
        if (isOpen) {
            apiClient.listUsers().then(setUsers).catch(console.error);
        }
    }, [isOpen]);

    const commonDepartments = ['Yönetim', 'Yazılım', 'Pazarlama', 'Satış', 'İK', 'Finans', 'Operasyon', 'Destek'];
    const userDepartments = Array.from(new Set(users.map(u => u.department).filter(Boolean))) as string[];
    const allDepartments = Array.from(new Set([...commonDepartments, ...userDepartments])).sort();

    const allRoles = [
        { id: 'admin', label: 'Yönetici (Admin)' },
        { id: 'manager', label: 'Bölüm Müdürü' },
        { id: 'hr', label: 'İnsan Kaynakları' },
        { id: 'employee', label: 'Çalışan' }
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (targetType === 'multiple' && selectedDepts.length === 0 && selectedRoles.length === 0) {
            setError('Lütfen en az bir departman veya yetki seçin');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await apiClient.createAnnouncement({
                title,
                content,
                priority,
                target_type: targetType,
                target_departments: targetType === 'multiple' ? selectedDepts : [],
                target_roles: targetType === 'multiple' ? selectedRoles : [],
                send_email: sendEmail
            });
            onCreated();
            onClose();
            // Reset form
            setTitle('');
            setContent('');
            setPriority('normal');
            setTargetType('all');
            setSendEmail(false);
            setSelectedDepts([]);
            setSelectedRoles([]);
        } catch (err: any) {
            setError(err.message || 'Duyuru oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    const toggleDept = (dept: string) => {
        setSelectedDepts(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev =>
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-card rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh] border border-border-custom">
                <div className="p-6 border-b border-border-custom flex items-center justify-between bg-indigo-50/10 dark:bg-indigo-900/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Megaphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Yeni Duyuru Yayınla</h2>
                            <p className="text-xs text-gray-500 font-medium">Şirketinize veya belirli gruplara seslenin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-card rounded-full transition-colors text-gray-400 hover:text-gray-200 shadow-sm border border-transparent hover:border-border-custom">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">BAŞLIK</label>
                            <input
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border-custom rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-card transition-all outline-none text-foreground font-medium"
                                placeholder="Örn: Haftalık Değerlendirme Toplantısı"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">DUYURU İÇERİĞİ</label>
                            <textarea
                                required
                                rows={4}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full px-4 py-3 bg-background border border-border-custom rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-card transition-all outline-none text-foreground font-medium resize-none"
                                placeholder="Mesajınızı buraya yazın..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">ÖNEM DERECESİ</label>
                                <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setPriority('normal')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${priority === 'normal' ? 'bg-card shadow-sm text-foreground' : 'text-gray-400 hover:text-gray-500'}`}
                                    >
                                        Normal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPriority('high')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${priority === 'high' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-gray-400 hover:text-gray-500'}`}
                                    >
                                        Önemli
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">HEDEF KİTLE TÜRÜ</label>
                                <div className="flex gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('all')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${targetType === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-gray-400 hover:text-gray-500'}`}
                                    >
                                        Tüm Şirket
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTargetType('multiple')}
                                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${targetType === 'multiple' ? 'bg-card shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-500'}`}
                                    >
                                        Özel Seçim
                                    </button>
                                </div>
                            </div>
                        </div>

                        {targetType === 'multiple' && (
                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                {/* Departman Seçimi */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">DEPARTMANLAR ({selectedDepts.length})</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:border-indigo-100 transition-all group"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Building2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                                                <span className="text-sm font-bold text-gray-600 truncate">
                                                    {selectedDepts.length === 0 ? 'Departman Seçin...' : selectedDepts.join(', ')}
                                                </span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDeptDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isDeptDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border-custom rounded-2xl shadow-2xl z-20 p-2 grid grid-cols-2 gap-1 animate-in fade-in zoom-in duration-200">
                                                {allDepartments.map(dept => (
                                                    <button
                                                        key={dept}
                                                        type="button"
                                                        onClick={() => toggleDept(dept)}
                                                        className={`p-3 rounded-xl text-left text-[11px] font-bold transition-all flex items-center justify-between group/item ${selectedDepts.includes(dept)
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                                            : 'bg-gray-50 text-gray-500 hover:bg-indigo-50/50 hover:text-indigo-600'
                                                            }`}
                                                    >
                                                        {dept}
                                                        {selectedDepts.includes(dept) && <Check className="w-3 h-3 text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Yetki/Rol Seçimi */}
                                <div>
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 block px-1">YETKİLER / ROLLER ({selectedRoles.length})</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:border-indigo-100 transition-all group"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Shield className="w-4 h-4 text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                                                <span className="text-sm font-bold text-gray-600 truncate">
                                                    {selectedRoles.length === 0 ? 'Yetki Seçin...' : selectedRoles.map(r => allRoles.find(ar => ar.id === r)?.label).join(', ')}
                                                </span>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isRoleDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border-custom rounded-2xl shadow-2xl z-20 p-2 flex flex-col gap-1 animate-in fade-in zoom-in duration-200">
                                                {allRoles.map(role => (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => toggleRole(role.id)}
                                                        className={`p-3.5 rounded-xl text-left text-[11px] font-bold transition-all flex items-center justify-between group/item ${selectedRoles.includes(role.id)
                                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                                            : 'bg-gray-50 text-gray-500 hover:bg-emerald-50/50 hover:text-emerald-600'
                                                            }`}
                                                    >
                                                        {role.label}
                                                        {selectedRoles.includes(role.id) && <Check className="w-3 h-3 text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 pt-4 border-t border-border-custom">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative flex items-center justify-center">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all flex items-center justify-center group-hover:border-indigo-500">
                                        <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                                <span className="text-sm font-medium text-gray-700 select-none group-hover:text-indigo-700 transition-colors">
                                    E-posta bildirimi de gönder
                                </span>
                            </label>

                            <p className="text-[11px] text-gray-500 italic ml-auto max-w-[200px] text-right">
                                Gmail ile gerçek bir posta yollanır (Eğer yetkili ayarları yaptıysa).
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-50 text-gray-500 rounded-2xl text-sm font-bold hover:bg-gray-100 transition-colors uppercase tracking-wide"
                        >
                            İptal
                        </button>
                        <button
                            disabled={loading}
                            className="flex-[2] px-4 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 uppercase tracking-wide flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Bell className="w-4 h-4" />
                                    Duyuruyu Yayınla
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
