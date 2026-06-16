import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtLocalNow, dtFormat, fp, getBirimAd, toRawTR, formatTR, parseRawTR, ISLEM, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm, updateStock } from '../core/utils.js';
import { printSip } from '../core/pdf.js';

export let tempOrderItems = [];
export let oldOrderType = null;
export let camTarget = null;
export let lastScanTime = 0;

let sipLimit = 20;
export function renderSip(force = false, resetLimit = true) {
  if (!force) return; 
  if (resetLimit) sipLimit = 20;

  const fTur = $('filter-sip-tur').value; const fCari = $('filter-sip-cari').value; const fStart = $('filter-sip-start').value; const fEnd = $('filter-sip-end').value; const list = $('sip-list'); list.innerHTML = '';
  
  let filtered = DB.Order.filter(x => !x.Deleted).filter(s => {
    if (fTur && Number(s.OrderTypeId) !== Number(fTur)) return false; 
    if (fCari && String(s.CurrentId) !== String(fCari)) return false;
    if (fStart || fEnd) { const d = new Date(s.OrderDate); if (fStart && d < new Date(fStart)) return false; if (fEnd && d > new Date(fEnd + 'T23:59:59')) return false; }
    return true;
  });

  filtered.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));
  let pagedList = filtered.slice(0, sipLimit);

  pagedList.forEach(s => {
    const c = DB.Current.find(x => String(x.Id) === String(s.CurrentId)) || { Name: 'Bilinmeyen' };
    const isAlis = Number(s.OrderTypeId) === ISLEM.ALIS;
    list.innerHTML += `<div class="list-item" onclick="editSip('${s.Id}')"><div><div style="font-weight:bold; color:${isAlis ? 'var(--red)' : 'var(--green)'}">${isAlis ? '⬇️ Alış' : '⬆️ Satış'} | ${s.Code}</div><div style="font-size:0.85rem">${c.Name}</div><div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(s.OrderDate)}</div></div><div style="text-align:right; font-weight:bold; font-size:1.1rem">${fp(s.TotalPrice)}</div></div>`;
  });

  if (filtered.length > sipLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.8rem;" onclick="loadMoreSip()">Daha Fazla Göster (${filtered.length - sipLimit} Kaldı)</button>`;
  }
}
window.loadMoreSip = function() { sipLimit += 20; renderSip(true, false); };

export function renderSipItems() {
  const p = $('ms-items'); p.innerHTML = ''; const visibleItems = tempOrderItems.filter(it => !it.Deleted);
  
  if (visibleItems.length > 0) { 
    // SİHİRLİ DOKUNUŞ: position: sticky, top: 0, z-index: 10 ve background eklendi.
    p.innerHTML += `<div style="display:flex; gap:0.4rem; padding:0.5rem 0.5rem; font-size:0.8rem; font-weight:bold; color:var(--text-muted); position: sticky; top: 0; background: var(--card); z-index: 10; border-bottom: 1px solid var(--border); margin-bottom: 0.25rem;">
      <div style="flex:3;">Ürün Seç</div>
      <div style="flex:2;">Miktar</div>
      <div style="flex:2;">Birim Fiyat</div>
      <div style="flex:2;">Toplam Fiyat</div>
      <div style="width:1.1rem;"></div>
    </div>`; 
  }
  
  visibleItems.forEach((it) => {
    const product = DB.Product.find(x => x.Id === it.ProductId); const pName = product ? product.Name : (it._TempName || ''); 
    p.innerHTML += `<div style="display:flex; gap:0.4rem; margin-top:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;">
      <div style="flex:3; position:relative;">
        <input type="text" value="${pName}" placeholder="Ara..." onkeyup="ddUrunSearch('${it.Id}', this)" style="margin:0; padding:0.4rem; font-size:0.85rem" autocomplete="off">
      </div>
      <div style="flex:2; position:relative;">
        <input type="number" value="${it.Amount || ''}" inputmode="decimal" oninput="handleSipRowChange('${it.Id}', 'Amount', this.value)" style="margin:0; padding:0.4rem; padding-right:2.4rem; font-size:0.85rem;">
        <span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:0.75rem; color:var(--text-muted); pointer-events:none;">${getBirimAd(it.UnitId)}</span>
      </div>
      <div style="flex:2">
        <input type="text" id="sip-fiy-${it.Id}" value="${formatTR(it.UnitPrice)}" inputmode="decimal" onfocus="this.value=toRawTR(findSipItem('${it.Id}').UnitPrice)" onblur="this.value=formatTR(findSipItem('${it.Id}').UnitPrice)" oninput="handleSipRowChangeText('${it.Id}', 'UnitPrice', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
      </div>
      <div style="flex:2">
        <input type="text" id="sip-top-${it.Id}" value="${formatTR(it.TotalPrice)}" inputmode="decimal" onfocus="this.value=toRawTR(findSipItem('${it.Id}').TotalPrice)" onblur="this.value=formatTR(findSipItem('${it.Id}').TotalPrice)" oninput="handleSipRowChangeText('${it.Id}', 'TotalPrice', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
      </div>
      <button class="icon-btn text-red" style="padding:0; font-size:1.1rem;" onclick="delSipItem('${it.Id}')">✕</button>
    </div>`;
  }); 
  
  calcSipTotal();
}

export function ddUrunSearch(itemId, inp) {
  const it = findSipItem(itemId); if (!it) return; const q = inp.value.toLowerCase().trim(); const listId = `dd-urun-list-${itemId}`; let list = $(listId);
  if (!list) { list = document.createElement('div'); list.id = listId; list.className = 'dropdown-list'; inp.parentNode.appendChild(list); inp.parentNode.style.position = 'relative'; }
  list.innerHTML = ''; it._TempName = inp.value; if (!q) { list.classList.add('hidden'); return; }
  const res = DB.Product.filter(x => !x.Deleted && (x.Name + " " + (x.BarCode || "")).toLowerCase().includes(q)).slice(0, 8);
  if (res.length === 0) { list.classList.add('hidden'); return; }
  res.forEach(u => { const div = document.createElement('div'); div.className = 'dropdown-item'; div.innerText = u.Name;
    div.onclick = () => { inp.value = u.Name; list.classList.add('hidden'); const tur = Number($('ms-OrderTypeId').value);
      it.ProductId = u.Id; it.UnitPrice = (tur === ISLEM.ALIS) ? (u.PurchasePrice || 0) : (u.SalePrice || 0); it.UnitId = u.UnitId || 1; it.TotalPrice = it.UnitPrice * (it.Amount || 1); it.UpdatedDate = tsNow(); renderSipItems();
    }; list.appendChild(div); }); list.classList.remove('hidden');
}

export function handleSipRowChange(itemId, field, val) { const it = findSipItem(itemId); if (!it) return; let m = parseFloat(val) || 0; it[field] = m; it.TotalPrice = m * (parseFloat(it.UnitPrice) || 0); it.UpdatedDate = tsNow(); const topInput = $('sip-top-' + itemId); if (topInput) topInput.value = formatTR(it.TotalPrice); calcSipTotal(); }
export function handleSipRowChangeText(itemId, field, val) { const it = findSipItem(itemId); if (!it) return; let parsedVal = parseRawTR(val); it[field] = parsedVal; it.UpdatedDate = tsNow(); let m = parseFloat(it.Amount) || 0; if (field === 'UnitPrice') { it.TotalPrice = m * parsedVal; let topInput = $('sip-top-' + itemId); if (topInput && document.activeElement !== topInput) topInput.value = formatTR(it.TotalPrice); } else if (field === 'TotalPrice') { it.UnitPrice = m !== 0 ? parsedVal / m : 0; let fiyInput = $('sip-fiy-' + itemId); if (fiyInput && document.activeElement !== fiyInput) fiyInput.value = formatTR(it.UnitPrice); } calcSipTotal(); }
export function delSipItem(itemId) { const it = findSipItem(itemId); if (!it) return; it.Deleted = true; it.DeletedDate = tsNow(); renderSipItems(); }
export function findSipItem(itemId) { return tempOrderItems.find(x => String(x.Id) === String(itemId)); }
export function addSipItem() { tempOrderItems.push({ Id: guid(), OrderId: $('ms-Id').value || null, ProductId: null, _TempName: '', Amount: 1, UnitId: 1, UnitPrice: 0, TotalPrice: 0, CreatedDate: tsNow(), UpdatedDate: tsNow(), Deleted: false }); renderSipItems(); }
export function calcSipTotal() { const araT = tempOrderItems.reduce((sum, it) => sum + (it.Deleted ? 0 : (parseFloat(it.TotalPrice) || 0)), 0); $('ms-SubTotalPrice').innerText = fp(araT); $('ms-TotalPrice').innerText = fp(araT - (Number($('ms-DisCount').value) || 0)); }

export function openSiparisModal() {
  $('ms-Id').value = ''; $('ms-OrderTypeId').value = ISLEM.SATIS; oldOrderType = null; $('ms-OrderDate').value = dtLocalNow(); $('ms-Description').value = ''; $('ms-DisCount').value = '0'; $('ms-CurrentId').value = ''; $('csd-ms-CurrentId').innerText = 'Cari Seçiniz...'; $('ms-del').classList.add('hidden'); $('ms-pdf').classList.add('hidden'); tempOrderItems = []; renderSipItems(); openM('mo-sip');
}

export function editSip(id) {
  const s = DB.Order.find(x => String(x.Id) === String(id)); if (!s) return; const c = DB.Current.find(x => String(x.Id) === String(s.CurrentId));
  $('ms-Id').value = s.Id; $('ms-OrderTypeId').value = s.OrderTypeId; oldOrderType = Number(s.OrderTypeId); $('ms-OrderDate').value = s.OrderDate ? s.OrderDate.slice(0, 16) : dtLocalNow(); $('ms-Description').value = s.Description || ''; $('ms-DisCount').value = s.DisCount || 0; $('ms-CurrentId').value = s.CurrentId; $('csd-ms-CurrentId').innerText = c ? c.Name : 'Bilinmeyen Cari';
  tempOrderItems = JSON.parse(JSON.stringify(DB.OrderItem.filter(x => x.OrderId === s.Id && !x.Deleted)));
  $('ms-del').classList.remove('hidden'); $('ms-pdf').classList.remove('hidden');
  $('ms-del').onclick = () => { showConfirm(`Sipariş silinecek?`, () => { softDelete(DB.Order, id); saveDB(); closeM('mo-sip'); renderSip(true); }, '🗑️', 'Sil'); }; $('ms-pdf').onclick = () => { printSip(s.Id); }; renderSipItems(); openM('mo-sip');
}

export function saveSip() {
  const currentId = $('ms-CurrentId').value; if (!currentId) return showToast('Cari seçimi zorunlu!');
  const finalItems = tempOrderItems.filter(it => it.ProductId && !it.Deleted).map(it => ({ ...it, UnitPrice: parseFloat(it.UnitPrice) || 0, Amount: parseFloat(it.Amount) || 0, TotalPrice: parseFloat(it.TotalPrice) || 0 }));
  if (finalItems.length === 0) return showToast('Ürün seçili geçerli kalem bulunamadı!');
  
  let id = $('ms-Id').value; const tur = Number($('ms-OrderTypeId').value); const isAlis = tur === ISLEM.ALIS;
  if (!id) id = guid(); 
  
  const ara = finalItems.reduce((sum, it) => sum + it.TotalPrice, 0);
  const ind = Number($('ms-DisCount').value) || 0;
  
  const data = { 
    OrderTypeId: tur, 
    CurrentId: String(currentId), 
    OrderDate: new Date($('ms-OrderDate').value).toISOString(), 
    Description: toTitleCaseTR($('ms-Description').value.trim()), // SİPARİŞ NOTU TITLE CASE YAPILDI
    SubTotalPrice: ara, 
    DisCount: ind, 
    TotalPrice: ara - ind 
  };

  if ($('ms-Id').value) {
    const s = DB.Order.find(x => String(x.Id) === String(id));
    DB.OrderItem.filter(x => x.OrderId === id && !x.Deleted).forEach(it => { updateStock(it.ProductId, it.Amount, oldOrderType === ISLEM.ALIS, false); });
    Object.assign(s, data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  } else {
    data.Code = `SIP-${DB.Order.length + 1}`;
    DB.Order.push({ Id: id, ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  }

  const currentItemIds = tempOrderItems.map(x => x.Id);
  DB.OrderItem.filter(x => x.OrderId === id && (!currentItemIds.includes(x.Id) || tempOrderItems.find(t=>t.Id===x.Id).Deleted)).forEach(x => softDelete(DB.OrderItem, x.Id));
  
  finalItems.forEach(it => {
    it.OrderId = id; delete it._TempName; 
    const existing = DB.OrderItem.find(x => x.Id === it.Id);
    if(existing) { Object.assign(existing, it, { UpdatedDate: tsNow() }); }
    else { it.Id = it.Id || guid(); DB.OrderItem.push({ ...it, CreatedDate: tsNow(), Deleted: false }); }
    updateStock(it.ProductId, it.Amount, isAlis, true);
    updatePurchasePrice(it.ProductId, it.UnitPrice, isAlis, true);
  });

  saveDB(); closeM('mo-sip'); renderSip(true); renderHome();
}

// BARKOD SİSTEMİ
export function startCam(target) {
  camTarget = target; $('cam-info').innerText = "Kamera izni bekleniyor..."; openM('mo-cam'); $('cam-video').style.display = 'block';
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
      stream.getTracks().forEach(track => track.stop()); $('cam-info').innerText = "Barkodu kameraya okutun";
      window.Quagga.init({ inputStream: { name: "Live", type: "LiveStream", target: $('scanner-container'), constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } }, locator: { patchSize: "large", halfSample: false }, numOfWorkers: 0, decoder: { readers: ["ean_reader", "code_128_reader", "ean_8_reader", "code_39_reader"] }, locate: true }, function (err) {
        if (err) { stopCam(); return; } window.Quagga.start(); const v = document.querySelector('#scanner-container video'); if (v) v.play().catch(e => console.log(e));
      });
      window.Quagga.onDetected(function (result) {
        const now = Date.now(); if (now - lastScanTime < 1500) return; const code = result.codeResult.code;
        if (camTarget === 'urun-arama') { stopCam(); $('filter-urun-q').value = code; window.renderUrun(true); } 
        else if (camTarget === 'urun-form') { stopCam(); $('mu-BarCode').value = code; } 
        else if (camTarget === 'sip-item') {
          lastScanTime = now; const u = DB.Product.find(x => !x.Deleted && x.BarCode === code);
          if (u) {
            const exItem = tempOrderItems.find(x => !x.Deleted && x.ProductId === u.Id); let mevcutMiktar = 0;
            if (exItem) { exItem.Amount++; exItem.TotalPrice = exItem.Amount * exItem.UnitPrice; exItem.UpdatedDate = tsNow(); mevcutMiktar = exItem.Amount; } 
            else { const isAlis = Number($('ms-OrderTypeId').value) === ISLEM.ALIS; const fiy = isAlis ? (u.PurchasePrice || 0) : (u.SalePrice || 0); const sipId = $('ms-Id').value || null; tempOrderItems.push({ Id: guid(), OrderId: sipId, ProductId: u.Id, UnitPrice: fiy, Amount: 1, TotalPrice: fiy, UnitId: u.UnitId || 1, CreatedDate: tsNow(), UpdatedDate: tsNow(), Deleted: false }); mevcutMiktar = 1; }
            renderSipItems(); showCamFeedback(true, u.Name, `Toplam: ${mevcutMiktar}`); $('cam-info').innerText = `${u.Name} eklendi`;
          } else { showCamFeedback(false, "Bulunamadı!"); $('cam-info').innerText = "Kayıtsız Barkod: " + code; }
        }
      });
    }).catch(function (err) { stopCam(); });
  } else { stopCam(); }
}
export function stopCam() { try { window.Quagga.stop(); } catch (e) { } $('cam-video').style.display = 'none'; closeM('mo-cam'); }
export function showCamFeedback(isSuccess, title, countMsg = "") {
  const fb = $('cam-feedback-pro'); if (!fb) return;
  $('cam-feedback-pro-icon').innerText = isSuccess ? '✅' : '❌'; $('cam-feedback-pro-title').innerText = title;
  const c = $('cam-feedback-pro-count'); c.innerText = countMsg; c.style.display = countMsg ? 'block' : 'none'; c.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
  fb.style.display = 'flex'; if (window.camFbTimer) clearTimeout(window.camFbTimer); window.camFbTimer = setTimeout(() => { fb.style.display = 'none'; }, 1500);
}