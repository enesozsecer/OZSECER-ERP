import { DB } from './db.js';
import { calcNet, fp, dtFormat, dtNow, ISLEM, KASA, getBirimAd, formatTR } from './utils.js';

const PDF_CSS = `body { font-family: Arial, sans-serif; font-size: 16pt; color: #000; background: #fff; margin:0; padding:0; } @page { size: A4; margin: 15mm; } h1 { font-size: 22pt; font-weight: bold; text-align: center; margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #000; } p { margin: 5px 0; } .bold { font-weight: bold; } .master-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; font-weight: bold; border-radius: 5px; } table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 16pt; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; } th { background: #f4f4f4; font-weight: bold; } .text-red { color: #d32f2f; font-weight: bold; } .text-green { color: #388e3c; font-weight: bold; } .text-right { text-align: right; } .bakiye-wrap { margin-top: 20px; display: flex; flex-direction: column; align-items: flex-end; } .total-line { font-size: 20pt; font-weight: bold; margin-top:10px; border-top: 2px solid #000; padding-top:10px; } .pdf-container { max-width: 800px; margin: 0 auto; } @media print { .pdf-container { max-width: none; } }`;

export function getMasterHtml(tarih, cari, islemAdi) {
  const net = calcNet(cari.id);
  let bakiyeStr = '0,00 (Kapalı)';
  if (net > 0) bakiyeStr = `<span class="text-red">${fp(net)} (Borçlu)</span>`;
  else if (net < 0) bakiyeStr = `<span class="text-green">${fp(Math.abs(net))} (Alacaklı)</span>`;
  return `<h1>${islemAdi}</h1><div class="master-box"><p><span class="bold">İşlem Tarihi:</span> ${dtFormat(tarih)}</p><p><span class="bold">Firma/Şahıs Adı:</span> ${cari.ad}</p><p><span class="bold">Kalan Bakiye:</span> ${bakiyeStr}</p></div>`;
}

export function openInTab(htmlStr, title) {
  const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' + PDF_CSS + '</style></head><body><div class="pdf-container">' + htmlStr + '</div><script>setTimeout(function(){window.print();}, 500);<\/script></body></html>';
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(full); w.document.close(); } 
  else { alert("Lütfen yazdırmak için tarayıcınızın 'Açılır Pencere' engelleyicisini kapatın."); }
}

export function printSip(id) {
  const s = DB.s.find(x => String(x.id) === String(id));
  const c = DB.c.find(x => String(x.id) === String(s.cariId)) || { ad: '-', vkn: '-', tel: '-', adres: '-' };
  const title = Number(s.tur) === ISLEM.ALIS ? 'ALIŞ SİPARİŞ FİŞİ' : 'SATIŞ SİPARİŞ FİŞİ';
  let trs = '';
  s.items.forEach(it => {
    trs += `<tr><td>${it.miktar}</td><td>${getBirimAd(it.birim)}</td><td class="bold">${it.ad}</td><td>${fp(it.fiyat)}</td><td class="text-right bold">${fp(it.fiyat * it.miktar)}</td></tr>`;
  });
  const h = `${getMasterHtml(s.tarih, c, title)}<h3 class="bold">Sipariş Detayları</h3><table><thead><tr><th>Miktar</th><th>Birim</th><th>Ürün Adı</th><th>Birim Fiyat</th><th class="text-right">Toplam Fiyat</th></tr></thead><tbody>${trs}</tbody></table><div class="bakiye-wrap"><div>Ara Toplam: ${fp(s.araToplam)}</div><div>İskonto: ${fp(s.indirim)}</div><div class="total-line">Sipariş Toplamı: ${fp(s.toplam)}</div></div>`;
  openInTab(h, title);
}

export function printKasa(id) {
  const t = DB.t.find(x => String(x.id) === String(id));
  const c = DB.c.find(x => String(x.id) === String(t.cariId)) || { ad: '-' };
  const isTahsilat = Number(t.tur) === KASA.TAHSILAT;
  const title = isTahsilat ? 'TAHSİLAT MAKBUZU' : 'ÖDEME MAKBUZU';
  const h = `${getMasterHtml(t.tarih, c, title)}<h3 class="bold">İşlem Detayları</h3><table><thead><tr><th>Ödeme Tipi</th><th class="text-right">Tutar</th></tr></thead><tbody><tr><td class="bold ${isTahsilat ? 'text-green' : 'text-red'}">${isTahsilat ? 'Tahsilat' : 'Ödeme'}</td><td class="text-right bold">${fp(t.tutar)}</td></tr></tbody></table>${t.aciklama ? `<p style="margin-top:20px;"><span class="bold">Açıklama:</span> ${t.aciklama}</p>` : ''}`;
  openInTab(h, title);
}

export function printEkstre(cariId) {
  const c = DB.c.find(x => String(x.id) === String(cariId));
  if (!c) return;
  const title = 'CARİ HESAP EKSTRESİ';
  const masterHtml = getMasterHtml(dtNow(), c, title);
  const har = [];
  DB.s.filter(x => !x.silindi && String(x.cariId) === cariId).forEach(x => { har.push({ t: x.tarih, tur: (Number(x.tur) === ISLEM.SATIS ? 'Satış' : 'Alış'), isRed: Number(x.tur) === ISLEM.SATIS, b: (Number(x.tur) === ISLEM.SATIS ? x.toplam : -x.toplam) }); });
  DB.t.filter(x => !x.silindi && String(x.cariId) === cariId).forEach(x => { har.push({ t: x.tarih, tur: (Number(x.tur) === KASA.TAHSILAT ? 'Tahsilat' : 'Ödeme'), isRed: Number(x.tur) === KASA.ODEME, b: (Number(x.tur) === KASA.ODEME ? x.tutar : -x.tutar) }); });
  har.sort((a, b) => new Date(a.t) - new Date(b.t));
  let trs = ''; let bakiye = 0;
  har.forEach(h => {
    bakiye += h.b;
    const islemClass = h.isRed ? 'text-red' : 'text-green';
    const tutarStr = `<span class="${islemClass}">${fp(Math.abs(h.b))}</span>`;
    const bakiyeClass = bakiye > 0 ? 'text-red' : (bakiye < 0 ? 'text-green' : '');
    const bakiyeStr = `<span class="${bakiyeClass}">${fp(Math.abs(bakiye))} ${bakiye > 0 ? '(B)' : (bakiye < 0 ? '(A)' : '')}</span>`;
    trs += `<tr><td>${dtFormat(h.t)}</td><td class="bold ${islemClass}">${h.tur}</td><td class="text-right">${tutarStr}</td><td class="text-right">${bakiyeStr}</td></tr>`;
  });
  const h = `${masterHtml}<h3 class="bold">Hesap Hareketleri</h3><table><thead><tr><th>Tarih</th><th>İşlem</th><th class="text-right">Tutar</th><th class="text-right">Bakiye</th></tr></thead><tbody>${trs}</tbody></table>`;
  openInTab(h, title);
}

export function printKatalog(kat) {
  const title = kat.ad.toUpperCase();
  const KAT_CSS = `body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; margin:0; padding:10mm; color:#333; } .kat-header { text-align: center; border-bottom: 3px solid #e74c3c; margin-bottom: 30px; padding-bottom: 20px; } .kat-title { font-size: 32px; color: #2c3e50; font-weight: bold; margin: 0; letter-spacing: 1px; } .kat-desc { font-size: 16px; color: #7f8c8d; margin-top: 10px; font-style: italic; } .kat-tarih { font-size: 12px; color: #95a5a6; margin-top: 5px; } .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; } .product-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; text-align: center; background-color: #fff; page-break-inside: avoid; box-shadow: 0 4px 8px rgba(0,0,0,0.05); position:relative; display:flex; flex-direction:column; } .product-img { width: 100%; height: 160px; object-fit: contain; margin-bottom: 15px; border-radius:4px; } .product-name { font-size: 18px; font-weight: bold; color: #34495e; margin: 5px 0; } .product-item-desc { font-size: 13px; color: #7f8c8d; margin-bottom: 15px; font-style: italic; line-height: 1.4; word-wrap: break-word; } .price-container { margin-top: auto; padding-top: 15px; border-top: 1px dashed #eee; } .old-price { font-size: 14px; color: #95a5a6; text-decoration: line-through; margin-right: 8px; } .new-price { font-size: 24px; color: #e74c3c; font-weight: bold; } .badge { background: #e74c3c; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; position: absolute; top: 15px; right: 15px; } .pdf-container { max-width: 900px; margin: 0 auto; } @media print { .pdf-container { max-width: none; } body{padding:0;} @page{size: A4; margin:15mm;} }`;

  let gridHtml = '';
  kat.items.forEach(it => {
    const anaUrun = DB.u.find(x => String(x.id) === String(it.urunId));
    const finalDesc = (anaUrun && anaUrun.desc) ? anaUrun.desc : (it.desc || '');
    const finalFoto = (anaUrun && anaUrun.foto) ? anaUrun.foto : (it.foto || '');
    const isDiscounted = it.indirimliFiyat < it.normalFiyat;
    let priceHtml = isDiscounted ? `<span class="old-price">${fp(it.normalFiyat)}</span><span class="new-price">${fp(it.indirimliFiyat)}</span>` : `<span class="new-price">${fp(it.normalFiyat)}</span>`;
    const badgeHtml = isDiscounted ? `<div class="badge">%${formatTR(it.indirimYuzde)} İndirim</div>` : '';
    const imgHtml = finalFoto ? `<img src="${finalFoto}" class="product-img">` : `<div class="product-img" style="background:#f5f5f5; display:flex; align-items:center; justify-content:center; color:#ccc; font-style:italic; font-size:12px;">Görsel Yok</div>`;
    const itemDescHtml = finalDesc ? `<div class="product-item-desc">${finalDesc}</div>` : `<div class="product-item-desc" style="color:#d1d5db;">(Açıklama girilmemiş)</div>`;
    
    gridHtml += `<div class="product-card">${badgeHtml}${imgHtml}<div class="product-name">${it.ad}</div>${itemDescHtml}<div class="price-container">${priceHtml}</div></div>`;
  });

  const h = `<div class="kat-header"><div class="kat-title">${title}</div><div class="kat-desc">${kat.desc || 'Ürünlerimize ait güncel kampanya fiyatlarıdır.'}</div><div class="kat-tarih">Tarih: ${kat.tarih}</div></div><div class="product-grid">${gridHtml}</div>`;
  const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' + KAT_CSS + '</style></head><body><div class="pdf-container">' + h + '</div><script>setTimeout(function(){window.print();}, 800);<\/script></body></html>';
  const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
}