'use client';

import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Onayla',
    cancelText = 'İptal',
    variant = 'danger'
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: <Trash2 className="w-6 h-6 text-rose-600" />,
            iconBg: 'bg-rose-100',
            button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
            title: 'text-gray-900'
        },
        warning: {
            icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
            iconBg: 'bg-amber-100',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
            title: 'text-gray-900'
        },
        info: {
            icon: <AlertTriangle className="w-6 h-6 text-indigo-600" />,
            iconBg: 'bg-indigo-100',
            button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20',
            title: 'text-gray-900'
        }
    };

    const style = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onCancel}
            />
            
            {/* Modal Content */}
            <div className="relative bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="flex items-start gap-6">
                        <div className={`shrink-0 w-14 h-14 ${style.iconBg} rounded-[1.25rem] flex items-center justify-center`}>
                            {style.icon}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xl font-black tracking-tight ${style.title} dark:text-white uppercase italic`}>
                                {title}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50/50 dark:bg-gray-800/50 px-8 py-6 flex gap-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 px-6 py-4 ${style.button} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
