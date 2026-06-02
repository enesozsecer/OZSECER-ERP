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
  // Yeni özellik: position:relative ve .discount-badge CSS sınıfları eklendi!
  const KAT_CSS = `body { font-family: Arial; padding:10mm; } .kat-header { text-align: center; border-bottom: 2px solid #e74c3c; margin-bottom: 20px; padding-bottom: 10px; } .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; } .product-card { border: 1px solid #ddd; padding: 15px; text-align: center; position: relative; } .product-img { width: 100%; height: 160px; object-fit: contain; } .price-container { margin-top: 10px; font-weight:bold; font-size:18px; color:#e74c3c; } .discount-badge { position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 5px 8px; border-radius: 5px; font-size: 12px; font-weight: bold; }`;

  let gridHtml = '';
  DB.OfferItem.filter(x => x.OfferId === kat.Id && !x.Deleted).forEach(it => {
    const product = DB.Product.find(p => p.Id === it.ProductId); if(!product) return;
    const isDiscounted = it.SalePrice < it.Price;
    
    // Kampanya İndirim Rozeti HTML'i
    const badgeHtml = isDiscounted ? `<div class="discount-badge">%${formatTR(it.DiscountRate)} İndirim</div>` : '';
    const priceHtml = isDiscounted ? `<span style="text-decoration:line-through; font-size:12px; color:#999; margin-right:5px;">${fp(it.Price)}</span><span>${fp(it.SalePrice)}</span>` : `<span>${fp(it.Price)}</span>`;
    const imgHtml = product.PicturePath ? `<img src="${product.PicturePath}" class="product-img">` : `<div style="padding:40px; background:#f0f0f0; color:#999; font-size:12px;">Görsel Yok</div>`;
    
    gridHtml += `<div class="product-card">${badgeHtml}${imgHtml}<h3>${product.Name}</h3><p style="font-size:12px; color:#666;">${product.Description || ''}</p><div class="price-container">${priceHtml}</div></div>`;
  });
  
  const h = `<div class="kat-header"><h2>${title}</h2><p>${kat.Description || ''}</p></div><div class="product-grid">${gridHtml}</div>`;
  const w = window.open(URL.createObjectURL(new Blob([`<!DOCTYPE html><html><head><title>${title}</title><style>${KAT_CSS}</style></head><body>${h}<script>setTimeout(function(){window.print();}, 800);<\/script></body></html>`], { type: 'text/html;charset=utf-8' })), '_blank');
}