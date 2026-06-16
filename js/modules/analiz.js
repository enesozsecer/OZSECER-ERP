import { DB } from '../core/db.js';
import { $, fp, ISLEM, KASA, calcBalance } from '../core/utils.js';

export function renderAnaliz(force = false) {
  if (window.listenToCollection) {
      window.listenToCollection('Order');
      window.listenToCollection('OrderItem');
      window.listenToCollection('Payment');
  }
  
  if (!force) return;
  const start = $('an-start').value; const end = $('an-end').value; const fGrup = $('filter-an-grup').value;
  let ss = DB.Order.filter(x => !x.Deleted);

  if (fGrup) { ss = ss.filter(s => { const c = DB.Current.find(x => String(x.Id) === String(s.CurrentId)); return c && String(c.CurrentGroupId) === String(fGrup); }); }
  if (start && end) { const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59); ss = ss.filter(x => { const d = new Date(x.OrderDate); return d >= sD && d <= eD; }); }

  let tAlis = 0, tSatis = 0, tKar = 0;
  ss.forEach(s => {
    if (Number(s.OrderTypeId) === ISLEM.ALIS) tAlis += s.TotalPrice;
    if (Number(s.OrderTypeId) === ISLEM.SATIS) { 
      tSatis += s.TotalPrice; 
      const kalemler = DB.OrderItem.filter(x => x.OrderId === s.Id && !x.Deleted);
      kalemler.forEach(it => { 
        const u = DB.Product.find(x => String(x.Id) === String(it.ProductId)); 
        const maliyet = u ? (Number(u.PurchasePrice) || 0) : 0; 
        tKar += (Number(it.UnitPrice) - maliyet) * Number(it.Amount); 
      }); 
      
      // SİPARİŞE UYGULANAN İNDİRİMİ NET KÂRDAN DÜŞÜYORUZ
      tKar -= Number(s.DisCount) || 0;
    }
  });

  let mBorc = 0, mAlacak = 0;
  DB.Current.filter(x => !x.Deleted).forEach(c => {
    if (fGrup && String(c.CurrentGroupId) !== String(fGrup)) return;
    const n = calcBalance(c.Id) + (Number(c.Balance) || 0);
    if (n > 0) mBorc += n; if (n < 0) mAlacak += Math.abs(n);
  });

  let stokMaliyet = 0, stokDeger = 0;
  DB.Product.filter(x => !x.Deleted).forEach(u => { const s = Number(u.StockQuantity) || 0; if (s > 0) { stokMaliyet += s * (Number(u.PurchasePrice) || 0); stokDeger += s * (Number(u.SalePrice) || 0); } });

  let tTahsilat = 0, tOdeme = 0; let tt = DB.Payment.filter(x => !x.Deleted);
  if (fGrup) { tt = tt.filter(t => { const c = DB.Current.find(x => String(x.Id) === String(t.CurrentId)); return c && String(c.CurrentGroupId) === String(fGrup); }); }
  if (start && end) { const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59); tt = tt.filter(x => { const d = new Date(x.PaymentDate); return d >= sD && d <= eD; }); }
  tt.forEach(t => { if (Number(t.PaymentTypeId) === KASA.TAHSILAT) tTahsilat += Number(t.Payment); if (Number(t.PaymentTypeId) === KASA.ODEME) tOdeme += Number(t.Payment); });

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