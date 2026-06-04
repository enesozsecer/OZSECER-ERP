import { DB } from './db.js';
import { calcBalance, fp, formatDateOnly, ISLEM, KASA, getBirimAd, formatTR } from './utils.js';

const PDF_CSS = `body { font-family: Arial; font-size: 14pt; margin:0; padding:15mm; } h1 { font-size: 20pt; text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; } p { margin: 5px 0; } .bold { font-weight: bold; } .master-box { border: 1px solid #000; padding: 10px; margin-bottom: 20px; border-radius: 5px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background: #f4f4f4; } .text-right { text-align: right; } .total-line { font-size: 16pt; font-weight: bold; border-top: 2px solid #000; padding-top:10px; margin-top:10px; text-align: right; }`;

export function getMasterHtml(tarih, cari, title) {
  const net = calcBalance(cari.Id) + (Number(cari.Balance) || 0);
  let bakiyeStr = '0,00 (Kapalı)';
  if (net > 0) bakiyeStr = `<span style="color:#d32f2f">${fp(net)} (Borçlu)</span>`;
  else if (net < 0) bakiyeStr = `<span style="color:#388e3c">${fp(Math.abs(net))} (Alacaklı)</span>`;
  return `<h1>${title}</h1><div class="master-box"><p><span class="bold">Tarih:</span> ${formatDateOnly(tarih)}</p><p><span class="bold">Cari:</span> ${cari.Name}</p><p><span class="bold">Kalan Bakiye:</span> ${bakiyeStr}</p></div>`;
}

export function openInTab(htmlStr, title) {
  const full = `<!DOCTYPE html><html><head><title>${title}</title><style>${PDF_CSS}</style></head><body>${htmlStr}<script>setTimeout(function(){window.print();}, 500);<\/script></body></html>`;
  const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(full); w.document.close(); } 
}

export function printSip(id) {
  const s = DB.Order.find(x => String(x.Id) === String(id));
  const c = DB.Current.find(x => String(x.Id) === String(s.CurrentId)) || { Name: '-' };
  const title = Number(s.OrderTypeId) === ISLEM.ALIS ? 'ALIŞ SİPARİŞİ' : 'SATIŞ SİPARİŞİ';
  let trs = '';
  DB.OrderItem.filter(x => x.OrderId === s.Id && !x.Deleted).forEach(it => {
    const p = DB.Product.find(x => x.Id === it.ProductId) || { Name: 'Bilinmeyen' };
    trs += `<tr><td>${it.Amount}</td><td>${getBirimAd(it.UnitId)}</td><td class="bold">${p.Name}</td><td>${fp(it.UnitPrice)}</td><td class="text-right bold">${fp(it.TotalPrice)}</td></tr>`;
  });
  const h = `${getMasterHtml(s.OrderDate, c, title)}<table><thead><tr><th>Miktar</th><th>Birim</th><th>Ürün Adı</th><th>B. Fiyat</th><th class="text-right">Toplam</th></tr></thead><tbody>${trs}</tbody></table><div style="text-align:right; margin-top:20px;"><div>Ara Toplam: ${fp(s.SubTotalPrice)}</div><div>İskonto: ${fp(s.DisCount)}</div><div class="total-line">Genel Toplam: ${fp(s.TotalPrice)}</div></div>`;
  openInTab(h, title);
}

export function printKasa(id) {
  const t = DB.Payment.find(x => String(x.Id) === String(id));
  const c = DB.Current.find(x => String(x.Id) === String(t.CurrentId)) || { Name: '-' };
  const isTah = Number(t.PaymentTypeId) === KASA.TAHSILAT;
  const title = isTah ? 'TAHSİLAT MAKBUZU' : 'ÖDEME MAKBUZU';
  const h = `${getMasterHtml(t.PaymentDate, c, title)}<table><thead><tr><th>İşlem Tipi</th><th class="text-right">Tutar</th></tr></thead><tbody><tr><td class="bold">${isTah ? 'Tahsilat' : 'Ödeme'}</td><td class="text-right bold">${fp(t.Payment)}</td></tr></tbody></table>${t.Description ? `<p style="margin-top:20px;"><span class="bold">Açıklama:</span> ${t.Description}</p>` : ''}`;
  openInTab(h, title);
}

export function printEkstre(cariId) {
  const c = DB.Current.find(x => String(x.Id) === String(cariId)); if (!c) return;
  const masterHtml = getMasterHtml(new Date().toISOString(), c, 'CARİ EKSTRE');
  const har = [];
  DB.Order.filter(x => !x.Deleted && String(x.CurrentId) === String(cariId)).forEach(x => { har.push({ t: x.OrderDate, tur: (Number(x.OrderTypeId) === ISLEM.SATIS ? 'Satış' : 'Alış'), b: (Number(x.OrderTypeId) === ISLEM.SATIS ? x.TotalPrice : -x.TotalPrice) }); });
  DB.Payment.filter(x => !x.Deleted && String(x.CurrentId) === String(cariId)).forEach(x => { har.push({ t: x.PaymentDate, tur: (Number(x.PaymentTypeId) === KASA.TAHSILAT ? 'Tahsilat' : 'Ödeme'), b: (Number(x.PaymentTypeId) === KASA.ODEME ? x.Payment : -x.Payment) }); });
  har.sort((a, b) => new Date(a.t) - new Date(b.t));
  let trs = ''; let bakiye = Number(c.Balance) || 0;
  if (bakiye !== 0) trs += `<tr><td>-</td><td class="bold">Açılış Bakiyesi</td><td class="text-right">-</td><td class="text-right bold">${fp(Math.abs(bakiye))} ${bakiye > 0 ? '(B)' : '(A)'}</td></tr>`;
  har.forEach(h => { bakiye += h.b; trs += `<tr><td>${formatDateOnly(h.t)}</td><td class="bold">${h.tur}</td><td class="text-right">${fp(Math.abs(h.b))}</td><td class="text-right bold">${fp(Math.abs(bakiye))} ${bakiye > 0 ? '(B)' : (bakiye < 0 ? '(A)' : '')}</td></tr>`; });
  openInTab(`${masterHtml}<table><thead><tr><th>Tarih</th><th>İşlem</th><th class="text-right">Tutar</th><th class="text-right">Bakiye</th></tr></thead><tbody>${trs}</tbody></table>`, 'EKSTRE');
}

export function printKatalog(kat) {
  const title = kat.Name.toUpperCase('tr-TR');
  
  // NİHAİ KATALOG TASARIMI (Hiza Kaymalarını Kökten Çözer)
  const KAT_CSS = `
    body { font-family: Arial, sans-serif; padding: 10mm; background: #fff; margin:0; } 
    .kat-header { text-align: center; border-bottom: 2px solid #e74c3c; margin-bottom: 20px; padding-bottom: 10px; } 
    .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; } 
    
    /* Kutu her zaman 360px yüksekliğinde, içindekiler flex ile dikey dizilir */
    .product-card { border: 1px solid #e0e0e0; padding: 15px; text-align: center; position: relative; display: flex; flex-direction: column; height: 360px; box-sizing: border-box; page-break-inside: avoid; border-radius: 8px; } 
    
    /* Resim alanı her zaman sabit yer kaplar (resim olmasa bile) */
    .img-wrapper { height: 150px; width: 100%; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; background: #fcfcfc; border-radius: 4px; overflow: hidden; }
    .product-img { max-width: 100%; max-height: 100%; object-fit: contain; } 
    
    /* Başlık maksimum 2 satır */
    h3 { font-size: 15px; margin: 0 0 5px 0; color: #333; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 39px; }
    
    /* Açıklama maksimum 3 satır ve margin-bottom:auto ile fiyatı EN ALTA iter */
    .desc { font-size: 12px; color: #7f8c8d; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; margin-bottom: auto; }
    
    /* Fiyat Kutusu her zaman en altta kalır */
    .price-container { margin-top: 10px; font-weight: bold; font-size: 18px; color: #e74c3c; border-top: 1px dashed #eee; padding-top: 10px; } 
    
    .discount-badge { position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; z-index: 2; } 
  `;

  let gridHtml = '';
  DB.OfferItem.filter(x => x.OfferId === kat.Id && !x.Deleted).forEach(it => {
    const product = DB.Product.find(p => p.Id === it.ProductId); if(!product) return;
    const isDiscounted = it.SalePrice < it.Price;
    
    const brand = product.BrandId ? DB.Brand.find(b => String(b.Id) === String(product.BrandId)) : null;
    const brandHtml = brand ? `<span style="font-weight:900; color:#e74c3c;">${brand.Name}</span> ` : '';

    const badgeHtml = isDiscounted ? `<div class="discount-badge">%${formatTR(it.DiscountRate)} İndirim</div>` : '';
    const priceHtml = isDiscounted ? `<span style="text-decoration:line-through; font-size:12px; color:#999; margin-right:5px;">${fp(it.Price)}</span><span>${fp(it.SalePrice)}</span>` : `<span>${fp(it.Price)}</span>`;
    
    // Eğer fotoğraf yoksa aynı büyüklükte bir placeholder basıyoruz
    const imgHtml = product.PicturePath ? `<img src="${product.PicturePath}" class="product-img">` : `<div style="color:#bdc3c7; font-size:12px; font-style:italic;">Görsel Yok</div>`;
    
    gridHtml += `
      <div class="product-card">
        ${badgeHtml}
        <div class="img-wrapper">${imgHtml}</div>
        <h3>${brandHtml}${product.Name}</h3>
        <div class="desc">${product.Description || ''}</div>
        <div class="price-container">${priceHtml}</div>
      </div>
    `;
  });
  
  const h = `<div class="kat-header"><h2>${title}</h2><p style="color:#7f8c8d; font-size:14px;">${kat.Description || ''}</p></div><div class="product-grid">${gridHtml}</div>`;
  const w = window.open(URL.createObjectURL(new Blob([`<!DOCTYPE html><html><head><title>${title}</title><style>${KAT_CSS}</style></head><body>${h}<script>setTimeout(function(){window.print();}, 800);<\/script></body></html>`], { type: 'text/html;charset=utf-8' })), '_blank');
}