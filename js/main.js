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
import * as Publish from './modules/publish.js';
import * as FirebaseModule from './core/firebase.js';

Object.assign(window, FirebaseModule);
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
Object.assign(window, Publish);

window.onload = async function() {
    Auth.checkAuth();
    const cloudStatus = await FirebaseModule.initFirebase();
    if (!cloudStatus || !cloudStatus.includes("ERP")) {
        FirebaseModule.openErpConfigModal();
        if (window.showToast) window.showToast("Sistem tutarlılığı için lütfen bulut girişinizi yapın.");
    }
};