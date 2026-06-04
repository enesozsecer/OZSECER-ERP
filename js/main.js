// =======================================================
// MOBİL CİHAZ HATA YAKALAYICI (DEBUGGER)
// =======================================================
window.onerror = function(message, source, lineno, colno, error) {
    alert("🚨 SİSTEM HATASI:\n" + message + "\nSatır: " + lineno);
    return true; // Hatanın tarayıcıyı çökertmesini engeller
};

window.addEventListener('unhandledrejection', function(event) {
    let errorMsg = event.reason ? (event.reason.message || event.reason) : "Bilinmiyor";
    alert("🚨 GİZLİ HATA (Async):\n" + errorMsg);
});
// =======================================================

import * as DBModule from './core/db.js';
// ... (geri kalan kodların aynı şekilde devam etsin)


import * as DBModule from './core/db.js';
import * as Utils from './core/utils.js';
import * as PdfEngine from './core/pdf.js';
import * as Auth from './modules/auth.js';
import * as Home from './modules/home.js';
import * as Cari from './modules/cari.js';
import * as Urun from './modules/urun.js';
import * as Siparis from './modules/siparis.js';
import * as Kasa from './modules/kasa.js';
import * as Analiz from './modules/analiz.js';
import * as Kampanya from './modules/kampanya.js';
import * as Sistem from './modules/sistem.js';

Object.assign(window, DBModule);
Object.assign(window, Utils);
Object.assign(window, PdfEngine);
Object.assign(window, Auth);
Object.assign(window, Home);
Object.assign(window, Cari);
Object.assign(window, Urun);
Object.assign(window, Siparis);
Object.assign(window, Kasa);
Object.assign(window, Analiz);
Object.assign(window, Kampanya);
Object.assign(window, Sistem);

window.onload = function() {
    Auth.checkAuth();
};