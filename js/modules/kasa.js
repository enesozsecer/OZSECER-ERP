import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtLocalNow, dtFormat, fp, KASA, toRawTR, formatTR, parseRawTR, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { printKasa } from '../core/pdf.js';

let kasaLimit = 20;
export function renderKasa(force = false, resetLimit = true) {
  if (window.listenToCollection) {
      window.listenToCollection('Payment');
  }
  
  if (!force) return; 
  if (resetLimit) kasaLimit = 20;

  const fTur = $('filter-kasa-tur').value; const fCari = $('filter-kasa-cari').value; const fGrup = $('filter-kasa-grup').value; const fStart = $('filter-kasa-start').value; const fEnd = $('filter-kasa-end').value; const list = $('kasa-list'); list.innerHTML = '';
  
  let filtered = DB.Payment.filter(x => !x.Deleted).filter(t => {
    const c = DB.Current.find(x => String(x.Id) === String(t.CurrentId));
    if (fTur && Number(t.PaymentTypeId) !== Number(fTur)) return false; 
    if (fCari && String(t.CurrentId) !== String(fCari)) return false;
    if (fGrup) { if (!c || String(c.CurrentGroupId) !== String(fGrup)) return false; }
    if (fStart || fEnd) { const d = new Date(t.PaymentDate); if (fStart && d < new Date(fStart)) return false; if (fEnd && d > new Date(fEnd + 'T23:59:59')) return false; }
    return true;
  });

  filtered.sort((a, b) => new Date(b.PaymentDate) - new Date(a.PaymentDate));
  let pagedList = filtered.slice(0, kasaLimit);

  pagedList.forEach(t => {
    const cObj = DB.Current.find(x => String(x.Id) === String(t.CurrentId)) || { Name: 'Bilinmeyen' };
    const isTah = Number(t.PaymentTypeId) === KASA.TAHSILAT;
    list.innerHTML += `<div class="list-item" onclick="editKasa('${t.Id}')"><div><div style="font-weight:bold; color:${isTah ? 'var(--green)' : 'var(--red)'}; font-size:0.9rem">${isTah ? '⬇️ Tahsilat' : '⬆️ Ödeme'}</div><div style="font-size:0.85rem">${cObj.Name}</div><div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(t.PaymentDate)}</div></div><div style="text-align:right; font-weight:bold; font-size:1.1rem">${fp(t.Payment)}</div></div>`;
  });

  if (filtered.length > kasaLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.8rem;" onclick="loadMoreKasa()">Daha Fazla Göster (${filtered.length - kasaLimit} Kaldı)</button>`;
  }
}
window.loadMoreKasa = function() { kasaLimit += 20; renderKasa(true, false); };

export function openKasaModal() {
  $('mk-Id').value = ''; $('mk-PaymentTypeId').value = KASA.TAHSILAT; $('mk-PaymentDate').value = dtLocalNow(); $('mk-Payment').value = ''; $('mk-Description').value = ''; $('mk-CurrentId').value = ''; $('csd-mk-CurrentId').innerText = 'Cari Seçiniz...'; $('mk-del').classList.add('hidden'); $('mk-pdf').classList.add('hidden'); openM('mo-kasa');
}

export function editKasa(id) {
  const t = DB.Payment.find(x => String(x.Id) === String(id)); if (!t) return; const c = DB.Current.find(x => String(x.Id) === String(t.CurrentId));
  $('mk-Id').value = t.Id; $('mk-PaymentTypeId').value = t.PaymentTypeId; $('mk-PaymentDate').value = t.PaymentDate ? t.PaymentDate.slice(0, 16) : dtLocalNow(); $('mk-Payment').value = formatTR(t.Payment); $('mk-Description').value = t.Description || ''; $('mk-CurrentId').value = t.CurrentId; $('csd-mk-CurrentId').innerText = c ? c.Name : 'Bilinmeyen Cari';
  $('mk-del').classList.remove('hidden'); $('mk-pdf').classList.remove('hidden');
  $('mk-del').onclick = () => { showConfirm(`İşlem silinecek?`, () => { softDelete(DB.Payment, id); saveDB(); closeM('mo-kasa'); renderKasa(true); }, '🗑️', 'İşlem Sil'); }; $('mk-pdf').onclick = () => printKasa(t.Id); openM('mo-kasa');
}

export function saveKasa() {
  const currentId = $('mk-CurrentId').value; if (!currentId) return showToast('Cari seçimi zorunlu!');
  const payment = parseRawTR($('mk-Payment').value); if (!payment || payment <= 0) return showToast('Geçerli bir tutar girin!');
  const id = $('mk-Id').value;
  
  const data = { 
    PaymentTypeId: Number($('mk-PaymentTypeId').value), 
    CurrentId: String(currentId), 
    PaymentDate: new Date($('mk-PaymentDate').value).toISOString(), 
    Payment: payment, 
    Description: toTitleCaseTR($('mk-Description').value.trim()) // KASA AÇIKLAMASI TITLE CASE YAPILDI
  };
  
  if (id) Object.assign(DB.Payment.find(x => String(x.Id) === String(id)), data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  else DB.Payment.push({ Id: guid(), ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  
  saveDB(); closeM('mo-kasa'); renderKasa(true); renderHome();
}