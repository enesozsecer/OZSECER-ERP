import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, dtNow, dtFormat, fp, getBirimAd, toRawTR, formatTR, parseRawTR, getTimeMs, ISLEM, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm, updateStok } from '../core/utils.js';
import { printSip } from '../core/pdf.js';
import { renderHome } from './home.js';
import { renderUrun } from './urun.js';

export let tempSipItems = [];
export let oldSipTur = null;
export let camTarget = null;
export let lastScanTime = 0;

export function renderSip(force = false) {
  if (!force) return;
  const fTur = $('filter-sip-tur').value; const fCari = $('filter-sip-cari').value; const fStart = $('filter-sip-start').value; const fEnd = $('filter-sip-end').value;
  const list = $('sip-list'); list.innerHTML = '';
  let sips = DB.s.filter(x => !x.silindi).sort((a, b) => getTimeMs(b.olusturmaTarihi) - getTimeMs(a.olusturmaTarihi));

  sips.forEach(s => {
    const c = DB.c.find(x => String(x.id) === String(s.cariId)) || { ad: 'Bilinmeyen' };
    if (fTur && Number(s.tur) !== Number(fTur)) return;
    if (fCari && String(s.cariId) !== String(fCari)) return;
    if (fStart || fEnd) { const d = new Date(s.tarih); if (fStart && d < new Date(fStart)) return; if (fEnd && d > new Date(fEnd + 'T23:59:59')) return; }
    const isAlis = Number(s.tur) === ISLEM.ALIS;
    list.innerHTML += `<div class="list-item" onclick="editSip('${s.id}')"><div><div style="font-weight:bold; color:${isAlis ? 'var(--red)' : 'var(--green)'}; font-size:0.9rem">${isAlis ? '⬇️ Alış' : '⬆️ Satış'} | ${s.no}</div><div style="font-size:0.85rem">${c.ad}</div><div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(s.tarih)}</div></div><div style="text-align:right; font-weight:bold; font-size:1.1rem">${fp(s.toplam)}</div></div>`;
  });
}

export function renderSipItems() {
  const p = $('ms-items'); p.innerHTML = '';
  const visibleItems = tempSipItems.filter(it => !it.silindi);
  if (visibleItems.length > 0) { p.innerHTML += `<div style="display:flex; gap:0.4rem; margin-bottom:0.4rem; padding:0 0.5rem; font-size:0.8rem; font-weight:bold; color:var(--text-muted);"><div style="flex:3;">Ürün Adı</div><div style="flex:2;">Miktar</div><div style="flex:2;">Birim Fiyat</div><div style="flex:2;">Toplam Fiyat</div><div style="width:1.1rem; margin-left:4px;"></div></div>`; }
  visibleItems.forEach((it) => {
    p.innerHTML += `<div style="display:flex; gap:0.4rem; margin-bottom:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;"><div style="flex:3; position:relative;"><input type="text" value="${it.ad}" placeholder="Ürün Ara (İçeren)..." onkeyup="ddUrunSearch('${it.id}', this)" onchange="findSipItem('${it.id}').ad = this.value; findSipItem('${it.id}').guncellenmeTarihi = tsNow();" style="margin:0; padding:0.4rem; font-size:0.85rem" autocomplete="off"></div><div style="flex:2; position:relative;"><input type="number" id="sip-mik-${it.id}" value="${it.miktar || ''}" placeholder="Miktar" oninput="handleSipRowChange('${it.id}', 'miktar', this.value)" style="margin:0; padding:0.4rem; padding-right:2.4rem; font-size:0.85rem; width:100%; box-sizing:border-box;"><span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:0.75rem; color:var(--text-muted); font-weight:bold; pointer-events:none;">${getBirimAd(it.birim)}</span></div><div style="flex:2"><input type="text" id="sip-fiy-${it.id}" value="${formatTR(it.fiyat)}" placeholder="Birim Fiyat" onfocus="this.value=toRawTR(findSipItem('${it.id}').fiyat)" onblur="this.value=formatTR(findSipItem('${it.id}').fiyat)" oninput="handleSipRowChangeText('${it.id}', 'fiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem"></div><div style="flex:2"><input type="text" id="sip-top-${it.id}" value="${formatTR(it.toplam)}" placeholder="Toplam Fiyat" onfocus="this.value=toRawTR(findSipItem('${it.id}').toplam)" onblur="this.value=formatTR(findSipItem('${it.id}').toplam)" oninput="handleSipRowChangeText('${it.id}', 'toplam', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem"></div><button class="icon-btn text-red" style="padding:0; font-size:1.1rem; margin-left:4px;" onclick="delSipItem('${it.id}')">✕</button></div>`;
  });
  calcSipTotal();
}

export function ddUrunSearch(itemId, inp) {
  const it = findSipItem(itemId); if (!it) return;
  const q = inp.value.toLowerCase().trim();
  const listId = `dd-urun-list-${itemId}`; let list = $(listId);
  if (!list) { list = document.createElement('div'); list.id = listId; list.className = 'dropdown-list'; inp.parentNode.appendChild(list); inp.parentNode.style.position = 'relative'; }
  list.innerHTML = ''; it.ad = inp.value; it.guncellenmeTarihi = tsNow();
  if (!q) { list.classList.add('hidden'); return; }
  const res = DB.u.filter(x => !x.silindi && (x.ad + " " + (x.barkod || "")).toLowerCase().includes(q)).slice(0, 8);
  if (res.length === 0) { list.classList.add('hidden'); return; }
  res.forEach(u => {
    const div = document.createElement('div'); div.className = 'dropdown-item'; div.innerText = u.ad;
    div.onclick = () => {
      inp.value = u.ad; list.classList.add('hidden');
      const tur = Number($('ms-tur').value);
      it.urunId = u.id; it.ad = u.ad; it.fiyat = (tur === ISLEM.ALIS) ? (u.alisFiyat || 0) : (u.satisFiyat || 0);
      it.birim = u.birim || 1; it.toplam = it.fiyat * (it.miktar || 1); it.guncellenmeTarihi = tsNow();
      renderSipItems();
    }; list.appendChild(div);
  }); list.classList.remove('hidden');
}

export function handleSipRowChange(itemId, field, val) {
  const it = findSipItem(itemId); if (!it) return;
  let m = parseFloat(val) || 0; it[field] = m;
  let f = parseFloat(it.fiyat) || 0; let t = m * f; it.toplam = t; it.guncellenmeTarihi = tsNow();
  const topInput = $('sip-top-' + itemId); if (topInput) topInput.value = formatTR(t);
  calcSipTotal();
}

export function handleSipRowChangeText(itemId, field, val) {
  const it = findSipItem(itemId); if (!it) return;
  let parsedVal = parseRawTR(val); it[field] = parsedVal; it.guncellenmeTarihi = tsNow();
  let m = parseFloat(it.miktar) || 0; let f = parseFloat(it.fiyat) || 0;
  if (field === 'fiyat') {
    let t = m * parsedVal; it.toplam = t;
    let topInput = $('sip-top-' + itemId); if (topInput && document.activeElement !== topInput) topInput.value = formatTR(t);
  } else if (field === 'toplam') {
    f = m !== 0 ? parsedVal / m : 0; it.fiyat = f;
    let fiyInput = $('sip-fiy-' + itemId); if (fiyInput && document.activeElement !== fiyInput) fiyInput.value = formatTR(f);
  }
  calcSipTotal();
}

export function updateSipItem(idx, key, val) { tempSipItems[idx][key] = val; }
export function delSipItem(itemId) { const it = findSipItem(itemId); if (!it) return; it.silindi = true; it.silinmeTarihi = tsNow(); it.guncellenmeTarihi = tsNow(); renderSipItems(); }
export function findSipItem(itemId) { return tempSipItems.find(x => String(x.id) === String(itemId)); }

export function addSipItem() {
  const sipId = $('ms-id').value || null;
  tempSipItems.push({ id: guid(), siparisId: sipId, urunId: null, ad: '', fiyat: '', miktar: 1, toplam: '', birim: 1, olusturmaTarihi: tsNow(), guncellenmeTarihi: tsNow(), silindi: false });
  renderSipItems();
}

export function calcSipTotal() {
  const araT = tempSipItems.reduce((sum, it) => sum + (it.silindi ? 0 : (parseFloat(it.toplam) || 0)), 0);
  $('ms-ara').innerText = fp(araT); $('ms-genel').innerText = fp(araT - (Number($('ms-indirim').value) || 0));
}

export function openSiparisModal() {
  $('ms-id').value = ''; $('ms-tur').value = ISLEM.SATIS; oldSipTur = null;
  $('ms-tarih').value = dtNow(); $('ms-not').value = ''; $('ms-indirim').value = '0';
  $('ms-cari').value = ''; $('csd-ms-cari').innerText = 'Cari Seçiniz...';
  $('ms-del').classList.add('hidden'); $('ms-pdf').classList.add('hidden');
  tempSipItems = []; renderSipItems(); openM('mo-sip');
}

export function editSip(id) {
  const s = DB.s.find(x => String(x.id) === String(id)); if (!s) return;
  const c = DB.c.find(x => String(x.id) === String(s.cariId));
  $('ms-id').value = s.id; $('ms-tur').value = s.tur; oldSipTur = Number(s.tur);
  $('ms-tarih').value = s.tarih; $('ms-not').value = s.not || ''; $('ms-indirim').value = s.indirim || 0;
  $('ms-cari').value = s.cariId; $('csd-ms-cari').innerText = c ? c.ad : 'Bilinmeyen Cari';
  tempSipItems = JSON.parse(JSON.stringify(s.items || [])).map(it => {
    if (!it.id) it.id = guid(); if (!it.siparisId) it.siparisId = s.id; if (!it.olusturmaTarihi) it.olusturmaTarihi = s.olusturmaTarihi || tsNow(); if (!it.guncellenmeTarihi) it.guncellenmeTarihi = s.guncellenmeTarihi || tsNow();
    if (it.silindi === undefined) it.silindi = false;
    it.toplam = it.toplam !== undefined ? it.toplam : ((it.fiyat || 0) * (it.miktar || 0)); return it;
  });
  $('ms-del').classList.remove('hidden'); $('ms-pdf').classList.remove('hidden');
  $('ms-del').onclick = () => { showConfirm(`Sipariş silinecek?`, () => { softDelete(DB.s, id); saveDB(); closeM('mo-sip'); renderSip(true); renderHome(); }, '🗑️', 'Sil'); };
  $('ms-pdf').onclick = () => { printSip(s.id); };
  renderSipItems(); openM('mo-sip');
}

export function saveSip() {
  const cariId = $('ms-cari').value; if (!cariId) return showToast('Cari seçimi zorunlu!');
  if (tempSipItems.length === 0) return showToast('Kalem girilmedi!');
  let id = $('ms-id').value; const tur = Number($('ms-tur').value); const isAlis = tur === ISLEM.ALIS;
  if (!id) id = guid();
  const finalItems = tempSipItems.map(it => ({ ...it, siparisId: id, fiyat: parseFloat(it.fiyat) || 0, miktar: parseFloat(it.miktar) || 0, toplam: parseFloat(it.toplam) || 0 }));
  const ara = finalItems.reduce((sum, it) => sum + (it.silindi ? 0 : it.toplam), 0);
  const ind = Number($('ms-indirim').value) || 0;
  const data = { id, tur, cariId: String(cariId), tarih: $('ms-tarih').value, not: $('ms-not').value, items: finalItems, araToplam: ara, indirim: ind, genelToplam: ara - ind, toplam: ara - ind };

  if ($('ms-id').value) {
    const s = DB.s.find(x => String(x.id) === String(id));
    s.items.forEach(it => { if (it.urunId && !it.silindi) updateStok(it.urunId, it.miktar, oldSipTur === ISLEM.ALIS, false); });
    Object.assign(s, data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  } else {
    data.no = `SIP-${pad(DB.s.length + 1)}`;
    DB.s.push({ id, ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
  }
  data.items.forEach(it => { if (it.urunId && !it.silindi) updateStok(it.urunId, it.miktar, isAlis, true); });
  saveDB(); closeM('mo-sip'); renderSip(true); renderHome();
}

export function startCam(target) {
  camTarget = target; $('cam-info').innerText = "Kamera izni bekleniyor..."; openM('mo-cam'); $('cam-video').style.display = 'block';
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
      stream.getTracks().forEach(track => track.stop()); $('cam-info').innerText = "Barkodu kameraya okutun";
      initQuagga();
    }).catch(function (err) { showToast("Kamera izni verilmedi."); $('cam-info').innerText = "Kamera reddedildi: " + err.name; setTimeout(stopCam, 2000); });
  } else { showToast("Tarayıcı kamera desteklemiyor."); stopCam(); }

  function initQuagga() {
    window.Quagga.init({
      inputStream: { name: "Live", type: "LiveStream", target: $('scanner-container'), constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } } },
      locator: { patchSize: "large", halfSample: false }, numOfWorkers: 0, decoder: { readers: ["ean_reader", "code_128_reader", "ean_8_reader", "code_39_reader"] }, locate: true
    }, function (err) {
      if (err) { showToast(err.name); stopCam(); return; }
      window.Quagga.start(); const v = document.querySelector('#scanner-container video'); if (v) v.play().catch(e => console.log(e));
    });

    window.Quagga.onDetected(function (result) {
      const now = Date.now(); if (now - lastScanTime < 1500) return;
      const code = result.codeResult.code;
      if (camTarget === 'urun-arama') { stopCam(); $('filter-urun-q').value = code; renderUrun(true); } 
      else if (camTarget === 'urun-form') { stopCam(); $('mu-barkod').value = code; } 
      else if (camTarget === 'sip-item') {
        lastScanTime = now;
        const u = DB.u.find(x => !x.silindi && x.barkod === code);
        if (u) {
          const exItem = tempSipItems.find(x => !x.silindi && x.urunId === u.id);
          let mevcutMiktar = 0;
          if (exItem) { exItem.miktar++; exItem.toplam = exItem.miktar * exItem.fiyat; exItem.guncellenmeTarihi = tsNow(); mevcutMiktar = exItem.miktar; } 
          else {
            const isAlis = Number($('ms-tur').value) === ISLEM.ALIS; const fiy = isAlis ? (u.alisFiyat || 0) : (u.satisFiyat || 0); const sipId = $('ms-id').value || null;
            tempSipItems.push({ id: guid(), siparisId: sipId, urunId: u.id, ad: u.ad, fiyat: fiy, miktar: 1, toplam: fiy, birim: u.birim || 1, olusturmaTarihi: tsNow(), guncellenmeTarihi: tsNow(), silindi: false });
            mevcutMiktar = 1;
          }
          renderSipItems(); showCamFeedback(true, u.ad, `Toplam: ${mevcutMiktar} ${getBirimAd(u.birim)}`); $('cam-info').innerText = `${u.ad} eklendi (${mevcutMiktar} adet)`;
        } else { showCamFeedback(false, "Sistemde Bulunamadı!\nBarkod: " + code); $('cam-info').innerText = "Kayıtsız Barkod: " + code; }
      }
    });
  }
}

export function stopCam() { try { window.Quagga.stop(); } catch (e) { } $('cam-video').style.display = 'none'; closeM('mo-cam'); }

export function showCamFeedback(isSuccess, title, countMsg = "") {
  const fb = $('cam-feedback-pro'); if (!fb) return;
  $('cam-feedback-pro-icon').innerText = isSuccess ? '✅' : '❌'; $('cam-feedback-pro-title').innerText = title;
  const c = $('cam-feedback-pro-count'); c.innerText = countMsg; c.style.display = countMsg ? 'block' : 'none'; c.style.color = isSuccess ? 'var(--green)' : 'var(--red)';
  fb.style.display = 'flex';
  if (window.camFbTimer) clearTimeout(window.camFbTimer);
  window.camFbTimer = setTimeout(() => { fb.style.display = 'none'; }, 1500);
}