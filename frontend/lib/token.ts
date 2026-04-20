export interface TokenPayload {
    user_id: string;
    email: string;
    organization_id?: string;
    role?: string;
    department?: string;
    exp: number;
    iat: number;
}

export function decodeToken(token: string): TokenPayload | null {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode token:', error);
        return null;
    }
}

export function hasOrganizationContext(token: string): boolean {
    const payload = decodeToken(token);
    return payload?.organization_id !== undefined;
}
