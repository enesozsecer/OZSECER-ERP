import { DB, saveDB } from '../core/db.js';
import { $, tsNow, guid, getCihazAdi, showToast, openM, closeM, showConfirm, formatTR, parseRawTR, toRawTR } from '../core/utils.js';

let selectedProductIds = new Set();
let publishState = {}; 
let visibleProductIds = []; 

export function initPublishView() {
  const catSel = $('filter-pub-cat'); const grpSel = $('filter-pub-group'); const brnSel = $('filter-pub-brand');
  if (catSel) { catSel.innerHTML = '<option value="">Tüm Kategoriler</option>'; DB.Category.filter(x=>!x.Deleted).forEach(c => catSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  if (grpSel) { grpSel.innerHTML = '<option value="">Tüm Gruplar</option>'; DB.ProductGroup.filter(x=>!x.Deleted).forEach(c => grpSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  if (brnSel) { brnSel.innerHTML = '<option value="">Tüm Markalar</option>'; DB.Brand.filter(x=>!x.Deleted).forEach(c => brnSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  
  if ($('global-page-title')) $('global-page-title').innerText = 'Yayın';
  
  // SAYFAYA GİRİNCE: Zaten yayında olanları hafızaya çek ve checkboxlarını doldur
  selectedProductIds.clear();
  DB.PublishItem.filter(x => x.IsPublished && !x.Deleted).forEach(x => {
      selectedProductIds.add(x.ProductId);
  });
  
  renderPublishProducts();
}

export function renderPublishProducts() {
  const q = $('filter-pub-q').value.toLowerCase().trim();
  const cat = $('filter-pub-cat').value; const grp = $('filter-pub-group').value; const brn = $('filter-pub-brand').value; const status = $('filter-pub-status').value;
  const list = $('publish-list'); list.innerHTML = '';
  visibleProductIds = []; 
  
  DB.Product.filter(x => !x.Deleted).sort((a,b) => a.Name.localeCompare(b.Name)).forEach(p => {
    if (q && !p.Name.toLowerCase().includes(q)) return;
    if (cat && String(p.CategoryId) !== String(cat)) return;
    if (grp && String(p.ProductGroupId) !== String(grp)) return;
    if (brn && String(p.BrandId) !== String(brn)) return;
    
    const existingPub = DB.PublishItem.find(x => x.ProductId === p.Id && x.IsPublished && !x.Deleted);
    if (status === 'published' && !existingPub) return;
    if (status === 'unpublished' && existingPub) return;
    
    visibleProductIds.push(p.Id); 

    if (!publishState[p.Id]) {
        publishState[p.Id] = {
            Price: existingPub ? existingPub.Price : (p.SalePrice || 0),
            DiscountRate: existingPub ? existingPub.DiscountRate : 0,
            SalePrice: existingPub ? existingPub.SalePrice : (p.SalePrice || 0),
            StockQuantity: existingPub ? existingPub.StockQuantity : (p.StockQuantity || 0)
        };
    }

    const s = publishState[p.Id];
    s.IsPublished = !!existingPub; // ANLIK GÜNCELLEME: Render anında mavi olması için DB bilgisini teyit et
    
    const isSelected = selectedProductIds.has(p.Id);
    const bgClass = s.IsPublished ? 'background-color: rgba(33, 150, 243, 0.15); border: 1px solid rgba(33, 150, 243, 0.4);' : 'background-color: var(--bg); border: 1px solid var(--border);';
    const badgeTxt = s.IsPublished ? `<span style="color:#2196F3; font-weight:bold; font-size:0.65rem;">Yayında</span>` : `<span style="color:var(--text-muted); font-size:0.65rem;">Yayında Değil</span>`;

    // CHECKBOX EN SOLA TAŞINDI
    // CHECKBOX EN SOLDA VE HATASIZ İNPUTLAR
    list.innerHTML += `
      <div style="${bgClass} border-radius:0.4rem; padding:0.4rem; margin-bottom:0.4rem; display:flex; gap:0.4rem; align-items:center;">
        
        <div style="width:24px; display:flex; justify-content:center;">
          <input type="checkbox" id="cb-${p.Id}" ${isSelected ? 'checked' : ''} onclick="toggleSelectPublish('${p.Id}', this.checked)" style="width:18px; height:18px; accent-color:var(--green); cursor:pointer; margin:0;">
        </div>

        <div style="flex:3; text-align:left; overflow:hidden;">
          <div style="margin-top:2px;">${badgeTxt}</div>
          <div style="font-weight:bold; font-size:0.8rem; white-space:nowrap; text-overflow:ellipsis;" title="${p.Name}">${p.Name}</div>
        </div>
        
        <div style="flex:2;"><input type="text" value="${formatTR(s.Price)}" inputmode="decimal" onfocus="focusPub(this, '${p.Id}', 'Price')" onblur="blurPub(this, '${p.Id}', 'Price')" oninput="calcPublishRow('${p.Id}', 'Price', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:1.5;"><input type="text" id="pub-yuz-${p.Id}" value="${formatTR(s.DiscountRate)}" inputmode="decimal" onfocus="focusPub(this, '${p.Id}', 'DiscountRate')" onblur="blurPub(this, '${p.Id}', 'DiscountRate')" oninput="calcPublishRow('${p.Id}', 'DiscountRate', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:2;"><input type="text" id="pub-ind-${p.Id}" value="${formatTR(s.SalePrice)}" inputmode="decimal" onfocus="focusPub(this, '${p.Id}', 'SalePrice')" onblur="blurPub(this, '${p.Id}', 'SalePrice')" oninput="calcPublishRow('${p.Id}', 'SalePrice', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:1.5;"><input type="number" value="${s.StockQuantity}" inputmode="numeric" oninput="calcPublishRow('${p.Id}', 'StockQuantity', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
      </div>`;
  });
  
  if($('pub-master-cb')) $('pub-master-cb').checked = visibleProductIds.length > 0 && visibleProductIds.every(id => selectedProductIds.has(id));
}

export function calcPublishRow(pId, field, val) {
    const s = publishState[pId];
    let num = parseRawTR(val);
    
    if (field === 'StockQuantity') { s.StockQuantity = Number(val) || 0; }
    else if (field === 'Price') { s.Price = num; s.SalePrice = s.Price - (s.Price * s.DiscountRate / 100); $('pub-ind-'+pId).value = formatTR(s.SalePrice); }
    else if (field === 'DiscountRate') { s.DiscountRate = num; s.SalePrice = s.Price - (s.Price * s.DiscountRate / 100); $('pub-ind-'+pId).value = formatTR(s.SalePrice); }
    else if (field === 'SalePrice') { s.SalePrice = num; s.DiscountRate = s.Price > 0 ? ((s.Price - s.SalePrice) / s.Price) * 100 : 0; $('pub-yuz-'+pId).value = formatTR(s.DiscountRate); }
    
    if (!selectedProductIds.has(pId)) {
        selectedProductIds.add(pId);
        if($('cb-'+pId)) $('cb-'+pId).checked = true;
    }
}

export function toggleSelectPublish(pId, isChecked) {
    if (isChecked) selectedProductIds.add(pId); else selectedProductIds.delete(pId);
    if($('pub-master-cb')) $('pub-master-cb').checked = visibleProductIds.length > 0 && visibleProductIds.every(id => selectedProductIds.has(id));
}

export function toggleAllPublish(isChecked) {
    visibleProductIds.forEach(id => {
        if (isChecked) selectedProductIds.add(id); else selectedProductIds.delete(id);
        if($('cb-'+id)) $('cb-'+id).checked = isChecked;
    });
}

export function openPublishListModal() {
    renderPublishCartList(); 
    openM('mo-publish-list');
}

export function removePopupPublishItem(pId) {
    selectedProductIds.delete(pId);
    renderPublishCartList();
    renderPublishProducts(); 
}

export function renderPublishCartList() {
    const list = $('publish-cart-list'); list.innerHTML = '';
    
    // EĞER SEÇİLEN HİÇBİR ŞEY YOKSA SİLME UYARISI VER
    if (selectedProductIds.size === 0) {
        list.innerHTML = `
        <div style="padding:1rem; text-align:center; color:var(--red); margin-top:20px;">
            <div style="font-size:3rem; margin-bottom:10px;">⚠️</div>
            <h3 style="margin-bottom:10px;">Vitrin Tamamen Boşaltılacak!</h3>
            <p style="font-size:0.9rem; color:var(--text-muted);">Hiçbir ürün seçilmedi. Eğer onaylarsanız, daha önce web sitenizde yayında olan <b>TÜM ÜRÜNLER</b> yayından kaldırılacaktır.</p>
        </div>`;
        return;
    }

    selectedProductIds.forEach(pId => {
        const p = DB.Product.find(x => x.Id === pId); if (!p) return;
        const s = publishState[pId];
        const bgClass = s.IsPublished ? 'background-color: rgba(33, 150, 243, 0.15);' : 'background-color: var(--bg);';

        list.innerHTML += `
        <div style="${bgClass} border: 1px solid var(--border); border-radius:0.5rem; padding:0.6rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
          <div style="flex:1;">
            <div style="font-weight:bold; font-size:0.9rem; margin-bottom:4px;">${p.Name}</div>
            <div style="font-size:0.75rem; color:var(--text-muted);">
              Normal: <b>${formatTR(s.Price)} ₺</b> | İnd: <b>%${formatTR(s.DiscountRate)}</b><br>
              Satış: <b style="color:var(--accent);">${formatTR(s.SalePrice)} ₺</b> | Stok: <b>${s.StockQuantity}</b>
            </div>
          </div>
          <button class="icon-btn text-red" style="padding:0.5rem; font-size:1.2rem;" onclick="removePopupPublishItem('${p.Id}')">🗑️</button>
        </div>`;
    });
}

export function publishAction() {
    showConfirm('Vitrin Listeniz (B2B Web Siteniz) bu liste ile senkronize edilecektir. Onaylıyor musunuz?', () => {
        
        // 1. ADIM: İşareti Kaldırılanları (Sync Dışı Kalanları) Yayından Düşür
        DB.PublishItem.filter(x => x.IsPublished && !x.Deleted).forEach(dbItem => {
            if(!selectedProductIds.has(dbItem.ProductId)) { 
                dbItem.IsPublished = false; 
                dbItem.Deleted = true; 
                dbItem.DeletedDate = tsNow(); 
                dbItem.DeletedUser = getCihazAdi(); 
            }
        });
        
        // 2. ADIM: İşaretli Olanları Ekle / Güncelle
        selectedProductIds.forEach(pId => {
            const s = publishState[pId];
            const existing = DB.PublishItem.find(x => x.ProductId === pId);
            
            if (existing) {
                existing.Price = s.Price; existing.DiscountRate = s.DiscountRate; existing.SalePrice = s.SalePrice; existing.StockQuantity = s.StockQuantity;
                existing.IsPublished = true; existing.Deleted = false; existing.UpdatedDate = tsNow(); existing.UpdatedUser = getCihazAdi();
            } else {
                DB.PublishItem.push({ Id: guid(), ProductId: pId, Price: s.Price, DiscountRate: s.DiscountRate, SalePrice: s.SalePrice, StockQuantity: s.StockQuantity, IsPublished: true, Deleted: false, CreatedDate: tsNow(), CreatedUser: getCihazAdi() });
            }
        });
        
        saveDB(); 
        closeM('mo-publish-list'); 
        renderPublishProducts(); // Sayfayı yenilemeden arkadaki mavi alanları anında günceller!
        showToast('Eşitleme Tamamlandı! Tüm liste sisteme kaydedildi.');
        console.log('GitHub Senkronizasyonu Aşamasında Veri Fırlatılacak!');
    }, '🚀', 'Evet, Eşitle');
}

// publishState değişkenine dışarıdan güvenle erişmemizi sağlayan yardımcı fonksiyonlar
export function focusPub(el, pId, field) { 
    el.value = toRawTR(publishState[pId][field]); 
}
export function blurPub(el, pId, field) { 
    el.value = formatTR(publishState[pId][field]); 
}