import { $, openM, closeM, showToast } from './utils.js';
import { DB, CloudMirror } from './db.js';

export let erpApp = null;
export let erpDB = null;
export let erpStorage = null;

export let marketApp = null;
export let marketDB = null;
export let marketStorage = null;

let fs = null;
let isListening = false;
let isPushing = false;

export function isErpConnected() {
    return erpApp !== null;
}

export async function initFirebase(forceErp = false, forceMarket = false) {
    const erpConfStr = localStorage.getItem('e3_firebase_erp');
    const mktConfStr = localStorage.getItem('e3_firebase_market');

    if (!erpConfStr && !mktConfStr) return false;

    try {
        const { initializeApp, deleteApp } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js');
        fs = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
        const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js');
        const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js');
        
        let erpSuccess = false;
        let marketSuccess = false;

        if (erpConfStr) {
            const erpConf = JSON.parse(erpConfStr);
            if (erpConf.apiKey) {
                try {
                    if (forceErp && erpApp) { await deleteApp(erpApp); erpApp = null; }
                    if (!erpApp) {
                        erpApp = initializeApp(erpConf, "ERP_APP");
                        erpDB = fs.getFirestore(erpApp);
                        erpStorage = getStorage(erpApp);
                    }
                    
                    if (erpConf.email && erpConf.pass) {
                        const auth = getAuth(erpApp);
                        await signInWithEmailAndPassword(auth, erpConf.email, erpConf.pass);
                    }

                    if (forceErp) {
                        const qTest = fs.query(fs.collection(erpDB, '_connection_test_'), fs.limit(1));
                        await fs.getDocs(qTest);
                    }
                    erpSuccess = true;
                } catch (e) {
                    erpSuccess = false; 
                    if (forceErp) throw e;
                }
            }
        }

        if (mktConfStr) {
            const mktConf = JSON.parse(mktConfStr);
            if (mktConf.apiKey) {
                try {
                    if (forceMarket && marketApp) { await deleteApp(marketApp); marketApp = null; }
                    if (!marketApp) {
                        marketApp = initializeApp(mktConf, "MARKET_APP");
                        marketDB = fs.getFirestore(marketApp);
                        marketStorage = getStorage(marketApp);
                    }
                    
                    if (mktConf.email && mktConf.pass) {
                        const auth = getAuth(marketApp);
                        await signInWithEmailAndPassword(auth, mktConf.email, mktConf.pass);
                    }

                    if (forceMarket) {
                        const qTest = fs.query(fs.collection(marketDB, '_connection_test_'), fs.limit(1));
                        await fs.getDocs(qTest);
                    }
                    marketSuccess = true;
                } catch (e) {
                    marketSuccess = false; 
                    if (forceMarket) throw e;
                }
            }
        }
        
        let activeSystems = [];
        if (erpSuccess) {
            activeSystems.push("ERP");
            if (!isListening) listenToCloudChanges(); 
        }
        if (marketSuccess) activeSystems.push("Market");

        if (activeSystems.length > 0) return activeSystems.join(" & ");
        return false;
    } catch (error) {
        return false;
    }
}

export async function pushChangesToCloud() {
    if (!erpDB || !fs || isPushing) return;
    isPushing = true;
    try {
        const batch = fs.writeBatch(erpDB);
        let hasChanges = false;
        Object.keys(DB).forEach(colName => {
            const currentData = DB[colName] || [];
            const mirrorData = CloudMirror[colName] || [];
            currentData.forEach(item => {
                if (!item || !item.Id) return;
                const mirrorItem = mirrorData.find(x => x.Id === item.Id);
                if (!mirrorItem || JSON.stringify(item) !== JSON.stringify(mirrorItem)) {
                    const docRef = fs.doc(erpDB, colName, String(item.Id));
                    batch.set(docRef, item);
                    hasChanges = true;
                }
            });
            mirrorData.forEach(mItem => {
                if (!mItem || !mItem.Id) return;
                const exists = currentData.find(x => x.Id === mItem.Id);
                if (!exists) {
                    const docRef = fs.doc(erpDB, colName, String(mItem.Id));
                    batch.delete(docRef);
                    hasChanges = true;
                }
            });
        });
        if (hasChanges) {
            await batch.commit();
            Object.keys(DB).forEach(k => { CloudMirror[k] = JSON.parse(JSON.stringify(DB[k] || [])); });
        }
    } catch(e) { 
    } finally { isPushing = false; }
}

export function listenToCloudChanges() {
    if (!erpDB || !fs) return;
    isListening = true;
    const collections = Object.keys(DB);
    collections.forEach(colName => {
        const colRef = fs.collection(erpDB, colName);
        fs.onSnapshot(colRef, (snapshot) => {
            let hasUpdates = false;
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                if (!data || !data.Id) return;
                const index = DB[colName].findIndex(x => x.Id === data.Id);
                if (change.type === "added" || change.type === "modified") {
                    if (index > -1) {
                        if (JSON.stringify(DB[colName][index]) !== JSON.stringify(data)) {
                            DB[colName][index] = data; hasUpdates = true;
                        }
                    } else { DB[colName].push(data); hasUpdates = true; }
                } else if (change.type === "removed") {
                    if (index > -1) { DB[colName].splice(index, 1); hasUpdates = true; }
                }
            });
            if (hasUpdates) {
                CloudMirror[colName] = JSON.parse(JSON.stringify(DB[colName]));
                localStorage.setItem('e3_' + colName, JSON.stringify(DB[colName]));
                const currentView = document.querySelector('.view:not(.hidden)');
                if (currentView && currentView.id === 'view-urun' && typeof window.renderUrun === 'function') window.renderUrun();
                if (currentView && currentView.id === 'view-cari' && typeof window.renderCari === 'function') window.renderCari(true);
                if (currentView && currentView.id === 'view-publish' && typeof window.renderPublishProducts === 'function') window.renderPublishProducts();
            }
        });
    });
}

export function initCloudSettingsView() { if ($('global-page-title')) $('global-page-title').innerText = 'Bulut Ayarları'; }

export function openErpConfigModal() {
    const str = localStorage.getItem('e3_firebase_erp');
    if(str) {
        try {
            const c = JSON.parse(str);
            $('fb-erp-apiKey').value = c.apiKey || ''; $('fb-erp-authDomain').value = c.authDomain || '';
            $('fb-erp-projectId').value = c.projectId || ''; $('fb-erp-storageBucket').value = c.storageBucket || '';
            $('fb-erp-messagingSenderId').value = c.messagingSenderId || ''; $('fb-erp-appId').value = c.appId || '';
            $('fb-erp-email').value = c.email || ''; $('fb-erp-pass').value = c.pass || '';
        } catch(e) {}
    }
    openM('mo-erp-config');
}

export function openMarketConfigModal() {
    const str = localStorage.getItem('e3_firebase_market');
    if(str) {
        try {
            const c = JSON.parse(str);
            $('fb-mkt-apiKey').value = c.apiKey || ''; $('fb-mkt-authDomain').value = c.authDomain || '';
            $('fb-mkt-projectId').value = c.projectId || ''; $('fb-mkt-storageBucket').value = c.storageBucket || '';
            $('fb-mkt-messagingSenderId').value = c.messagingSenderId || ''; $('fb-mkt-appId').value = c.appId || '';
            $('fb-mkt-email').value = c.email || ''; $('fb-mkt-pass').value = c.pass || '';
        } catch(e) {}
    }
    openM('mo-market-config');
}

export async function saveErpConfig() {
    const conf = { 
        apiKey: $('fb-erp-apiKey').value.trim(), authDomain: $('fb-erp-authDomain').value.trim(), 
        projectId: $('fb-erp-projectId').value.trim(), storageBucket: $('fb-erp-storageBucket').value.trim(), 
        messagingSenderId: $('fb-erp-messagingSenderId').value.trim(), appId: $('fb-erp-appId').value.trim(),
        email: $('fb-erp-email').value.trim(), pass: $('fb-erp-pass').value.trim()
    };
    if (!conf.apiKey || !conf.projectId) return showToast("API Anahtarları eksik!");
    if (!conf.email || !conf.pass) return showToast("Yetkili Email ve Şifresi zorunludur!");
    
    const oldBackup = localStorage.getItem('e3_firebase_erp');
    showToast("Bağlantı ve Yetki test ediliyor...");
    localStorage.setItem('e3_firebase_erp', JSON.stringify(conf));
    try {
        const res = await initFirebase(true, false);
        if (res && res.includes("ERP")) { 
            closeM('mo-erp-config'); 
            showToast("ERP Bağlantısı Doğrulandı!"); 
        } else throw new Error();
    } catch (err) {
        if (oldBackup) localStorage.setItem('e3_firebase_erp', oldBackup); else localStorage.removeItem('e3_firebase_erp');
        
        if (err && err.code && err.code.includes('auth/')) {
            showToast("HATA: E-Posta veya Şifre geçersiz!");
        } else {
            showToast("HATA: Girilen anahtarlar veya yetki geçersiz!");
        }
    }
}

export async function saveMarketConfig() {
    const conf = { 
        apiKey: $('fb-mkt-apiKey').value.trim(), authDomain: $('fb-mkt-authDomain').value.trim(), 
        projectId: $('fb-mkt-projectId').value.trim(), storageBucket: $('fb-mkt-storageBucket').value.trim(), 
        messagingSenderId: $('fb-mkt-messagingSenderId').value.trim(), appId: $('fb-mkt-appId').value.trim(),
        email: $('fb-mkt-email')?.value.trim() || '', pass: $('fb-mkt-pass')?.value.trim() || ''
    };
    if (!conf.apiKey || !conf.projectId) return showToast("API Anahtarları eksik!");
    
    const oldBackup = localStorage.getItem('e3_firebase_market');
    showToast("Bağlantı test ediliyor...");
    localStorage.setItem('e3_firebase_market', JSON.stringify(conf));
    try {
        const res = await initFirebase(false, true);
        if (res && res.includes("Market")) { 
            closeM('mo-market-config'); 
            showToast("Market Bağlantısı Doğrulandı!"); 
        } else throw new Error();
    } catch (err) {
        if (oldBackup) localStorage.setItem('e3_firebase_market', oldBackup); else localStorage.removeItem('e3_firebase_market');
        
        if (err && err.code && err.code.includes('auth/')) {
            showToast("HATA: E-Posta veya Şifre geçersiz!");
        } else {
            showToast("HATA: Girilen anahtarlar veya yetki geçersiz!");
        }
    }
}

export function disconnectErp() {
    const isConnected = localStorage.getItem('e3_firebase_erp');
    if (!isConnected) return showToast("Zaten bir ERP bağlantısı yok.");
    
    if (confirm("🚨 ERP bulut bağlantısını koparmak istediğinize emin misiniz?\n\nBağlantı kesildiğinde, veri tutarsızlığını önlemek için yeni buluta bağlanana kadar sisteme veri eklemeniz durdurulacaktır.")) {
        localStorage.removeItem('e3_firebase_erp');
        showToast("🔌 ERP Bulut bağlantısı başarıyla koparıldı!");
        setTimeout(() => window.location.reload(), 1200);
    }
}

export function disconnectMarket() {
    const isConnected = localStorage.getItem('e3_firebase_market');
    if (!isConnected) return showToast("Zaten bir Market bağlantısı yok.");
    
    if (confirm("🚨 Market bulut bağlantısını koparmak istediğinize emin misiniz?")) {
        localStorage.removeItem('e3_firebase_market');
        showToast("🔌 Market bağlantısı başarıyla koparıldı!");
        setTimeout(() => window.location.reload(), 1200);
    }
}