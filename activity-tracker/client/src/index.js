/**
 * index.js — Sıfır Konfigürasyonlu Aktivite Ajanı
 *
 * Kullanıcı kimliği .env'den değil, tarayıcıdan otomatik gelir.
 * Tarayıcıda Company OS'a kim giriş yaparsa, takip onun adına başlar.
 *
 * Port 3100: Tarayıcı → Client iletişimi (kim giriş yaptı?)
 * Port 3099: Client → Takip Sunucusu iletişimi (aktivite verisi)
 */

import 'dotenv/config';
import http from 'http';
import fetch from 'node-fetch';
import { getActiveWindow, checkMouseActivity } from './activityDetector.js';
import { detectAudioStatus } from './audioDetector.js';

// ─── Yapılandırma ─────────────────────────────────────────────
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3099';
const INTERVAL_SECONDS = parseInt(process.env.INTERVAL_SECONDS || '60', 10);
const BRIDGE_PORT = 3100; // Tarayıcı ↔ Client köprüsü

// ─── Aktif Kullanıcı (tarayıcıdan gelir) ─────────────────────
let activeUser = null; // { id, name }
let trackInterval = null;

// ─── 1. Köprü Sunucusu (port 3100) ───────────────────────────
// Tarayıcı bu porta "kim giriş yaptı" bilgisini gönderir.
const bridge = http.createServer((req, res) => {
    // CORS — Company OS'un tarayıcıdan erişebilmesi için
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204); res.end(); return;
    }

    if (req.method === 'POST' && req.url === '/set-user') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const user = JSON.parse(body);
                if (!user.id || !user.name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'id ve name gerekli' }));
                    return;
                }

                const isNew = !activeUser || activeUser.id !== user.id;
                activeUser = user;

                if (isNew) {
                    console.log(`\n👤 Aktif kullanıcı: ${user.name} (${user.id.slice(0, 8)}…)`);
                    // Takip sunucusuna kaydet (veya güncelle)
                    registerEmployee(user);
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true }));
            } catch {
                res.writeHead(400); res.end(JSON.stringify({ error: 'Geçersiz JSON' }));
            }
        });
        return;
    }

    if (req.method === 'POST' && req.url === '/clear-user') {
        console.log(`\n🔓 Kullanıcı çıkış yaptı: ${activeUser?.name || '?'}`);
        activeUser = null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    if (req.method === 'GET' && req.url === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            activeUser,
            tracking: !!activeUser,
            interval: INTERVAL_SECONDS
        }));
        return;
    }

    res.writeHead(404); res.end();
});

// ─── 2. Takip Sunucusuna Kullanıcıyı Kaydet ──────────────────
async function registerEmployee(user) {
    try {
        await fetch(`${SERVER_URL}/api/employees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, name: user.name }),
            signal: AbortSignal.timeout(5_000),
        });
    } catch { /* sessiz geç, ilk POST'ta zaten otomatik oluşur */ }
}

// ─── 3. Aktivite Toplama ve Gönderim ─────────────────────────
async function collectAndSend() {
    if (!activeUser) {
        // Hiç kimse giriş yapmamış — bekle
        return;
    }

    const timestamp = new Date().toISOString();

    try {
        const [windowInfo, hasActivity, audioInfo] = await Promise.all([
            getActiveWindow(),
            checkMouseActivity(),
            detectAudioStatus(),
        ]);

        const status = hasActivity ? 'active'
            : (audioInfo.micActive || audioInfo.speakerActive) ? 'audio'
                : 'idle';

        const payload = {
            employeeId: activeUser.id,
            timestamp,
            appName: windowInfo?.appName || null,
            windowTitle: windowInfo?.windowTitle || null,
            status,
            audioStatus: audioInfo.audioStatus,
        };

        const res = await fetch(`${SERVER_URL}/api/activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
            console.error(`[${new Date(timestamp).toLocaleTimeString('tr-TR')}] ✗ ${await res.text()}`);
            return;
        }

        const icon = { active: '🟦', audio: '🟨', idle: '⬜' }[status] ?? '❓';
        console.log(
            `[${new Date(timestamp).toLocaleTimeString('tr-TR')}] ${icon} ${status.padEnd(6)} | ` +
            `${activeUser.name.split(' ')[0].padEnd(10)} | ` +
            `${windowInfo?.appName || '-'} — ${(windowInfo?.windowTitle || '').slice(0, 50)}`
        );

    } catch (err) {
        const msg = err.code === 'ECONNREFUSED'
            ? `Takip sunucusuna bağlanılamadı (${SERVER_URL})`
            : err.message;
        console.error(`[${new Date().toLocaleTimeString('tr-TR')}] ✗ ${msg}`);
    }
}

// ─── 4. Başlat ───────────────────────────────────────────────
bridge.listen(BRIDGE_PORT, () => {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   Company OS — Aktivite Takip Ajanı v2      ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`\n🌐 Köprü dinleniyor     : http://localhost:${BRIDGE_PORT}`);
    console.log(`📡 Takip sunucusu       : ${SERVER_URL}`);
    console.log(`⏱  Aralık               : ${INTERVAL_SECONDS} saniye`);
    console.log('\n⏳ Tarayıcıda Company OS\'a giriş bekleniyor...\n');

    // Periyodik veri gönderimi
    setInterval(collectAndSend, INTERVAL_SECONDS * 1000);
});

bridge.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${BRIDGE_PORT} zaten kullanılıyor. Başka bir ajan çalışıyor olabilir.`);
    } else {
        console.error('Köprü sunucusu hatası:', err.message);
    }
    process.exit(1);
});
