export let DB = { 
    Current: [], Product: [], Order: [], OrderItem: [], Payment: [], 
    CurrentGroup: [], ProductGroup: [], Category: [], Brand: [],    
    Offer: [], OfferItem: [], Sector: [], PublishItem: []
};

export let CloudMirror = {}; 

export function loadDB() {
    const keys = Object.keys(DB);
    keys.forEach(k => {
        try { 
            DB[k] = JSON.parse(localStorage.getItem('e3_' + k)) || []; 
        } catch(e) { 
            DB[k] = []; 
        }
    });
    CloudMirror = JSON.parse(JSON.stringify(DB));
}

export function saveDB() {
    if (typeof window.isErpConnected === 'function' && !window.isErpConnected()) {
        loadDB();
        if (typeof window.showToast === 'function') window.showToast("Kayıt engellendi: Veri tutarsızlığını önlemek için buluta bağlanın!");
        if (typeof window.openErpConfigModal === 'function') window.openErpConfigModal();
        
        const currentView = document.querySelector('.view:not(.hidden)');
        if (currentView) {
            if (currentView.id === 'view-urun' && typeof window.renderUrun === 'function') window.renderUrun();
            if (currentView.id === 'view-cari' && typeof window.renderCari === 'function') window.renderCari(true);
            if (currentView.id === 'view-publish' && typeof window.renderPublishProducts === 'function') window.renderPublishProducts();
        }
        return;
    }

    Object.keys(DB).forEach(k => {
        localStorage.setItem('e3_' + k, JSON.stringify(DB[k]));
    });

    if (typeof window.pushChangesToCloud === 'function') {
        window.pushChangesToCloud();
    }
}