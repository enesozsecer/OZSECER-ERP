import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtLocalNow, fp, toRawTR, formatTR, parseRawTR, showToast, openM, closeM, showConfirm, dtFormat } from '../core/utils.js';
import { printKatalog } from '../core/pdf.js';
import { renderHome } from './home.js';

let tempOfferItems = [];
let katalogLimit = 20;
let katUrunLimit = 20; // YENİ: Modal içindeki ürün pagination limiti

export function initKatalogView() { 
    const topTitle = document.getElementById('top-title');
    if (topTitle) topTitle.innerText = 'Katalog Yönetimi'; 
    renderKatalog(true); 
}
window.initKatalogView = initKatalogView;

export function renderKatalog(force = false, resetLimit = true) {
  if (!force) return;
  if (resetLimit) katalogLimit = 20;

  const elQ = $('filter-katalog-q');
  const elStart = $('filter-katalog-start');
  const elEnd = $('filter-katalog-end');
  const list = $('katalog-list'); 

  if (!elQ || !elStart || !elEnd || !list) return; 

  const q = elQ.value.toLowerCase().trim();
  const fStart = elStart.value;
  const fEnd = elEnd.value;
  
  list.innerHTML = '';
  
  let filteredList = DB.Offer.filter(x => !x.Deleted).filter(k => {
    const content = (k.Name + " " + (k.Description || "")).toLowerCase();
    if (q && !content.includes(q)) return false;
    
    if (fStart || fEnd) {
      const d = new Date(k.OfferDate || k.CreatedDate);
      if (fStart && d < new Date(fStart)) return false; 
      if (fEnd && d > new Date(fEnd + 'T23:59:59')) return false; 
    }
    return true;
  });

  filteredList.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));
  let pagedList = filteredList.slice(0, katalogLimit);

  pagedList.forEach(k => {
    const itemCount = DB.OfferItem ? DB.OfferItem.filter(x => String(x.OfferId) === String(k.Id) && !x.Deleted).length : 0;
    
    const isExpired = k.OfferDate && new Date(k.OfferDate) < new Date();
    const statusHtml = isExpired 
      ? `<span style="color:var(--red); font-weight:bold; font-size:0.65rem;">Süresi Doldu</span>` 
      : `<span style="color:var(--green); font-weight:bold; font-size:0.65rem;">Aktif</span>`;
      
    list.innerHTML += `
      <div onclick="editKatalog('${k.Id}')" class="list-item">
        <div style="flex:3; text-align:left; overflow:hidden;">
          <div style="font-weight:bold; font-size:0.8rem; white-space:nowrap; text-overflow:ellipsis;" title="${k.Name}">${k.Name}</div>
          <div style="font-size:0.65rem; color:var(--text-muted); white-space:nowrap; text-overflow:ellipsis;">${k.Description || '-'}</div>
        </div>
        <div style="flex:2; font-size:0.75rem; color:var(--text-muted);">
           ${k.OfferDate ? dtFormat(k.OfferDate) : 'Süresiz'}
        </div>
        <div style="flex:1.5;">${statusHtml}</div>
        <div style="flex:1.5; font-weight:bold; font-size:0.9rem; color:var(--accent);">${itemCount}</div>
      </div>`;
  });

  if (filteredList.length > katalogLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.8rem;" onclick="loadMoreKatalog()">Daha Fazla Göster (${filteredList.length - katalogLimit} Kaldı)</button>`;
  }
}
window.renderKatalog = renderKatalog;

window.loadMoreKatalog = function() {
    katalogLimit += 20;
    renderKatalog(true, false);
};

export function editKatalog(id = '') {
  $('kat-Id').value = id; 
  
  const btnPdf = $('kat-pdf');
  const btnDel = $('kat-del');
  const title = $('kat-title');

  if (id) {
    // DÜZENLEME MODU
    const k = DB.Offer.find(x => String(x.Id) === String(id));
    if (!k) return showToast("Katalog bulunamadı!");
    
    if(title) title.innerText = 'Katalog Düzenle';
    $('kat-Name').value = k.Name; 
    $('kat-Description').value = k.Description || '';
    $('kat-OfferDate').value = k.OfferDate ? k.OfferDate.slice(0, 16) : dtLocalNow();
    
    tempOfferItems = JSON.parse(JSON.stringify(DB.OfferItem.filter(x => x.OfferId === k.Id && !x.Deleted)));
    
    if(btnPdf) btnPdf.classList.remove('hidden');
    if(btnDel) btnDel.classList.remove('hidden');
  } else {
    // YENİ EKLEME MODU
    if(title) title.innerText = 'Yeni Katalog';
    $('kat-Name').value = ''; 
    $('kat-Description').value = ''; 
    $('kat-OfferDate').value = dtLocalNow();
    tempOfferItems = [];
    
    if(btnPdf) btnPdf.classList.add('hidden');
    if(btnDel) btnDel.classList.add('hidden');
  }

  $('filter-kat-q').value = ''; 
  const sel = $('filter-kat-grup'); sel.innerHTML = '<option value="">Tüm Kategoriler</option>';
  DB.Category.filter(x=>!x.Deleted).forEach(c => { sel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
  
  renderKatUrun(true); renderKatSepet(); openM('mo-katalog');
}
window.openKatalogModal = editKatalog; 
window.editKatalog = editKatalog;

export function saveKatalog() {
  const name = $('kat-Name').value.trim(); if (!name) return showToast('Ad zorunlu!'); 
  const finalItems = tempOfferItems.filter(x=>!x.Deleted); if (finalItems.length === 0) return showToast('Ürün yok!');
  
  const id = $('kat-Id').value || guid(); 
  const kData = { Name: name, Description: $('kat-Description').value.trim(), OfferDate: new Date($('kat-OfferDate').value).toISOString() };
  
  if ($('kat-Id').value) { 
      Object.assign(DB.Offer.find(x => x.Id === id), kData, { UpdatedDate: tsNow() }); 
  } else { 
      DB.Offer.push({ Id: id, ...kData, CreatedDate: tsNow(), Deleted: false }); 
  }

  const currentItemIds = tempOfferItems.map(x => x.Id);
  DB.OfferItem.filter(x => x.OfferId === id && (!currentItemIds.includes(x.Id) || tempOfferItems.find(t=>t.Id===x.Id).Deleted)).forEach(x => { x.Deleted=true; x.DeletedDate = tsNow(); });
  
  finalItems.forEach(it => {
    it.OfferId = id; const existing = DB.OfferItem.find(x => x.Id === it.Id);
    if(existing) { Object.assign(existing, it, { UpdatedDate: tsNow() }); } 
    else { DB.OfferItem.push({ ...it, CreatedDate: tsNow(), Deleted: false }); }
  });

  saveDB(); 
  closeM('mo-katalog'); 
  showToast('Katalog Başarıyla Kaydedildi!'); 
  renderKatalog(true); 
}
window.saveKatalog = saveKatalog;

export function deleteKatalog() {
  const id = $('kat-Id').value;
  if(!id) return;
  showConfirm("Bu kampanyayı silmek istediğinize emin misiniz?", () => { 
      const k = DB.Offer.find(x => x.Id === id); 
      if(k) k.Deleted = true; 
      saveDB(); 
      closeM('mo-katalog');
      renderKatalog(true); 
  }, '🗑️', 'Sil');
}
window.deleteKatalog = deleteKatalog;

export function printCurrentKatalog() {
    const id = $('kat-Id').value;
    if(!id) return showToast('Lütfen önce PDF\'i alınacak kataloğu kaydedin!');
    const k = DB.Offer.find(x => x.Id === id); 
    if (k) printKatalog(k); 
}
window.printCurrentKatalog = printCurrentKatalog;


// ---------- YENİDEN DÜZENLENEN ÜRÜN SEÇME (PAGINATION İLE) ----------
export function renderKatUrun(resetLimit = true) {
  if (resetLimit) katUrunLimit = 20; // YENİ: Arama veya kategori değişince 20'ye sıfırlar

  const q = $('filter-kat-q').value.toLowerCase().trim(); 
  const fCat = $('filter-kat-grup').value; 
  const list = $('kat-urun-list'); list.innerHTML = '';
  
  let res = DB.Product.filter(x => !x.Deleted);
  if (fCat) res = res.filter(u => String(u.CategoryId) === String(fCat));
  if (q) res = res.filter(u => (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase().includes(q));
  
  if (res.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Ürün bulunamadı.</p>'; return; }
  
  let pagedList = res.slice(0, katUrunLimit);

  pagedList.forEach(u => { 
    const isAdded = tempOfferItems.some(k => k.ProductId === u.Id && !k.Deleted);
    list.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border);"><div style="font-size:0.85rem; font-weight:bold;">${u.Name} <span style="font-weight:normal; color:var(--text-muted); font-size:0.75rem;">(S.Fiyat: ${fp(u.SalePrice)})</span></div><button class="${isAdded ? 'btn-outline' : 'btn-primary'}" style="width:auto; padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addKatItem('${u.Id}')" ${isAdded ? 'disabled' : ''}>${isAdded ? 'Eklendi' : '+ Ekle'}</button></div>`;
  });

  // YENİ: Daha fazla göster butonu (Eğer kalan veri varsa)
  if (res.length > katUrunLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.6rem; font-size:0.85rem;" onclick="loadMoreKatUrun()">Daha Fazla Göster (${res.length - katUrunLimit} Kaldı)</button>`;
  }
}
window.renderKatUrun = renderKatUrun;

// YENİ: Daha Fazla Göster'e tıklanınca çalışacak fonksiyon
window.loadMoreKatUrun = function() {
    katUrunLimit += 20;
    renderKatUrun(false);
};

export function addKatItem(id) {
  const u = DB.Product.find(x => x.Id === id); if (!u || tempOfferItems.some(k => k.ProductId === id && !k.Deleted)) return;
  tempOfferItems.push({ Id: guid(), ProductId: u.Id, Price: u.SalePrice || 0, DiscountRate: 0, SalePrice: u.SalePrice || 0, Deleted: false });
  renderKatUrun(false); renderKatSepet();
}
window.addKatItem = addKatItem;

export function selectAllKat() {
  const q = $('filter-kat-q').value.toLowerCase().trim(); 
  const fCat = $('filter-kat-grup').value; 
  let res = DB.Product.filter(x => !x.Deleted);
  
  if (fCat) res = res.filter(u => String(u.CategoryId) === String(fCat));
  if (q) res = res.filter(u => (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase().includes(q));
  
  res.forEach(u => { if (!tempOfferItems.some(k => k.ProductId === u.Id && !k.Deleted)) { tempOfferItems.push({ Id: guid(), ProductId: u.Id, Price: u.SalePrice || 0, DiscountRate: 0, SalePrice: u.SalePrice || 0, Deleted: false }); } });
  renderKatUrun(false); renderKatSepet();
}
window.selectAllKat = selectAllKat;

export function removeKatItem(idx) { tempOfferItems[idx].Deleted = true; renderKatUrun(false); renderKatSepet(); }
window.removeKatItem = removeKatItem;

export function renderKatSepet() {
  const p = $('kat-sepet-list'); p.innerHTML = ''; const visible = tempOfferItems.filter(x=>!x.Deleted);
  if (visible.length === 0) { p.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Sepette ürün yok.</p>'; return; }
  p.innerHTML += `<div style="display:flex; gap:0.4rem; padding:0 0.5rem; font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:4px;"><div style="flex:3;">Ürün Adı</div><div style="flex:2;">Normal Fiyat</div><div style="flex:2;">İndirim %</div><div style="flex:2;">İndirimli Fiyat</div><div style="width:1.2rem;"></div></div>`;
  tempOfferItems.forEach((it, idx) => {
    if(it.Deleted) return; const product = DB.Product.find(x => x.Id === it.ProductId) || { Name: 'Bilinmeyen' };
    p.innerHTML += `<div style="display:flex; gap:0.4rem; margin-bottom:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;">
      <div style="flex:3; font-size:0.85rem; font-weight:bold; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${product.Name}</div>
      <div style="flex:2">
        <input type="text" value="${formatTR(it.Price)}" inputmode="decimal" onfocus="this.value=toRawTR(tempOfferItems[${idx}].Price)" onblur="this.value=formatTR(tempOfferItems[${idx}].Price)" oninput="handleKatRow(${idx}, 'Price', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
      </div>
      <div style="flex:2">
        <input type="text" id="kat-yuz-${idx}" value="${formatTR(it.DiscountRate)}" inputmode="decimal" onfocus="this.value=toRawTR(tempOfferItems[${idx}].DiscountRate)" onblur="this.value=formatTR(tempOfferItems[${idx}].DiscountRate)" oninput="handleKatRow(${idx}, 'DiscountRate', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
      </div>
      <div style="flex:2">
        <input type="text" id="kat-ind-${idx}" value="${formatTR(it.SalePrice)}" inputmode="decimal" onfocus="this.value=toRawTR(tempOfferItems[${idx}].SalePrice)" onblur="this.value=formatTR(tempOfferItems[${idx}].SalePrice)" oninput="handleKatRow(${idx}, 'SalePrice', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
      </div>
      <button class="icon-btn text-red" style="padding:0; font-size:1.1rem; margin-left:4px;" onclick="removeKatItem(${idx})">✕</button>
    </div>`;
  });
}
window.renderKatSepet = renderKatSepet;

export function handleKatRow(idx, field, val) {
  let parsedVal = parseRawTR(val); tempOfferItems[idx][field] = parsedVal;
  let n = parseFloat(tempOfferItems[idx].Price) || 0; let y = parseFloat(tempOfferItems[idx].DiscountRate) || 0; let i = parseFloat(tempOfferItems[idx].SalePrice) || 0;
  if (field === 'Price') { i = n * (1 - (y / 100)); tempOfferItems[idx].SalePrice = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'DiscountRate') { i = n * (1 - (parsedVal / 100)); tempOfferItems[idx].SalePrice = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'SalePrice') { y = n !== 0 ? ((n - parsedVal) / n) * 100 : 0; tempOfferItems[idx].DiscountRate = y; if (document.activeElement.id !== 'kat-yuz-' + idx) $('kat-yuz-' + idx).value = formatTR(y); }
}
window.handleKatRow = handleKatRow;