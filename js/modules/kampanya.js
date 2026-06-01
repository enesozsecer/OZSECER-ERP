import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, toRawTR, formatTR, parseRawTR, getTimeMs, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { printKatalog } from '../core/pdf.js';
import { renderHome } from './home.js';

let tempKatItems = [];

export function openKatalogModal() {
  $('kat-id').value = ''; $('kat-ad').value = ''; $('kat-desc').value = ''; $('filter-kat-q').value = ''; tempKatItems = [];
  const sel = $('filter-kat-grup'); sel.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.ug.forEach(g => { sel.innerHTML += `<option value="${g.id}">${g.ad}</option>`; });
  renderKatUrun(); renderKatSepet(); openM('mo-katalog');
}

export function renderKatUrun() {
  const q = $('filter-kat-q').value.toLowerCase().trim(); const fGrup = $('filter-kat-grup').value;
  const list = $('kat-urun-list'); list.innerHTML = '';
  let res = DB.u.filter(x => !x.silindi);
  if (fGrup) res = res.filter(u => String(u.grupId) === String(fGrup));
  if (q) res = res.filter(u => (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase().includes(q));
  if (res.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Ürün bulunamadı.</p>'; return; }
  res.forEach(u => {
    const isAdded = tempKatItems.some(k => k.urunId === u.id);
    list.innerHTML += `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border);"><div style="font-size:0.85rem; font-weight:bold;">${u.ad} <span style="font-weight:normal; color:var(--text-muted); font-size:0.75rem;">(S.Fiyat: ${fp(u.satisFiyat)})</span></div><button class="${isAdded ? 'btn-outline' : 'btn-primary'}" style="width:auto; padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addKatItem('${u.id}')" ${isAdded ? 'disabled' : ''}>${isAdded ? 'Eklendi' : '+ Ekle'}</button></div>`;
  });
}

export function addKatItem(id) {
  const u = DB.u.find(x => x.id === id); if (!u || tempKatItems.some(k => k.urunId === id)) return;
  tempKatItems.push({ urunId: u.id, ad: u.ad, foto: u.foto || '', desc: u.desc || '', normalFiyat: u.satisFiyat || 0, indirimYuzde: 0, indirimliFiyat: u.satisFiyat || 0 });
  renderKatUrun(); renderKatSepet();
}

export function selectAllKat() {
  const q = $('filter-kat-q').value.toLowerCase().trim(); const fGrup = $('filter-kat-grup').value;
  let res = DB.u.filter(x => !x.silindi);
  if (fGrup) res = res.filter(u => String(u.grupId) === String(fGrup));
  if (q) res = res.filter(u => (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase().includes(q));
  res.forEach(u => { if (!tempKatItems.some(k => k.urunId === u.id)) { tempKatItems.push({ urunId: u.id, ad: u.ad, foto: u.foto || '', desc: u.desc || '', normalFiyat: u.satisFiyat || 0, indirimYuzde: 0, indirimliFiyat: u.satisFiyat || 0 }); } });
  renderKatUrun(); renderKatSepet();
}

export function removeKatItem(idx) { tempKatItems.splice(idx, 1); renderKatUrun(); renderKatSepet(); }

export function renderKatSepet() {
  const p = $('kat-sepet-list'); p.innerHTML = '';
  if (tempKatItems.length === 0) { p.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Sepette ürün yok.</p>'; return; }
  p.innerHTML += `<div style="display:flex; gap:0.4rem; padding:0 0.5rem; font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:4px;"><div style="flex:3;">Ürün Adı</div><div style="flex:2;">Normal Fiyat</div><div style="flex:2;">İndirim %</div><div style="flex:2;">İndirimli Fiyat</div><div style="width:1.2rem;"></div></div>`;
  tempKatItems.forEach((it, idx) => {
    p.innerHTML += `<div style="display:flex; gap:0.4rem; margin-bottom:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;"><div style="flex:3; font-size:0.85rem; font-weight:bold; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;" title="${it.desc ? it.desc : 'Açıklama yok'}">${it.ad}</div><div style="flex:2"><input type="text" id="kat-nf-${idx}" value="${formatTR(it.normalFiyat)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].normalFiyat)" onblur="this.value=formatTR(tempKatItems[${idx}].normalFiyat)" oninput="handleKatRow(${idx}, 'normalFiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem"></div><div style="flex:2"><input type="text" id="kat-yuz-${idx}" value="${formatTR(it.indirimYuzde)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].indirimYuzde)" onblur="this.value=formatTR(tempKatItems[${idx}].indirimYuzde)" oninput="handleKatRow(${idx}, 'indirimYuzde', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem"></div><div style="flex:2"><input type="text" id="kat-ind-${idx}" value="${formatTR(it.indirimliFiyat)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].indirimliFiyat)" onblur="this.value=formatTR(tempKatItems[${idx}].indirimliFiyat)" oninput="handleKatRow(${idx}, 'indirimliFiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem"></div><button class="icon-btn text-red" style="padding:0; font-size:1.1rem; margin-left:4px;" onclick="removeKatItem(${idx})">✕</button></div>`;
  });
}

export function handleKatRow(idx, field, val) {
  let parsedVal = parseRawTR(val); tempKatItems[idx][field] = parsedVal;
  let n = parseFloat(tempKatItems[idx].normalFiyat) || 0; let y = parseFloat(tempKatItems[idx].indirimYuzde) || 0; let i = parseFloat(tempKatItems[idx].indirimliFiyat) || 0;
  if (field === 'normalFiyat') { i = n * (1 - (y / 100)); tempKatItems[idx].indirimliFiyat = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'indirimYuzde') { i = n * (1 - (parsedVal / 100)); tempKatItems[idx].indirimliFiyat = i; if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i); } 
  else if (field === 'indirimliFiyat') { y = n !== 0 ? ((n - parsedVal) / n) * 100 : 0; tempKatItems[idx].indirimYuzde = y; if (document.activeElement.id !== 'kat-yuz-' + idx) $('kat-yuz-' + idx).value = formatTR(y); }
}

export function openKampanyaListeModal() { renderKampanyaListe(); openM('mo-kampanya-liste'); }

export function renderKampanyaListe() {
  const list = $('kl-list'); list.innerHTML = '';
  if (DB.k.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding:1rem; text-align:center;">Kayıtlı kampanya bulunmuyor.</p>'; return; }
  let kampanya = DB.k.filter(x => !x.silindi).sort((a, b) => getTimeMs(b.tarih) - getTimeMs(a.tarih));
  kampanya.forEach(k => {
    list.innerHTML += `<div class="list-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; padding:0.75rem;"><div style="flex:1; cursor:pointer;" onclick="editKampanya('${k.id}')"><div style="font-weight:bold; color:var(--accent); font-size:0.95rem;">${k.ad}</div><div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">${k.tarih} | ${k.items.length} Kalem Ürün</div></div><div style="display:flex; gap:0.5rem;"><button class="icon-btn" title="PDF İndir" onclick="printKatalogById('${k.id}')">⬇️</button><button class="icon-btn text-red" title="Sil" onclick="deleteKampanya('${k.id}')">🗑️</button></div></div>`;
  });
}

export function printKatalogById(id) { const k = DB.k.find(x => x.id === id); if (k) printKatalog(k); }

export function editKampanya(id) {
  const k = DB.k.find(x => x.id === id); if (!k) return;
  closeM('mo-kampanya-liste'); openKatalogModal();
  $('kat-id').value = k.id; $('kat-ad').value = k.ad; $('kat-desc').value = k.desc || '';
  tempKatItems = JSON.parse(JSON.stringify(k.items)).map(it => { const anaUrun = DB.u.find(x => String(x.id) === String(it.urunId)); it.desc = (anaUrun && anaUrun.desc) ? anaUrun.desc : (it.desc || ''); it.foto = (anaUrun && anaUrun.foto) ? anaUrun.foto : (it.foto || ''); return it; });
  renderKatUrun(); renderKatSepet();
}

export function deleteKampanya(id) {
  showConfirm("Bu kampanyayı silmek istediğinize emin misiniz?", () => { DB.k = DB.k.filter(x => x.id !== id); saveDB(); renderKampanyaListe(); renderHome(); showToast("Kampanya silindi."); }, '🗑️', 'Kampanya Sil');
}

export function saveAndPrintKatalog() {
  const ad = $('kat-ad').value.trim(); if (!ad) return showToast('Katalog Adı zorunlu!'); if (tempKatItems.length === 0) return showToast('Katalogda ürün yok!');
  const id = $('kat-id').value;
  const kData = { id: id || guid(), ad: ad, desc: $('kat-desc').value.trim(), tarih: tsNow(), items: JSON.parse(JSON.stringify(tempKatItems)) };
  if (id) { const idx = DB.k.findIndex(x => x.id === id); if (idx > -1) DB.k[idx] = kData; } else { DB.k.push(kData); }
  saveDB(); closeM('mo-katalog'); showToast('Katalog kaydedildi, PDF hazırlanıyor...'); renderHome();
  setTimeout(() => printKatalog(kData), 500);
}