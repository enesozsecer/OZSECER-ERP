import { DB, saveDB } from '../core/db.js';
import { $, tsNow, guid, getCihazAdi, showToast, openM, closeM, showConfirm, formatTR, parseRawTR, toRawTR, showSpinner, hideSpinner, showCustomAlert } from '../core/utils.js';

let selectedProductIds = new Set();
let publishState = {}; 
let visibleProductIds = []; 
let marketPublishItems = []; 

export async function initPublishView() {
  const catSel = $('filter-pub-cat'); const grpSel = $('filter-pub-group'); const brnSel = $('filter-pub-brand');
  if (catSel) { catSel.innerHTML = '<option value="">Tüm Kategoriler</option>'; DB.Category.filter(x=>!x.Deleted).forEach(c => catSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  if (grpSel) { grpSel.innerHTML = '<option value="">Tüm Gruplar</option>'; DB.ProductGroup.filter(x=>!x.Deleted).forEach(c => grpSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  if (brnSel) { brnSel.innerHTML = '<option value="">Tüm Markalar</option>'; DB.Brand.filter(x=>!x.Deleted).forEach(c => brnSel.innerHTML += `<option value="${c.Id}">${c.Name}</option>`); }
  
  if ($('global-page-title')) $('global-page-title').innerText = 'Yayın';
  
  // 🚀 YENİ KONTROL: Eğer marketDB henüz yüklenmemişse ama şifreler girilmişse bekle. Yoksa Popup aç!
  if (!window.marketDB) {
      if (localStorage.getItem('e3_firebase_market')) {
          showToast("Market bulutuna bağlanılıyor, veriler birazdan ekrana düşecek...");
          return;
      } else {
          showToast("⚠️ Market bulutuna bağlı değilsiniz!");
          if (typeof window.openMarketConfigModal === 'function') {
              window.openMarketConfigModal();
          }
          return;
      }
  }

  try {
      showSpinner("Market (e-esnaf) verileri canlı sorgulanıyor...");
      const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
      
      const querySnapshot = await getDocs(collection(window.marketDB, "PublishItem"));
      marketPublishItems = [];
      querySnapshot.forEach((doc) => {
          marketPublishItems.push(doc.data());
      });
      hideSpinner();
      
      selectedProductIds.clear();
      marketPublishItems.forEach(x => {
          selectedProductIds.add(x.ProductId);
      });
      
      renderPublishProducts();
  } catch (err) {
      hideSpinner();
      showCustomAlert("Market verileri çekilemedi: " + err.message, false);
  }
}

let publishLimit = 20;

export function renderPublishProducts(resetLimit = true) {
  if (resetLimit) publishLimit = 20;

  const q = $('filter-pub-q').value.toLowerCase().trim();
  const cat = $('filter-pub-cat').value; const grp = $('filter-pub-group').value; const brn = $('filter-pub-brand').value; const status = $('filter-pub-status').value;
  const list = $('publish-list'); list.innerHTML = '';
  visibleProductIds = []; 
  
  let rawList = [];

  DB.Product.filter(x => !x.Deleted).forEach(p => {
      rawList.push({ Id: p.Id, IsOrphaned: false, ERP_Prod: p });
  });

  marketPublishItems.forEach(pubItem => {
    if (!rawList.some(x => x.Id === pubItem.ProductId)) {
      rawList.push({ Id: pubItem.ProductId, IsOrphaned: true, ERP_Prod: null });
    }
  });
  
  rawList.forEach(item => {
      const pId = item.Id;
      const origProd = item.ERP_Prod || DB.Product.find(x => x.Id === pId);
      const existingPub = marketPublishItems.find(x => x.ProductId === pId);

      if (!publishState[pId]) {
          publishState[pId] = {
              Price: existingPub ? existingPub.Price : (origProd ? origProd.SalePrice : 0),
              DiscountRate: existingPub ? existingPub.DiscountRate : 0,
              SalePrice: existingPub ? existingPub.SalePrice : (origProd ? origProd.SalePrice : 0),
              StockQuantity: existingPub ? existingPub.StockQuantity : (origProd ? origProd.StockQuantity : 0),
              Description: existingPub ? (existingPub.Description || "") : (origProd ? (origProd.Description || "") : ""),
              Name: existingPub ? (existingPub.Name || (origProd ? origProd.Name : "Bilinmeyen Ürün")) : (origProd ? (origProd.Name || "Bilinmeyen Ürün") : "Bilinmeyen Ürün"),
              ProductGroupId: existingPub ? existingPub.ProductGroupId : (origProd ? origProd.ProductGroupId : null),
              CategoryId: existingPub ? existingPub.CategoryId : (origProd ? origProd.CategoryId : null),
              BrandId: existingPub ? existingPub.BrandId : (origProd ? origProd.BrandId : null),
              UnitId: existingPub ? existingPub.UnitId : (origProd ? origProd.UnitId : 1),
              PicturePath: existingPub ? (existingPub.PicturePath || "") : (origProd ? (origProd.PicturePath || "") : "")
          };
      }
  });

  // Filtrele
  let filteredList = rawList.filter(item => {
      const pId = item.Id;
      const s = publishState[pId];
      const existingPub = marketPublishItems.find(x => x.ProductId === pId);

      if (q && !s.Name.toLowerCase().includes(q)) return false;
      if (cat && String(s.CategoryId) !== String(cat)) return false;
      if (grp && String(s.ProductGroupId) !== String(grp)) return false;
      if (brn && String(s.BrandId) !== String(brn)) return false;
      
      if (status === 'published' && !existingPub) return false;
      if (status === 'unpublished' && existingPub) return false;
      
      return true;
  });

  // Sırala
  filteredList.sort((a,b) => publishState[a.Id].Name.localeCompare(publishState[b.Id].Name));

  // Sayfala (Kes)
  let pagedList = filteredList.slice(0, publishLimit);

  // Render
  pagedList.forEach(item => {
    const pId = item.Id;
    const s = publishState[pId];
    const existingPub = marketPublishItems.find(x => x.ProductId === pId);
    
    visibleProductIds.push(pId); 

    s.IsPublished = !!existingPub;
    const isSelected = selectedProductIds.has(pId);
    const displayName = s.Name;
    
    let bgClass = s.IsPublished ? 'background-color: rgba(33, 150, 243, 0.15); border: 1px solid rgba(33, 150, 243, 0.4);' : 'background-color: var(--bg); border: 1px solid var(--border);';
    let badgeTxt = s.IsPublished ? `<span style="color:#2196F3; font-weight:bold; font-size:0.65rem;">Yayında</span>` : `<span style="color:var(--text-muted); font-size:0.65rem;">Yayında Değil</span>`;

    if (item.IsOrphaned) {
        bgClass = 'background-color: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4);';
        badgeTxt = `<span style="color:var(--red); font-weight:bold; font-size:0.65rem;">⚠️ Sistemde Kayıtlı Değil (Kalıntı Kayıt)</span>`;
    }

    list.innerHTML += `
      <div onclick="openPublishDetailModal('${pId}')" style="${bgClass} border-radius:0.4rem; padding:0.4rem; margin-bottom:0.4rem; display:flex; gap:0.4rem; align-items:center; cursor:pointer;">
        
        <div style="width:24px; display:flex; justify-content:center;" onclick="event.stopPropagation()">
          <input type="checkbox" id="cb-${pId}" ${isSelected ? 'checked' : ''} onclick="toggleSelectPublish('${pId}', this.checked)" style="width:18px; height:18px; accent-color:var(--green); cursor:pointer; margin:0;">
        </div>

        <div style="flex:3; text-align:left; overflow:hidden;">
          <div style="margin-top:2px;">${badgeTxt}</div>
          <div style="font-weight:bold; font-size:0.8rem; white-space:nowrap; text-overflow:ellipsis;" title="${displayName}">${displayName}</div>
        </div>
        
        <div style="flex:2;" onclick="event.stopPropagation()"><input type="text" value="${formatTR(s.Price)}" inputmode="decimal" onfocus="focusPub(this, '${pId}', 'Price')" onblur="blurPub(this, '${pId}', 'Price')" oninput="calcPublishRow('${pId}', 'Price', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:1.5;" onclick="event.stopPropagation()"><input type="text" id="pub-yuz-${pId}" value="${formatTR(s.DiscountRate)}" inputmode="decimal" onfocus="focusPub(this, '${pId}', 'DiscountRate')" onblur="blurPub(this, '${pId}', 'DiscountRate')" oninput="calcPublishRow('${pId}', 'DiscountRate', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:2;" onclick="event.stopPropagation()"><input type="text" id="pub-ind-${pId}" value="${formatTR(s.SalePrice)}" inputmode="decimal" onfocus="focusPub(this, '${pId}', 'SalePrice')" onblur="blurPub(this, '${pId}', 'SalePrice')" oninput="calcPublishRow('${pId}', 'SalePrice', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
        <div style="flex:1.5;" onclick="event.stopPropagation()"><input type="number" value="${s.StockQuantity}" inputmode="numeric" oninput="calcPublishRow('${pId}', 'StockQuantity', this.value)" style="margin:0; padding:0.3rem; font-size:0.8rem; width:100%; box-sizing:border-box;"></div>
        
      </div>`;
  });
  
  // Tümünü seç checkbox'ı için güncelleme (Sadece render edilenleri baz alır, bu performans/güvenlik için iyidir)
  if($('pub-master-cb')) $('pub-master-cb').checked = visibleProductIds.length > 0 && visibleProductIds.every(id => selectedProductIds.has(id));

  // Daha fazla göster butonu
  if (filteredList.length > publishLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.8rem;" onclick="loadMorePublish()">Daha Fazla Göster (${filteredList.length - publishLimit} Kaldı)</button>`;
  }
}

window.loadMorePublish = function() {
    publishLimit += 20;
    // resetLimit'i false gönderiyoruz ki limit baştan başlamasın
    renderPublishProducts(false);
};

export function openPublishDetailModal(pId) {
    const s = publishState[pId];
    if (!s) return;
    
    const modal = $('mo-publish-detail');
    if (!modal) return;

    // 🚀 YENİ TASARIM: Çarpı (✕) ikonu eklendi, Ad ve Açıklama alanları şık şekilde yer değiştirdi
    modal.innerHTML = `
      <div class="modal-card" style="background: var(--card); color: var(--text); padding: 1.5rem; border-radius: 0.6rem; width: 95%; max-width: 500px; max-height: 85vh; overflow-y: auto; position: relative; margin: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem;">
            <h3 style="margin: 0; color: var(--accent); font-size:1.1rem;">🛍️ Vitrin Düzenleyici</h3>
            <button onclick="closeM('mo-publish-detail')" style="background: transparent; border: none; color: var(--text); font-size: 1.4rem; cursor: pointer; padding:0 5px;">✕</button>
        </div>
        
        <input type="hidden" id="mpd-ProductId" value="${pId}">
        
        <div style="display: flex; gap: 1rem; margin-bottom: 0.5rem;">
            <div style="display:flex; flex-direction:column; align-items:center;">
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px; align-self:flex-start;">Görsel</label>
                <div style="position: relative; width: 90px; height: 90px; border: 2px dashed var(--border); border-radius: 0.5rem; background: var(--bg); display:flex; align-items:center; justify-content:center;">
                    
                    <img id="mpd-PicturePreview" src="${s.PicturePath || ''}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 0.4rem; position: absolute; top:0; left:0; display: ${s.PicturePath ? 'block' : 'none'};">
                    <span id="mpd-PicturePlaceholder" style="color: var(--text-muted); font-size: 1.8rem; position: absolute; display: ${s.PicturePath ? 'none' : 'block'};">📷</span>
                    <input type="file" id="mpd-PictureInput" accept="image/*" style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index: 5;" onchange="previewPublishFoto(event)">
                    
                    <div id="mpd-PictureRemove" onclick="removePublishFoto(event)" style="position: absolute; top: -6px; right: -6px; background: var(--red); color: white; border-radius: 50%; width: 22px; height: 22px; display: ${s.PicturePath ? 'flex' : 'none'}; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; z-index: 10; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</div>
                </div>
            </div>
            
            <div style="flex: 1; display:flex; flex-direction:column; justify-content:center;">
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Vitrin Ürün Açıklaması</label>
                <textarea id="mpd-Description" rows="3" placeholder="Web sitenizde görünecek detaylı açıklama..." style="margin:0; height:90px; resize:none; padding:0.5rem; font-family:inherit;">${s.Description || ''}</textarea>
            </div>
        </div>
        
        <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px; margin-top: 5px;">Vitrin Ürün Adı</label>
        <input type="text" id="mpd-Name" value="${s.Name || ''}" placeholder="Web sitesinde görünecek ad" style="margin-bottom: 1rem; width: 100%; box-sizing: border-box;">
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Kategori</label>
                <select id="mpd-CategoryId" style="height:40px;">
                    <option value="">Kategori Yok</option>
                    ${DB.Category.filter(x=>!x.Deleted).map(c => `<option value="${c.Id}" ${String(c.Id) === String(s.CategoryId) ? 'selected' : ''}>${c.Name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Ürün Grubu</label>
                <select id="mpd-ProductGroupId" style="height:40px;">
                    <option value="">Grup Yok</option>
                    ${DB.ProductGroup.filter(x=>!x.Deleted).map(g => `<option value="${g.Id}" ${String(g.Id) === String(s.ProductGroupId) ? 'selected' : ''}>${g.Name}</option>`).join('')}
                </select>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Marka</label>
                <select id="mpd-BrandId" style="height:40px;">
                    <option value="">Marka Yok</option>
                    ${DB.Brand.filter(x=>!x.Deleted).map(b => `<option value="${b.Id}" ${String(b.Id) === String(s.BrandId) ? 'selected' : ''}>${b.Name}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Satış Birimi</label>
                <select id="mpd-UnitId" style="height:40px;">
                    <option value="1" ${String(s.UnitId) === '1' ? 'selected' : ''}>Ad</option>
                    <option value="2" ${String(s.UnitId) === '2' ? 'selected' : ''}>Kg</option>
                    <option value="3" ${String(s.UnitId) === '3' ? 'selected' : ''}>Gr</option>
                    <option value="4" ${String(s.UnitId) === '4' ? 'selected' : ''}>Lt</option>
                    <option value="5" ${String(s.UnitId) === '5' ? 'selected' : ''}>Mt</option>
                    <option value="6" ${String(s.UnitId) === '6' ? 'selected' : ''}>Pk</option>
                    <option value="7" ${String(s.UnitId) === '7' ? 'selected' : ''}>Kl</option>
                </select>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Normal Fiyat (₺)</label>
                <input type="text" id="mpd-Price" value="${formatTR(s.Price)}" inputmode="decimal" oninput="calcSingleDetail('Price')">
            </div>
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">İndirim Oranı (%)</label>
                <input type="text" id="mpd-DiscountRate" value="${formatTR(s.DiscountRate)}" inputmode="decimal" oninput="calcSingleDetail('DiscountRate')">
            </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">İndirimli Fiyat (₺)</label>
                <input type="text" id="mpd-SalePrice" value="${formatTR(s.SalePrice)}" inputmode="decimal" oninput="calcSingleDetail('SalePrice')">
            </div>
            <div>
                <label style="font-weight: bold; font-size: 0.8rem; display: block; margin-bottom: 4px;">Sanal Stok Miktarı</label>
                <input type="number" id="mpd-StockQuantity" value="${s.StockQuantity}" inputmode="numeric">
            </div>
        </div>
        
        <button class="btn-primary" onclick="savePublishDetail()" style="height:44px; font-size:0.95rem; background: var(--accent);">
            💾 Bilgileri Güncelle &amp; Listeye Ekle
        </button>
      </div>
    `;

    openM('mo-publish-detail');
}

export function previewPublishFoto(event) { 
  try {
    const file = event.target.files[0]; 
    if (!file) return; 
    
    const reader = new FileReader(); 
    reader.onload = function (e) { 
      const img = new Image();
      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;  
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }
          
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

          const previewObj = $('mpd-PicturePreview');
          if(previewObj) { previewObj.src = dataUrl; previewObj.style.display = 'block'; }
          
          const placeholder = $('mpd-PicturePlaceholder');
          if(placeholder) placeholder.style.display = 'none';
          
          const removeBtn = $('mpd-PictureRemove');
          if(removeBtn) removeBtn.style.display = 'flex';

        } catch(err) { alert("Görsel Küçültme Hatası: " + err.message); }
      };
      img.onerror = function() { alert("Görsel yüklenemedi veya bozuk format!"); };
      img.src = e.target.result;
    }; 
    reader.onerror = function() { alert("Dosya okuma hatası!"); };
    reader.readAsDataURL(file); 
  } catch(err) { alert("Genel Görsel Hatası: " + err.message); }
}

export function removePublishFoto(e) {
    if(e) e.stopPropagation(); // Çarpıya basınca arka plandaki dosya seçici penceresinin de açılmasını engeller
    
    const previewObj = $('mpd-PicturePreview');
    if(previewObj) { previewObj.src = ''; previewObj.style.display = 'none'; }
    
    const placeholder = $('mpd-PicturePlaceholder');
    if(placeholder) placeholder.style.display = 'block';
    
    const removeBtn = $('mpd-PictureRemove');
    if(removeBtn) removeBtn.style.display = 'none';

    const inputObj = $('mpd-PictureInput');
    if(inputObj) inputObj.value = '';
}

export function savePublishDetail() {
    const pId = $('mpd-ProductId').value;
    if (!pId) return;
    
    const s = publishState[pId];
    s.Name = $('mpd-Name').value.trim();
    s.Price = parseRawTR($('mpd-Price').value);
    s.DiscountRate = parseRawTR($('mpd-DiscountRate').value);
    s.SalePrice = parseRawTR($('mpd-SalePrice').value);
    s.StockQuantity = Number($('mpd-StockQuantity').value) || 0;
    s.Description = $('mpd-Description').value.trim();
    s.ProductGroupId = $('mpd-ProductGroupId').value || null;
    s.CategoryId = $('mpd-CategoryId').value || null;
    s.BrandId = $('mpd-BrandId').value || null;
    s.UnitId = Number($('mpd-UnitId').value) || 1;
    
    const previewObj = $('mpd-PicturePreview');
    s.PicturePath = (previewObj && previewObj.style.display !== 'none') ? previewObj.src : '';
    
    selectedProductIds.add(pId);
    
    closeM('mo-publish-detail');
    renderPublishProducts();
    showToast("Ürün vitrin bilgileri güncellendi!");
}

export function calcSingleDetail(field) {
    let price = parseRawTR($('mpd-Price').value);
    let discount = parseRawTR($('mpd-DiscountRate').value);
    let salePrice = parseRawTR($('mpd-SalePrice').value);
    
    if (field === 'Price' || field === 'DiscountRate') {
        salePrice = price - (price * discount / 100);
        $('mpd-SalePrice').value = formatTR(salePrice);
    } else if (field === 'SalePrice') {
        discount = price > 0 ? ((price - salePrice) / price) * 100 : 0;
        $('mpd-DiscountRate').value = formatTR(discount);
    }
}

export function calcPublishRow(pId, field, val) {
    const s = publishState[pId];
    let num = parseRawTR(val);
    
    if (field === 'StockQuantity') { s.StockQuantity = Number(val) || 0; }
    else if (field === 'Price') { s.Price = num; s.SalePrice = s.Price - (s.Price * s.DiscountRate / 100); $('pub-ind-'+pId).value = formatTR(s.SalePrice); }
    else if (field === 'DiscountRate') { s.DiscountRate = num; s.SalePrice = s.Price - (s.Price * s.DiscountRate / 100); $('pub-ind-'+pId).value = formatTR(s.SalePrice); }
    else if (field === 'SalePrice') { s.SalePrice = num; s.DiscountRate = s.Price > 0 ? ((s.Price - s.SalePrice) / s.Price) * 100 : 0; $('pub-yuz-'+pId).value = formatTR(s.DiscountRate); }
    
    if (!selectedProductIds.has(pId)) {
        selectedProductIds.add(pId);
        if($('cb-'+pId)) $('cb-'+pId).checked = true;
    }
}

export function toggleSelectPublish(pId, isChecked) {
    if (isChecked) selectedProductIds.add(pId); else selectedProductIds.delete(pId);
    if($('pub-master-cb')) $('pub-master-cb').checked = visibleProductIds.length > 0 && visibleProductIds.every(id => selectedProductIds.has(id));
}

export function toggleAllPublish(isChecked) {
    visibleProductIds.forEach(id => {
        if (isChecked) selectedProductIds.add(id); else selectedProductIds.delete(id);
        if($('cb-'+id)) $('cb-'+id).checked = isChecked;
    });
}

export function openPublishListModal() {
    renderPublishCartList(); 
    openM('mo-publish-list');
}

export function removePopupPublishItem(pId) {
    selectedProductIds.delete(pId);
    renderPublishCartList();
    renderPublishProducts(); 
}

export function renderPublishCartList() {
    const list = $('publish-cart-list'); list.innerHTML = '';
    
    if (selectedProductIds.size === 0) {
        list.innerHTML = `
        <div style="padding:1rem; text-align:center; color:var(--red); margin-top:20px;">
            <div style="font-size:3rem; margin-bottom:10px;">⚠️</div>
            <h3 style="margin-bottom:10px;">Vitrin Tamamen Boşaltılacak!</h3>
            <p style="font-size:0.9rem; color:var(--text-muted);">Hiçbir ürün seçilmedi. Eğer onaylarsanız, daha önce web sitenizde yayında olan <b>TÜM ÜRÜNLER</b> yayından kaldırılacaktır.</p>
        </div>`;
        return;
    }

    selectedProductIds.forEach(pId => {
        const p = DB.Product.find(x => x.Id === pId);
        const oldItem = marketPublishItems.find(x => x.ProductId === pId);
        const isDeletedProduct = !p || p.Deleted;
        const s = publishState[pId];
        
        const pName = s ? s.Name : (oldItem ? oldItem.Name : (p ? p.Name : "Bilinmeyen Ürün"));

        let bgClass = (s && s.IsPublished) ? 'background-color: rgba(33, 150, 243, 0.15);' : 'background-color: var(--bg);';
        let nameHtml = `<div style="font-weight:bold; font-size:0.9rem; margin-bottom:4px;">${pName}</div>`;
        
        if (isDeletedProduct && (!oldItem || !s)) {
            bgClass = 'background-color: rgba(239, 68, 68, 0.12);';
            nameHtml = `<div style="font-weight:bold; font-size:0.9rem; margin-bottom:4px; color:var(--red);">⚠️ ${pName} (Sistemde Kayıtlı Değil)</div>`;
        }

        if (s) {
            list.innerHTML += `
            <div style="${bgClass} border: 1px solid var(--border); border-radius:0.5rem; padding:0.6rem; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
              <div style="flex:1;">
                ${nameHtml}
                <div style="font-size:0.75rem; color:var(--text-muted);">
                  Normal: <b>${formatTR(s.Price)} ₺</b> | İnd: <b>%${formatTR(s.DiscountRate)}</b><br>
                  Satış: <b style="color:var(--accent);">${formatTR(s.SalePrice)} ₺</b> | Stok: <b>${s.StockQuantity}</b>
                </div>
              </div>
              <button class="icon-btn text-red" style="padding:0.5rem; font-size:1.2rem;" onclick="removePopupPublishItem('${pId}')">🗑️</button>
            </div>`;
        }
    });
}

export function publishAction() {
    if (!window.marketDB) return showToast("⚠️ Market bulut bağlantısı yok!");

    showConfirm('Vitrin Listeniz doğrudan e-esnaf veritabanına senkronize edilecektir. Onaylıyor musunuz?', async () => {
        try {
            showSpinner("Market veritabanı doğrudan eşitleniyor...");
            const { writeBatch, doc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
            const batch = writeBatch(window.marketDB);
            
            marketPublishItems.forEach(dbItem => {
                if (!selectedProductIds.has(dbItem.ProductId)) {
                    const docRef = doc(window.marketDB, "PublishItem", String(dbItem.ProductId));
                    batch.delete(docRef);
                }
            });
            
            selectedProductIds.forEach(pId => {
                const s = publishState[pId];
                const p = DB.Product.find(x => x.Id === pId);
                const oldItem = marketPublishItems.find(x => x.ProductId === pId);
                
                const docData = {
                    Id: oldItem ? oldItem.Id : guid(),
                    ProductId: pId,
                    Price: s.Price,
                    DiscountRate: s.DiscountRate,
                    SalePrice: s.SalePrice,
                    StockQuantity: s.StockQuantity,
                    Name: s.Name,
                    Description: s.Description,
                    ProductGroupId: s.ProductGroupId,
                    CategoryId: s.CategoryId,
                    BrandId: s.BrandId,
                    UnitId: s.UnitId,
                    PicturePath: s.PicturePath,
                    BarCode: p ? (p.BarCode || "") : (oldItem ? (oldItem.BarCode || "") : ""),
                    
                    UpdatedDate: tsNow(),
                    UpdatedUser: getCihazAdi()
                };
                
                const docRef = doc(window.marketDB, "PublishItem", String(pId));
                batch.set(docRef, docData);
            });
            
            await batch.commit();
            hideSpinner();
            closeM('mo-publish-list');
            showToast('🚀 e-esnaf Vitrin veritabanı canlı olarak güncellendi!');
            
            initPublishView();
        } catch (err) {
            hideSpinner();
            showCustomAlert("Market veritabanına doğrudan yazılamadı: " + err.message, false);
        }
    }, '🚀', 'Evet, Eşitle');
}

export function focusPub(el, pId, field) { 
    el.value = toRawTR(publishState[pId][field]); 
}
export function blurPub(el, pId, field) { 
    el.value = formatTR(publishState[pId][field]); 
}