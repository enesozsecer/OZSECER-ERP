import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtLocalNow, fp, toRawTR, formatTR, parseRawTR, showToast, openM, closeM, showConfirm, formatDateOnly } from '../core/utils.js';
import { printKatalog } from '../core/pdf.js';
import { renderHome } from './home.js';

let tempOfferItems = [];

export function initKatalogView() { 
    const topTitle = document.getElementById('top-title');
    if (topTitle) topTitle.innerText = 'Katalog Yönetimi'; 
}

export function openKatalogModal() {
  $('kat-Id').value = ''; $('kat-Name').value = ''; $('kat-Description').value = ''; $('filter-kat-q').value = ''; 
  $('kat-OfferDate').value = dtLocalNow();
  tempOfferItems = [];
  
  // FİLTREYİ GRUP YERİNE KATEGORİ OLARAK DEĞİŞTİRDİK
  const sel = $('filter-kat-grup'); sel.innerHTML = '<option value="">Tüm Kategoriler</option>';
  DB.Category.filter(x=>!x.Deleted).forEach(c => { sel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
  
  renderKatUrun(); renderKatSepet(); openM('mo-katalog');
}

export function renderKatUrun() {
  const q = $('filter-kat-q').value.toLowerCase().trim(); 
  const fCat = $('filter-kat-grup').value; // Artık kategori ID'sini tutuyor
  const list = $('kat-urun-list'); list.innerHTML = '';
  
  let res = DB.Product.filter(x => !x.Deleted);
  // KATEGORİYE GÖRE FİLTRELE
  if (fCat) res = res.filter(u => String(u.CategoryId) === String(fCat));
  if (q) res = res.filter(u => (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase().includes(q));
  
  if (res.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Ürün bulunamadı.</p>'; return; }
  
  res.forEach(u => {
    const isAdded = tempOfferItems.some(k => k.ProductId === u.Id && !k.Deleted);
    list.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border);"><div style="font-size:0.85rem; font-weight:bold;">${u.Name} <span style="font-weight:normal; color:var(--text-muted); font-size:0.75rem;">(S.Fiyat: ${fp(u.SalePrice)})</span></div><button class="${isAdded ? 'btn-outline' : 'btn-primary'}" style="width:auto; padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addKatItem('${u.Id}')" ${isAdded ? 'disabled' : ''}>${isAdded ? 'Eklendi' : '+ Ekle'}</button></div>`;
  });
}

export function addKatItem(id) {
  const u = DB.Product.find(x => x.Id === id); if (!u || tempOfferItems.some(k => k.ProductId === id && !k.Deleted)) return;
  tempOfferItems.push({ Id: guid(), ProductId: u.Id, Price: u.SalePrice || 0, DiscountRate: 0, SalePrice: u.SalePrice || 0, Deleted: false });
  renderKatUrun(); renderKatSepet();
}

export function selectAllKat() {
  const q = $('filter-kat-q').value.toLowerCase().trim(); 
  const fCat = $('filter-kat-grup').value; 
  let res = DB.Product.filter(x => !x.Deleted);
  
  // KATEGORİYE GÖRE FİLTRELE
  if (fCat) res = res.filter(u => String(u.CategoryId) === String(fCat));
  if (q) res = res.filter(u => (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase().includes(q));
  
  res.forEach(u => { if (!tempOfferItems.some(k => k.ProductId === u.Id && !k.Deleted)) { tempOfferItems.push({ Id: guid(), ProductId: u.Id, Price: u.SalePrice || 0, DiscountRate: 0, SalePrice: u.SalePrice || 0, Deleted: false }); } });
  renderKatUrun(); renderKatSepet();
}

export function removeKatItem(idx) { tempOfferItems[idx].Deleted = true; renderKatUrun(); renderKatSepet(); }

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

export function handleKatRow(idx, field, val) {
  let parsedVal = parseRawTR(val); tempOfferItems[idx][field] = parsedVal;
  let n = parseFloat(tempOfferItems[idx].Price) || 0; let y = parseFloat(tempOfferItems[idx].DiscountRate) || 0; let i = parseFloat(tempOfferItems[idx].SalePrice) || 0;
  if (field === 'Price') { i = n * (1 - (y / 100)); tempOfferItems[idx].SalePrice = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'DiscountRate') { i = n * (1 - (parsedVal / 100)); tempOfferItems[idx].SalePrice = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'SalePrice') { y = n !== 0 ? ((n - parsedVal) / n) * 100 : 0; tempOfferItems[idx].DiscountRate = y; if (document.activeElement.id !== 'kat-yuz-' + idx) $('kat-yuz-' + idx).value = formatTR(y); }
}

export function openKampanyaListeModal() { renderKampanyaListe(); openM('mo-kampanya-liste'); }

export function renderKampanyaListe() {
  const list = $('kl-list'); list.innerHTML = ''; if (DB.Offer.length === 0) { list.innerHTML = '<p class="text-muted" style="text-align:center;">Kayıt bulunmuyor.</p>'; return; }
  DB.Offer.filter(x => !x.Deleted).sort((a, b) => new Date(b.OfferDate) - new Date(a.OfferDate)).forEach(k => {
    const itemCount = DB.OfferItem.filter(x => x.OfferId === k.Id && !x.Deleted).length;
    list.innerHTML += `<div class="list-item" style="display:flex; justify-content:space-between; align-items:center;"><div style="flex:1; cursor:pointer;" onclick="editKampanya('${k.Id}')"><div style="font-weight:bold; color:var(--accent);">${k.Name}</div><div style="font-size:0.75rem; color:var(--text-muted);">${formatDateOnly(k.OfferDate)} | ${itemCount} Kalem</div></div><div style="display:flex; gap:0.5rem;"><button class="icon-btn" onclick="printKatalogById('${k.Id}')">⬇️</button><button class="icon-btn text-red" onclick="deleteKampanya('${k.Id}')">🗑️</button></div></div>`;
  });
}

export function printKatalogById(id) { const k = DB.Offer.find(x => x.Id === id); if (k) printKatalog(k); }

export function editKampanya(id) {
  const k = DB.Offer.find(x => String(x.Id) === String(id)); if (!k) return;
  closeM('mo-kampanya-liste'); openKatalogModal();
  $('kat-Id').value = k.Id; $('kat-Name').value = k.Name; $('kat-Description').value = k.Description || '';
  $('kat-OfferDate').value = k.OfferDate ? k.OfferDate.slice(0, 16) : dtLocalNow();
  
  tempOfferItems = JSON.parse(JSON.stringify(DB.OfferItem.filter(x => x.OfferId === k.Id && !x.Deleted)));
  renderKatUrun(); renderKatSepet();
}

export function deleteKampanya(id) {
  showConfirm("Bu kampanyayı silmek istediğinize emin misiniz?", () => { const k = DB.Offer.find(x => x.Id === id); if(k) k.Deleted = true; saveDB(); renderKampanyaListe(); }, '🗑️', 'Sil');
}

export function saveAndPrintKatalog() {
  const name = $('kat-Name').value.trim(); if (!name) return showToast('Ad zorunlu!'); 
  const finalItems = tempOfferItems.filter(x=>!x.Deleted); if (finalItems.length === 0) return showToast('Ürün yok!');
  
  const id = $('kat-Id').value || guid(); 
  const kData = { Name: name, Description: $('kat-Description').value.trim(), OfferDate: new Date($('kat-OfferDate').value).toISOString() };
  
  if ($('kat-Id').value) { Object.assign(DB.Offer.find(x => x.Id === id), kData, { UpdatedDate: tsNow() }); } 
  else { DB.Offer.push({ Id: id, ...kData, CreatedDate: tsNow(), Deleted: false }); }

  const currentItemIds = tempOfferItems.map(x => x.Id);
  DB.OfferItem.filter(x => x.OfferId === id && (!currentItemIds.includes(x.Id) || tempOfferItems.find(t=>t.Id===x.Id).Deleted)).forEach(x => { x.Deleted=true; x.DeletedDate = tsNow(); });
  finalItems.forEach(it => {
    it.OfferId = id; const existing = DB.OfferItem.find(x => x.Id === it.Id);
    if(existing) { Object.assign(existing, it, { UpdatedDate: tsNow() }); } else { DB.OfferItem.push({ ...it, CreatedDate: tsNow(), Deleted: false }); }
  });

  saveDB(); closeM('mo-katalog'); showToast('Kaydedildi, PDF hazırlanıyor...'); 
  setTimeout(() => printKatalog(DB.Offer.find(x => x.Id === id)), 500);
}