// Temel Motorlar
import * as DBModule from './core/db.js';
import * as Utils from './core/utils.js';
import * as PdfEngine from './core/pdf.js';

// İş Modülleri
import * as Auth from './modules/auth.js';
import * as Home from './modules/home.js';
import * as Cari from './modules/cari.js';
import * as Urun from './modules/urun.js';
import * as Siparis from './modules/siparis.js';
import * as Kasa from './modules/kasa.js';
import * as Analiz from './modules/analiz.js';
import * as Kampanya from './modules/kampanya.js';
import * as Sistem from './modules/sistem.js';

// HTML tarafındaki onclick="renderCari()" gibi komutların çalışabilmesi için
// tüm modülleri tarayıcının genel hafızasına (window) ekliyoruz.
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

// Proje ilk açıldığında giriş ekranı kontrolünü başlat
window.onload = function() {
    Auth.checkAuth();
};