import { DB } from '../core/db.js';
import { $, fp, ISLEM, KASA, calcNet } from '../core/utils.js';

export function renderAnaliz(force = false) {
  if (!force) return;
  const start = $('an-start').value; const end = $('an-end').value; const fGrup = $('filter-an-grup').value;
  let ss = DB.s.filter(x => !x.silindi);

  if (fGrup) { ss = ss.filter(s => { const c = DB.c.find(x => String(x.id) === String(s.cariId)); return c && String(c.grupId) === String(fGrup); }); }
  if (start && end) { const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59); ss = ss.filter(x => { const d = new Date(x.tarih); return d >= sD && d <= eD; }); }

  let tAlis = 0, tSatis = 0, tKar = 0;
  ss.forEach(s => {
    if (Number(s.tur) === ISLEM.ALIS) tAlis += s.toplam;
    if (Number(s.tur) === ISLEM.SATIS) { tSatis += s.toplam; s.items.forEach(it => { const u = DB.u.find(x => String(x.id) === String(it.urunId)); const maliyet = u ? u.alisFiyat : 0; tKar += (it.fiyat - maliyet) * it.miktar; }); }
  });

  let mBorc = 0, mAlacak = 0;
  DB.c.filter(x => !x.silindi).forEach(c => {
    if (fGrup && String(c.grupId) !== String(fGrup)) return;
    const n = calcNet(c.id);
    if (n > 0) mBorc += n; if (n < 0) mAlacak += Math.abs(n);
  });

  let stokMaliyet = 0, stokDeger = 0;
  DB.u.filter(x => !x.silindi).forEach(u => { const s = Number(u.stok) || 0; if (s > 0) { stokMaliyet += s * (Number(u.alisFiyat) || 0); stokDeger += s * (Number(u.satisFiyat) || 0); } });

  let tTahsilat = 0, tOdeme = 0; let tt = DB.t.filter(x => !x.silindi);
  if (fGrup) { tt = tt.filter(t => { const c = DB.c.find(x => String(x.id) === String(t.cariId)); return c && String(c.grupId) === String(fGrup); }); }
  if (start && end) { const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59); tt = tt.filter(x => { const d = new Date(x.tarih); return d >= sD && d <= eD; }); }
  tt.forEach(t => { if (Number(t.tur) === KASA.TAHSILAT) tTahsilat += Number(t.tutar); if (Number(t.tur) === KASA.ODEME) tOdeme += Number(t.tutar); });

  const or = tSatis > 0 ? ((tKar / tSatis) * 100).toFixed(1) : 0;

  $('analiz-grid').innerHTML = `
    <div class="card"><div class="card-title">Alış Tutarı</div><div class="card-value text-red">${fp(tAlis)}</div></div>
    <div class="card"><div class="card-title">Satış Tutarı</div><div class="card-value text-green">${fp(tSatis)}</div></div>
    <div class="card"><div class="card-title">Kasa Ödeme (Çıkan)</div><div class="card-value text-red">${fp(tOdeme)}</div></div>
    <div class="card"><div class="card-title">Kasa Tahsilat (Giren)</div><div class="card-value text-green">${fp(tTahsilat)}</div></div>
    <div class="card"><div class="card-title">Stok Alış Maliyeti</div><div class="card-value text-red">${fp(stokMaliyet)}</div></div>
    <div class="card"><div class="card-title">Stok Satış Değeri</div><div class="card-value text-green">${fp(stokDeger)}</div></div>
    <div class="card"><div class="card-title">Piyasaya Borcumuz</div><div class="card-value text-red">${fp(mAlacak)}</div></div>
    <div class="card"><div class="card-title">Piyasadaki Alacağımız</div><div class="card-value text-green">${fp(mBorc)}</div></div>
    <div class="card"><div class="card-title">Kâr Tutarı / Oranı</div><div class="card-value">${fp(tKar)} <span style="font-size:1rem;color:var(--text-muted)">(%${or})</span></div></div>`;
}