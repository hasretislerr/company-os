/**
 * Centralized mappers for consistent UI terminology across the application.
 * All 'Administration' strings should be displayed as 'Admin'.
 * All 'Member' roles should be displayed as 'Personel'.
 */

export const availableDepts = [
    { id: 'administration', name: 'Admin' },
    { id: 'it', name: 'IT' },
    { id: 'sales', name: 'Satış' },
    { id: 'marketing', name: 'Pazarlama' },
    { id: 'hr', name: 'İK' },
    { id: 'engineering', name: 'Mühendislik' },
    { id: 'design', name: 'Tasarım' },
    { id: 'product', name: 'Ürün' },
    { id: 'management', name: 'Yönetim' },
    { id: 'finance', name: 'Finans' },
    { id: 'legal', name: 'Hukuk' }
];

export const availableRoles = [
    { id: 'member', name: 'Personel' },
    { id: 'manager', name: 'Admin' },
    { id: 'admin', name: 'Super Admin' }
];

export const deptMapper = (dept?: string) => {
    if (!dept || dept === 'unassigned') return 'Atanmamış';
    
    const d = dept.toLowerCase();
    const mapping: Record<string, string> = {
        'administration': 'Admin',
        'it': 'IT',
        'sales': 'Satış',
        'marketing': 'Pazarlama',
        'hr': 'İK',
        'human resources': 'İK',
        'engineering': 'Mühendislik',
        'design': 'Tasarım',
        'product': 'Ürün',
        'management': 'Yönetim',
        'finance': 'Finans',
        'legal': 'Hukuk'
    };
    
    return mapping[d] || dept.charAt(0).toUpperCase() + dept.slice(1).toLowerCase();
};

export const roleMapper = (role?: string) => {
    if (!role) return 'Personel'; // Default role display
    
    const r = role.toLowerCase();
    const mapping: Record<string, string> = {
        'admin': 'Super Admin',
        'manager': 'Yönetici',
        'hr': 'İnsan Kaynakları',
        'member': 'Personel',
        'user': 'Kullanıcı'
    };
    
    return mapping[r] || role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};
