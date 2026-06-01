import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, getTimeMs, calcNet, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { printEkstre } from '../core/pdf.js';
import { renderHome } from './home.js';

export function loadGrupSelects() {
  const selCari = $('mc-grup'); const selKasaFiltre = $('filter-kasa-grup'); const selAnFiltre = $('filter-an-grup');
  if (selCari) selCari.innerHTML = '<option value="">Grup Yok</option>';
  if (selKasaFiltre) selKasaFiltre.innerHTML = '<option value="">Tüm Gruplar</option>';
  if (selAnFiltre) selAnFiltre.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.g.forEach(g => {
    if (selCari) selCari.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selKasaFiltre) selKasaFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selAnFiltre) selAnFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
  });
}

let tempGruplar = [];
export function openGrupModal() { tempGruplar = JSON.parse(JSON.stringify(DB.g)); $('mg-new-ad').value = ''; renderGrupList(); openM('mo-grup'); }

export function renderGrupList() {
  const list = $('mg-list'); list.innerHTML = '';
  if (tempGruplar.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Kayıtlı grup yok.</p>'; return; }
  tempGruplar.forEach((g, idx) => {
    list.innerHTML += `<div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
      <input type="text" value="${g.ad}" onchange="updateTempGrup(${idx}, this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem;">
      <button class="icon-btn text-red" style="padding:0; font-size:1.2rem;" onclick="deleteTempGrup(${idx})">🗑️</button></div>`;
  });
}

export function addTempGrup() { const ad = $('mg-new-ad').value.trim(); if (!ad) return showToast("Grup adı girin!"); tempGruplar.push({ id: guid(), ad: ad }); $('mg-new-ad').value = ''; renderGrupList(); }
export function updateTempGrup(idx, val) { tempGruplar[idx].ad = val.trim(); }
export function deleteTempGrup(idx) { tempGruplar.splice(idx, 1); renderGrupList(); }

export function saveGrup() {
  const deletedGroups = DB.g.filter(oldG => !tempGruplar.find(tG => tG.id === oldG.id));
  for (let dg of deletedGroups) {
    const isUsed = DB.c.some(c => !c.silindi && c.grupId === String(dg.id));
    if (isUsed) return showToast(`HATA: "${dg.ad}" grubu bir caride kayıtlı olduğu için silinemez!`);
  }
  DB.g = JSON.parse(JSON.stringify(tempGruplar));
  saveDB(); closeM('mo-grup'); loadGrupSelects(); renderCari(true); showToast("Gruplar başarıyla kaydedildi!");
}

export function renderCari(force = false) {
  if (!force) return;
  const q = $('filter-cari-q').value.toLowerCase().trim();
  const f = $('filter-cari-durum').value;
  const list = $('cari-list'); list.innerHTML = '';
  let cari = DB.c.filter(x => !x.silindi).sort((a, b) => getTimeMs(b.olusturmaTarihi) - getTimeMs(a.olusturmaTarihi));

  cari.forEach(c => {
    const content = (c.ad + " " + (c.tel || "") + " " + (c.vkn || "") + " " + (c.adres || "")).toLowerCase();
    if (q && !content.includes(q)) return;
    const net = calcNet(c.id);
    if (f === 'alacakli' && net >= 0) return;
    if (f === 'borclu' && net <= 0) return;
    const gName = c.grupId ? (DB.g.find(x => x.id === c.grupId)?.ad || '') : '';
    let netHtml = `<span style="color:var(--text-muted)">0,00</span>`;
    if (net > 0) netHtml = `<span class="text-red">Borçlu: ${fp(net)}</span>`;
    if (net < 0) netHtml = `<span class="text-green">Alacaklı: ${fp(Math.abs(net))}</span>`;
    list.innerHTML += `<div class="list-item" onclick="editCari('${c.id}')"><div><div style="font-weight:bold">${c.ad} <span style="font-size:0.65rem; color:var(--accent); font-weight:normal; border:1px solid var(--accent); padding:1px 4px; border-radius:4px; margin-left:4px">${gName}</span></div><div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">${c.tel || '-'} | VKN: ${c.vkn || '-'}</div></div><div style="text-align:right; font-weight:bold">${netHtml}</div></div>`;
  });
}

export function openCariModal() {
  $('mc-id').value = ''; $('mc-ad').value = ''; $('mc-tel').value = ''; $('mc-vkn').value = ''; $('mc-adres').value = '';
  loadGrupSelects(); $('mc-title').innerText = 'Yeni Cari'; $('mc-del').classList.add('hidden'); $('mc-ekstre').classList.add('hidden'); openM('mo-cari');
}

export function editCari(id) {
  const c = DB.c.find(x => String(x.id) === String(id));
  if (!c) return;
  loadGrupSelects();
  $('mc-id').value = c.id; $('mc-ad').value = c.ad; $('mc-tel').value = c.tel || ''; $('mc-vkn').value = c.vkn || ''; $('mc-adres').value = c.adres || ''; $('mc-grup').value = c.grupId || '';
  $('mc-title').innerText = 'Cari Düzenle'; $('mc-del').classList.remove('hidden'); $('mc-ekstre').classList.remove('hidden');
  $('mc-del').onclick = () => { showConfirm(`${c.ad} silinecek?`, () => { softDelete(DB.c, id); saveDB(); closeM('mo-cari'); renderCari(true); renderHome(); }, '🗑️', 'Cari Sil'); };
  $('mc-ekstre').onclick = () => { closeM('mo-cari'); printEkstre(c.id); };
  openM('mo-cari');
}

export function saveCari() {
  const ad = $('mc-ad').value.trim();
  if (!ad) return showToast('Ad zorunlu!');
  const id = $('mc-id').value;
  const data = { ad, grupId: $('mc-grup').value, tel: $('mc-tel').value, vkn: $('mc-vkn').value, adres: $('mc-adres').value };
  if (id) Object.assign(DB.c.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  else DB.c.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
  saveDB(); closeM('mo-cari'); renderCari(true);
}