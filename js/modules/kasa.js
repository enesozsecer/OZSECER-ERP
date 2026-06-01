import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtNow, dtFormat, fp, KASA, toRawTR, formatTR, parseRawTR, getTimeMs, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { printKasa } from '../core/pdf.js';
import { renderHome } from './home.js';

export function renderKasa(force = false) {
  if (!force) return;
  const fTur = $('filter-kasa-tur').value; const fCari = $('filter-kasa-cari').value; const fGrup = $('filter-kasa-grup').value; const fStart = $('filter-kasa-start').value; const fEnd = $('filter-kasa-end').value;
  const list = $('kasa-list'); list.innerHTML = '';

  let ts = DB.t.filter(x => !x.silindi).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  ts.forEach(t => {
    const c = DB.c.find(x => String(x.id) === String(t.cariId)); const cObj = c || { ad: 'Bilinmeyen' };
    if (fTur && Number(t.tur) !== Number(fTur)) return;
    if (fCari && String(t.cariId) !== String(fCari)) return;
    if (fGrup) { if (!c || String(c.grupId) !== String(fGrup)) return; }
    if (fStart || fEnd) { const d = new Date(t.tarih); if (fStart && d < new Date(fStart)) return; if (fEnd && d > new Date(fEnd + 'T23:59:59')) return; }

    const isTah = Number(t.tur) === KASA.TAHSILAT;
    list.innerHTML += `<div class="list-item" onclick="editKasa('${t.id}')"><div><div style="font-weight:bold; color:${isTah ? 'var(--green)' : 'var(--red)'}; font-size:0.9rem">${isTah ? '⬇️ Tahsilat' : '⬆️ Ödeme'}</div><div style="font-size:0.85rem">${cObj.ad}</div><div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(t.tarih)}</div></div><div style="text-align:right; font-weight:bold; font-size:1.1rem">${fp(t.tutar)}</div></div>`;
  });
}

export function openKasaModal() {
  $('mk-id').value = ''; $('mk-tur').value = KASA.TAHSILAT; $('mk-tarih').value = dtNow(); $('mk-tutar').value = ''; $('mk-aciklama').value = '';
  $('mk-cari').value = ''; $('csd-mk-cari').innerText = 'Cari Seçiniz...';
  $('mk-del').classList.add('hidden'); $('mk-pdf').classList.add('hidden'); openM('mo-kasa');
}

export function editKasa(id) {
  const t = DB.t.find(x => String(x.id) === String(id)); if (!t) return;
  const c = DB.c.find(x => String(x.id) === String(t.cariId));
  $('mk-id').value = t.id; $('mk-tur').value = t.tur; $('mk-tarih').value = t.tarih;
  $('mk-tutar').value = formatTR(t.tutar); $('mk-aciklama').value = t.aciklama || '';
  $('mk-cari').value = t.cariId; $('csd-mk-cari').innerText = c ? c.ad : 'Bilinmeyen Cari';
  $('mk-del').classList.remove('hidden'); $('mk-pdf').classList.remove('hidden');
  $('mk-del').onclick = () => { showConfirm(`İşlem silinecek?`, () => { softDelete(DB.t, id); saveDB(); closeM('mo-kasa'); renderKasa(true); renderHome(); }, '🗑️', 'İşlem Sil'); };
  $('mk-pdf').onclick = () => printKasa(t.id); openM('mo-kasa');
}

export function saveKasa() {
  const cariId = $('mk-cari').value; if (!cariId) return showToast('Cari seçimi zorunlu!');
  const tutar = parseRawTR($('mk-tutar').value); if (!tutar || tutar <= 0) return showToast('Geçerli bir tutar girin!');
  const id = $('mk-id').value;
  const data = { tur: Number($('mk-tur').value), cariId: String(cariId), tarih: $('mk-tarih').value, tutar, aciklama: $('mk-aciklama').value };
  if (id) Object.assign(DB.t.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  else DB.t.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
  saveDB(); closeM('mo-kasa'); renderKasa(true); renderHome();
}