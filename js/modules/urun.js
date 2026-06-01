import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, getBirimAd, parseRawTR, formatTR, toRawTR, getTimeMs, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { startCam } from './siparis.js';

let tempUrunGruplar = [];

export function loadUrunGrupSelects() {
  const sel = $('mu-grup'); const selFiltre = $('filter-urun-grup');
  if (sel) sel.innerHTML = '<option value="">Grup Yok</option>';
  if (selFiltre) selFiltre.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.ug.forEach(g => {
    if (sel) sel.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selFiltre) selFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
  });
}

export function openUrunGrupModal() { tempUrunGruplar = JSON.parse(JSON.stringify(DB.ug)); $('mug-new-ad').value = ''; renderUrunGrupList(); openM('mo-urun-grup'); }
export function renderUrunGrupList() {
  const list = $('mug-list'); list.innerHTML = '';
  if (tempUrunGruplar.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Kayıtlı ürün grubu yok.</p>'; return; }
  tempUrunGruplar.forEach((g, idx) => {
    list.innerHTML += `<div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
      <input type="text" value="${g.ad}" onchange="updateTempUrunGrup(${idx}, this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem;">
      <button class="icon-btn text-red" style="padding:0; font-size:1.2rem;" onclick="deleteTempUrunGrup(${idx})">🗑️</button></div>`;
  });
}

export function addTempUrunGrup() { const ad = $('mug-new-ad').value.trim(); if (!ad) return showToast("Grup adı girin!"); tempUrunGruplar.push({ id: guid(), ad: ad }); $('mug-new-ad').value = ''; renderUrunGrupList(); }
export function updateTempUrunGrup(idx, val) { tempUrunGruplar[idx].ad = val.trim(); }
export function deleteTempUrunGrup(idx) { tempUrunGruplar.splice(idx, 1); renderUrunGrupList(); }

export function saveUrunGrup() {
  const deletedGroups = DB.ug.filter(oldG => !tempUrunGruplar.find(tG => tG.id === oldG.id));
  for (let dg of deletedGroups) {
    const isUsed = DB.u.some(u => !u.silindi && String(u.grupId) === String(dg.id));
    if (isUsed) return showToast(`HATA: "${dg.ad}" grubu bir ürüne bağlı, silinemez!`);
  }
  DB.ug = JSON.parse(JSON.stringify(tempUrunGruplar)); saveDB(); closeM('mo-urun-grup'); loadUrunGrupSelects(); renderUrun(true); showToast("Ürün grupları kaydedildi!");
}

export function previewUrunFoto(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) { $('mu-foto-preview').src = e.target.result; $('mu-foto-preview').style.display = 'block'; }
  reader.readAsDataURL(file);
}

export function renderUrun(force = false) {
  if (!force) return;
  const q = $('filter-urun-q').value.toLowerCase().trim(); const fGrup = $('filter-urun-grup') ? $('filter-urun-grup').value : '';
  const list = $('urun-list'); list.innerHTML = '';
  let urun = DB.u.filter(x => !x.silindi).sort((a, b) => getTimeMs(b.olusturmaTarihi) - getTimeMs(a.olusturmaTarihi));

  urun.forEach(u => {
    const content = (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase();
    if (q && !content.includes(q)) return;
    if (fGrup && String(u.grupId) !== String(fGrup)) return;
    const gName = u.grupId ? (DB.ug.find(x => x.id === u.grupId)?.ad || '') : '';
    let stok = Number(u.stok || 0); let bClass = stok >= 10 ? 'bg-green' : (stok > 0 ? 'bg-amber' : 'bg-red');
    list.innerHTML += `<div class="list-item" onclick="editUrun('${u.id}')"><div><div style="font-weight:bold">${u.ad} <span style="font-size:0.65rem; color:var(--accent); font-weight:normal; border:1px solid var(--accent); padding:1px 4px; border-radius:4px; margin-left:4px; display:${gName ? 'inline-block' : 'none'}">${gName}</span></div><div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">Barkod: ${u.barkod || '-'}</div></div><div style="text-align:right"><div style="font-weight:bold; color:var(--accent)">${fp(u.satisFiyat)}</div><span class="badge ${bClass}">${stok} ${getBirimAd(u.birim)}</span></div></div>`;
  });
}

export function openUrunModal() {
  $('mu-id').value = ''; $('mu-ad').value = ''; $('mu-barkod').value = ''; $('mu-alis').value = ''; $('mu-satis').value = ''; $('mu-stok').value = ''; $('mu-birim').value = '1'; $('mu-desc').value = ''; $('mu-grup').value = '';
  $('mu-foto-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none';
  $('mu-del').classList.add('hidden'); loadUrunGrupSelects(); openM('mo-urun');
}

export function editUrun(id) {
  const u = DB.u.find(x => String(x.id) === String(id)); if (!u) return; loadUrunGrupSelects();
  $('mu-id').value = u.id; $('mu-ad').value = u.ad; $('mu-barkod').value = u.barkod || '';
  $('mu-alis').value = formatTR(u.alisFiyat); $('mu-satis').value = formatTR(u.satisFiyat);
  $('mu-stok').value = u.stok || 0; $('mu-birim').value = u.birim || '1'; $('mu-desc').value = u.desc || ''; $('mu-grup').value = u.grupId || '';
  if (u.foto) { $('mu-foto-preview').src = u.foto; $('mu-foto-preview').style.display = 'block'; } 
  else { $('mu-foto-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none'; }
  $('mu-del').classList.remove('hidden');
  $('mu-del').onclick = () => { showConfirm(`${u.ad} silinecek?`, () => { softDelete(DB.u, id); saveDB(); closeM('mo-urun'); renderUrun(true); }, '🗑️', 'Ürün Sil'); };
  openM('mo-urun');
}

export function saveUrun() {
  const ad = $('mu-ad').value.trim(); if (!ad) return showToast('Ürün adı zorunlu!');
  const id = $('mu-id').value;
  const data = { ad, barkod: $('mu-barkod').value, grupId: $('mu-grup').value, birim: Number($('mu-birim').value) || 1, desc: $('mu-desc').value.trim(), alisFiyat: parseRawTR($('mu-alis').value), satisFiyat: parseRawTR($('mu-satis').value), stok: Number($('mu-stok').value) || 0, foto: $('mu-foto-preview').src.startsWith('data:') ? $('mu-foto-preview').src : '' };
  if (id) Object.assign(DB.u.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  else DB.u.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
  saveDB(); closeM('mo-urun'); renderUrun(true);
}