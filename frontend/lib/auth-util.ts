/**
 * Koruma Kalkanı (Auth Grace Period) Kontrolü
 * Giriş yapıldıktan sonraki ilk 5 saniye içinde true döner.
 */
export function isAuthGracePeriod(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
        const gracePeriodStart = localStorage.getItem('auth_grace_period');
        if (!gracePeriodStart) return false;
        
        const startTime = parseInt(gracePeriodStart, 10);
        const now = Date.now();
        
        // 5 saniyelik hoşgörü süresi
        const IS_IN_GRACE = now - startTime < 5000;
        
        if (!IS_IN_GRACE) {
            // Süre dolmuşsa temizle
            localStorage.removeItem('auth_grace_period');
            return false;
        }
        
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Yönlendirmeyi Logla ve Takip Et
 */
export function traceRedirect(target: string, reason: string) {
    if (typeof window === 'undefined') return;
    
    console.group(`[AUTH-WATCH] Redirecting to ${target}`);
    console.warn(`Reason: ${reason}`);
    console.trace("Call stack for redirect:");
    console.groupEnd();
    
    // Opsiyonel: Logları localStorage'a yazarak sayfa yenilense de kalıcı olmasını sağla
    try {
        const logs = JSON.parse(localStorage.getItem('auth_redirect_logs') || '[]');
        logs.push({
            time: new Date().toISOString(),
            target,
            reason,
            url: window.location.href
        });
        localStorage.setItem('auth_redirect_logs', JSON.stringify(logs.slice(-10)));
    } catch (e) {}
}
