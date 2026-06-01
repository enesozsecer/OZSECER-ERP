import { DB } from './db.js';

export const ISLEM = { ALIS: 1, SATIS: 2 };
export const KASA = { TAHSILAT: 1, ODEME: 2 };
export const BIRIM = { 1: 'Ad', 2: 'Kg', 3: 'Gr', 4: 'Lt', 5: 'Mt', 6: 'Pk', 7: 'Koli' };

export function getBirimAd(val) { return BIRIM[val] || val || 'Ad'; }
export function $(id) { return document.getElementById(id); }
export function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
export function pad(n) { return n < 10 ? '0' + n : n; }
export function tsNow() { const d = new Date(); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
export function dtNow() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function dtFormat(v) { if (!v) return ''; const [date, time] = v.split('T'); const [y, m, d] = date.split('-'); return `${d}.${m}.${y} ${time || ''}`; }
export function fd(d) { if (!d) return ''; const x = new Date(d); if (isNaN(x)) return d; return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`; }
export function fp(v) { return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0); }
export function formatTR(val) { if (val === undefined || val === null || val === '' || isNaN(val)) return ''; return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val); }
export function toRawTR(val) { if (val === undefined || val === null || val === '' || isNaN(val)) return ''; if (val === 0) return '0'; return val.toString().replace('.', ','); }
export function parseRawTR(str) { if (!str) return 0; let clean = str.toString().replace(/\./g, '').replace(/,/g, '.'); return parseFloat(clean) || 0; }
export function getTimeMs(str) { if (!str) return 0; if (str.includes('T')) return new Date(str).getTime(); const parts = str.split(' '); if (parts.length !== 2) return 0; const d = parts[0].split('.'); const t = parts[1].split(':'); if (d.length !== 3 || t.length !== 3) return 0; return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]).getTime(); }

export function getCihazAdi() { return localStorage.getItem('ozsecer_cihaz') || 'Mobil Cihaz'; }
export function softDelete(arr, id) { const i = arr.findIndex(x => String(x.id) === String(id)); if (i > -1) Object.assign(arr[i], { silindi: true, silinmeTarihi: tsNow(), silen: getCihazAdi() }); }

export function showToast(msg) { const t = $('toast'); t.innerText = msg; t.style.display = 'block'; setTimeout(() => { t.style.display = 'none'; }, 2000); }
export function openM(id) { $(id).classList.add('show'); }
export function closeM(id) { $(id).classList.remove('show'); }
export function closeOnOutside(e, id) { if (e.target.id === id) closeM(id); }
export function showConfirm(msg, cb, icon = '', title = 'Onay') { $('conf-title').innerText = icon + ' ' + title; $('conf-msg').innerText = msg; $('conf-yes').onclick = () => { closeM('mo-confirm'); cb(); }; openM('mo-confirm'); }

export function showSpinner(msg) { $('spinner-msg').innerText = msg || 'Lütfen bekleyin...'; openM('mo-spinner'); }
export function updateSpinner(msg) { $('spinner-msg').innerText = msg; }
export function hideSpinner() { closeM('mo-spinner'); }
export function showCustomAlert(msg, isSuccess = true) { $('alert-icon').innerText = isSuccess ? '✅' : '❌'; $('alert-title').innerText = isSuccess ? 'Eşitleme Başarılı' : 'Hata Oluştu'; $('alert-title').style.color = isSuccess ? 'var(--green)' : 'var(--red)'; $('alert-msg').innerText = msg; openM('mo-alert'); }

export function calcNet(cariId) {
  let net = 0;
  DB.s.filter(x => !x.silindi && String(x.cariId) === String(cariId)).forEach(x => {
    if (Number(x.tur) === ISLEM.SATIS) net += Number(x.toplam || 0);
    if (Number(x.tur) === ISLEM.ALIS) net -= Number(x.toplam || 0);
  });
  DB.t.filter(x => !x.silindi && String(x.cariId) === String(cariId)).forEach(x => {
    if (Number(x.tur) === KASA.TAHSILAT) net -= Number(x.tutar || 0);
    if (Number(x.tur) === KASA.ODEME) net += Number(x.tutar || 0);
  });
  return net;
}

export function updateStok(urunId, miktar, isAlis, isEkleme) {
  const u = DB.u.find(x => String(x.id) === String(urunId));
  if (!u) return;
  let carp = isAlis ? 1 : -1;
  if (!isEkleme) carp *= -1;
  u.stok = (Number(u.stok) || 0) + (Number(miktar) * carp);
}