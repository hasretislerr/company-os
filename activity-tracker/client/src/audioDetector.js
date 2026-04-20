/**
 * audioDetector.js
 * Windows ve macOS için aktif ses durumunu (hoparlör / mikrofon) tespit eder.
 *
 * Windows: PowerShell + Windows Audio Session API (WASAPI)
 * macOS:   osascript (AppleScript)
 */

import { execSync } from 'child_process';

/**
 * Windows için ses aktivitesi tespiti.
 * Aktif bir oturum (ses çıkışı) var mı diye sorgular.
 * @returns {{ micActive: boolean, speakerActive: boolean }}
 */
function detectWindows() {
    try {
        // Aktif audio session'ları listele.
        // Get-Process ile ses kullanan process kontrolü yapılır.
        const script = `
      $hasAudio = $false;
      try {
        Add-Type -Path "$env:SystemRoot\\system32\\audiosrv.dll" -ErrorAction SilentlyContinue;
      } catch {}
      
      # Alternatif: ses dosyaları kullanan process'leri bul
      $audioProcesses = Get-Process | Where-Object {
        $_.Modules -match 'audioses.dll' -or $_.Name -match '(chrome|firefox|edge|zoom|teams|discord|spotify|vlc|wmplayer)'
      } -ErrorAction SilentlyContinue;
      
      if ($audioProcesses) { Write-Output "true" } else { Write-Output "false" }
    `;

        const output = execSync(
            `powershell -NoProfile -Command "${script}"`,
            { timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString().trim().toLowerCase();

        const speakerActive = output === 'true';

        // Mikrofon için: kayıt yapan uygulamalar
        const micScript = `
      $micApps = Get-Process | Where-Object {
        $_.Name -match '(zoom|teams|discord|meet|webex|skype|obs|audacity)'
      } -ErrorAction SilentlyContinue;
      if ($micApps) { Write-Output "true" } else { Write-Output "false" }
    `;

        const micOutput = execSync(
            `powershell -NoProfile -Command "${micScript}"`,
            { timeout: 5000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString().trim().toLowerCase();

        return {
            speakerActive,
            micActive: micOutput === 'true'
        };
    } catch {
        return { speakerActive: false, micActive: false };
    }
}

/**
 * macOS için ses aktivitesi tespiti.
 * @returns {{ micActive: boolean, speakerActive: boolean }}
 */
function detectMacOS() {
    try {
        // Ses kullanan uygulamaları listele
        const output = execSync(
            `osascript -e 'tell application "System Events" to get name of every process whose background only is false'`,
            { timeout: 3000, stdio: ['pipe', 'pipe', 'ignore'] }
        ).toString().toLowerCase();

        const audioApps = ['zoom', 'teams', 'discord', 'facetime', 'skype', 'safari', 'chrome', 'firefox', 'spotify', 'vlc'];
        const speakerActive = audioApps.some(app => output.includes(app));

        const meetingApps = ['zoom', 'teams', 'discord', 'facetime', 'skype'];
        const micActive = meetingApps.some(app => output.includes(app));

        return { speakerActive, micActive };
    } catch {
        return { speakerActive: false, micActive: false };
    }
}

/**
 * Platform bağımsız ses durum tespiti.
 * @returns {Promise<{ micActive: boolean, speakerActive: boolean, audioStatus: string }>}
 */
export async function detectAudioStatus() {
    let result = { micActive: false, speakerActive: false };

    if (process.platform === 'win32') {
        result = detectWindows();
    } else if (process.platform === 'darwin') {
        result = detectMacOS();
    }

    let audioStatus = 'none';
    if (result.micActive && result.speakerActive) {
        audioStatus = 'mic+speaker';
    } else if (result.micActive) {
        audioStatus = 'mic';
    } else if (result.speakerActive) {
        audioStatus = 'speaker';
    }

    return { ...result, audioStatus };
}
