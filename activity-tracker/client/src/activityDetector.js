/**
 * activityDetector.js — Mouse & Aktif Pencere Tespiti
 *
 * SORUN: Rapor anında anlık pozisyon karşılaştırması touchpad'de çalışmıyor.
 * ÇÖZÜM: Arka planda her 1 saniyede bir pozisyon oku.
 *         Raporlama aralığı içinde herhangi bir hareket olduysa → ACTIVE.
 */

import { execSync } from 'child_process';
import activeWin from 'active-win';

let _movedSinceLastCheck = false;   // Raporlama arası hareket bayrağı
let _lastX = -1;
let _lastY = -1;
let _pollingStarted = false;

/**
 * Tek PowerShell komutunda mouse pozisyonunu al.
 */
function readMousePos() {
    try {
        const ps = `Add-Type -AssemblyName System.Windows.Forms; $p = [System.Windows.Forms.Cursor]::Position; Write-Output "$($p.X),$($p.Y)"`;
        const out = execSync(
            `powershell -NoProfile -NonInteractive -Command "${ps}"`,
            { timeout: 3000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
        ).trim();
        const nums = out.match(/\-?\d+/g);
        if (nums && nums.length >= 2) {
            const x = parseInt(nums[0], 10);
            const y = parseInt(nums[1], 10);
            return { x, y };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Arka plan yoklaması — her 1 saniyede bir çalışır.
 * Herhangi bir hareketi yakalar ve _movedSinceLastCheck bayrağını set eder.
 */
function startPolling() {
    if (_pollingStarted) return;
    _pollingStarted = true;

    setInterval(() => {
        const pos = readMousePos();
        if (!pos) return;

        if (_lastX === -1) {
            // İlk ölçüm — sadece kaydet, hareket saymaz
            _lastX = pos.x;
            _lastY = pos.y;
            return;
        }

        if (pos.x !== _lastX || pos.y !== _lastY) {
            _movedSinceLastCheck = true;
            _lastX = pos.x;
            _lastY = pos.y;
        }
    }, 1000);
}

/**
 * Raporlama aralığında hareket oldu mu?
 * Bayrağı sıfırlar ve sonucu döndürür.
 */
export async function checkMouseActivity() {
    startPolling(); // İlk çağrıda başlatır, sonraki çağrılarda no-op

    const moved = _movedSinceLastCheck;
    _movedSinceLastCheck = false; // Bir sonraki aralık için sıfırla
    return moved;
}

/**
 * Şu an aktif olan pencere bilgisi.
 */
export async function getActiveWindow() {
    try {
        const win = await activeWin();
        if (!win) return null;
        return {
            appName: win.owner?.name ?? 'Bilinmiyor',
            windowTitle: win.title ?? '',
        };
    } catch {
        return { appName: 'Bilinmiyor', windowTitle: '' };
    }
}
