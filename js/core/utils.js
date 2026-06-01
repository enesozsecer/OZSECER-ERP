import { DB } from './db.js';

export const ISLEM = { ALIS: 1, SATIS: 2 };
export const KASA = { TAHSILAT: 1, ODEME: 2 };
export const BIRIM = { 1: 'Ad', 2: 'Kg', 3: 'Gr', 4: 'Lt', 5: 'Mt', 6: 'Pk', 7: 'Koli' };

export function getBirimAd(val) { return BIRIM[val] || val || 'Ad'; }
export function $(id) { return document.getElementById(id); }
export function guid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }

// TARİH FORMATLARI (ISO 8601 ve HTML Uyumlu)
export function tsNow() { return new Date().toISOString(); } 
export function dtLocalNow() { 
  const d = new Date(); const pad = n => n < 10 ? '0' + n : n;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function dtFormat(isoString) { 
  if (!isoString) return ''; const d = new Date(isoString); 
  return isNaN(d) ? isoString : d.toLocaleDateString('tr-TR') + ' ' + d.toLocaleTimeString('tr-TR').slice(0,5); 
}
export function formatDateOnly(isoString) {
  if (!isoString) return ''; const d = new Date(isoString); 
  return isNaN(d) ? isoString : d.toLocaleDateString('tr-TR');
}

// PARA FORMATLARI
export function fp(v) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0); }
export function formatTR(val) { if (val === undefined || val === null || val === '' || isNaN(val)) return ''; return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val); }
export function toRawTR(val) { if (val === undefined || val === null || val === '' || isNaN(val)) return ''; if (val === 0) return '0'; return val.toString().replace('.', ','); }
export function parseRawTR(str) { if (!str) return 0; let clean = str.toString().replace(/\./g, '').replace(/,/g, '.'); return parseFloat(clean) || 0; }
export function getCihazAdi() { return localStorage.getItem('ozsecer_cihaz') || 'Mobil Cihaz'; }

export function softDelete(arr, id) { 
  const i = arr.find(x => String(x.Id) === String(id)); 
  if (i) Object.assign(i, { Deleted: true, DeletedDate: tsNow(), DeletedUser: getCihazAdi() }); 
}

// UI YARDIMCILARI
export function showToast(msg) { const t = $('toast'); t.innerText = msg; t.style.display = 'block'; setTimeout(() => { t.style.display = 'none'; }, 2000); }
export function openM(id) { $(id).classList.add('show'); }
export function closeM(id) { $(id).classList.remove('show'); }
export function closeOnOutside(e, id) { if (e.target.id === id) closeM(id); }
export function showConfirm(msg, cb, icon = '', title = 'Onay') { $('conf-title').innerText = icon + ' ' + title; $('conf-msg').innerText = msg; $('conf-yes').onclick = () => { closeM('mo-confirm'); cb(); }; openM('mo-confirm'); }
export function showSpinner(msg) { $('spinner-msg').innerText = msg || 'Lütfen bekleyin...'; openM('mo-spinner'); }
export function updateSpinner(msg) { $('spinner-msg').innerText = msg; }
export function hideSpinner() { closeM('mo-spinner'); }
export function showCustomAlert(msg, isSuccess = true) { $('alert-icon').innerText = isSuccess ? '✅' : '❌'; $('alert-title').innerText = isSuccess ? 'İşlem Başarılı' : 'Hata Oluştu'; $('alert-title').style.color = isSuccess ? 'var(--green)' : 'var(--red)'; $('alert-msg').innerText = msg; openM('mo-alert'); }

// İŞ MANTIKLARI (Business Logic)
export function calcBalance(currentId) {
  let net = 0;
  DB.Order.filter(x => !x.Deleted && String(x.CurrentId) === String(currentId)).forEach(x => {
    if (Number(x.OrderTypeId) === ISLEM.SATIS) net += Number(x.TotalPrice || 0);
    if (Number(x.OrderTypeId) === ISLEM.ALIS) net -= Number(x.TotalPrice || 0);
  });
  DB.Payment.filter(x => !x.Deleted && String(x.CurrentId) === String(currentId)).forEach(x => {
    if (Number(x.PaymentTypeId) === KASA.TAHSILAT) net -= Number(x.Payment || 0);
    if (Number(x.PaymentTypeId) === KASA.ODEME) net += Number(x.Payment || 0);
  });
  return net;
}

export function updateStock(productId, amount, isAlis, isAdding) {
  const u = DB.Product.find(x => String(x.Id) === String(productId));
  if (!u) return;
  let multiplier = isAlis ? 1 : -1;
  if (!isAdding) multiplier *= -1;
  u.StockQuantity = (Number(u.StockQuantity) || 0) + (Number(amount) * multiplier);
}