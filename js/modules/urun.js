import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, getBirimAd, parseRawTR, formatTR, toRawTR, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm, toTitleCaseTR } from '../core/utils.js';
import { startCam } from './siparis.js';

let tempGroupType = ''; 
let tempItems = [];

export function loadUrunGrupSelects() {
  const filterPg = $('filter-urun-grup'); const filterCat = $('filter-urun-kategori'); const filterBrand = $('filter-urun-marka');
  if (filterPg) filterPg.innerHTML = '<option value="">Tüm Gruplar</option>';
  if (filterCat) filterCat.innerHTML = '<option value="">Tüm Kategoriler</option>';
  if (filterBrand) filterBrand.innerHTML = '<option value="">Tüm Markalar</option>';

  DB.ProductGroup.filter(x=>!x.Deleted).forEach(g => { if (filterPg) filterPg.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });
  DB.Category.filter(x=>!x.Deleted).forEach(c => { if (filterCat) filterCat.innerHTML += `<option value="${c.Id}">${c.Name}</option>`; });
  DB.Brand.filter(x=>!x.Deleted).forEach(b => { if (filterBrand) filterBrand.innerHTML += `<option value="${b.Id}">${b.Name}</option>`; });
}

export function openUrunTanimiModal(type) { 
  tempGroupType = type; let targetDB = []; let title = '';
  if(type === 'ProductGroup') { targetDB = DB.ProductGroup; title = 'Ürün Grupları'; }
  else if(type === 'Category') { targetDB = DB.Category; title = 'Kategoriler'; }
  else if(type === 'Brand') { targetDB = DB.Brand; title = 'Markalar'; }
  
  $('mut-title').innerText = title;
  tempItems = JSON.parse(JSON.stringify(targetDB.filter(x=>!x.Deleted))); 
  $('mut-new-ad').value = ''; renderUrunTanimiList(); openM('mo-urun-tanimi'); 
}

export function renderUrunTanimiList() {
  const list = $('mut-list'); list.innerHTML = ''; if (tempItems.length === 0) { list.innerHTML = '<p class="text-muted">Kayıt yok.</p>'; return; }
  tempItems.forEach((g, idx) => { list.innerHTML += `<div class="flex items-center gap-2 mb-2"><input type="text" value="${g.Name}" onchange="updateTempUrunTanimi(${idx}, this.value)" style="margin:0;"><button class="icon-btn text-red" onclick="deleteTempUrunTanimi(${idx})">🗑️</button></div>`; });
}
export function addTempUrunTanimi() { const name = toTitleCaseTR($('mut-new-ad').value.trim()); if (!name) return; tempItems.push({ Id: guid(), Name: name, Deleted: false, CreatedDate: tsNow(), CreatedUser: getCihazAdi() }); $('mut-new-ad').value = ''; renderUrunTanimiList(); }
export function updateTempUrunTanimi(idx, val) { tempItems[idx].Name = toTitleCaseTR(val.trim()); tempItems[idx].UpdatedDate = tsNow(); }
export function deleteTempUrunTanimi(idx) { tempItems[idx].Deleted = true; tempItems[idx].DeletedDate = tsNow(); renderUrunTanimiList(); }

export function saveUrunTanimi() {
  let targetDB = [];
  if(tempGroupType === 'ProductGroup') targetDB = DB.ProductGroup; else if(tempGroupType === 'Category') targetDB = DB.Category; else if(tempGroupType === 'Brand') targetDB = DB.Brand;
  tempItems.forEach(tg => { const existing = targetDB.find(g => g.Id === tg.Id); if(existing) Object.assign(existing, tg); else targetDB.push(tg); });
  saveDB(); closeM('mo-urun-tanimi'); loadUrunGrupSelects(); renderUrun(true); showToast("Kayıtlar güncellendi!");
}

// ==============================================================================
// YENİ: MOBİL CİHAZ (iOS) GÖRSEL SIKIŞTIRMA VE OPTİMİZASYON MOTORU
// ==============================================================================
export function previewUrunFoto(event) { 
  const file = event.target.files[0]; 
  if (!file) return; 
  
  const reader = new FileReader(); 
  reader.onload = function (e) { 
    const img = new Image();
    img.onload = function() {
      // Devasa iPhone fotoğraflarını tarayıcıda Canvas ile küçültüyoruz
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;  // Katalogda net görünmesi için ideal sınır
      const MAX_HEIGHT = 600;
      let width = img.width;
      let height = img.height;

      // Orantıyı koruyarak yeniden boyutlandır
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // %70 kalite ile JPEG formatında sıkıştır. (5MB -> ~50KB seviyesine düşer)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

      $('mu-foto-preview').src = dataUrl; 
      $('mu-foto-preview').style.display = 'block'; 
    };
    img.src = e.target.result;
  }; 
  reader.readAsDataURL(file); 
}
// ==============================================================================

export function renderUrun(force = false) {
  if (!force) return; 
  const q = $('filter-urun-q').value.toLowerCase().trim(); 
  const fGrup = $('filter-urun-grup') ? $('filter-urun-grup').value : ''; 
  const fCat = $('filter-urun-kategori') ? $('filter-urun-kategori').value : ''; 
  const fBrand = $('filter-urun-marka') ? $('filter-urun-marka').value : ''; 
  const list = $('urun-list'); list.innerHTML = '';
  
  DB.Product.filter(x => !x.Deleted).sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)).forEach(u => {
    const content = (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase(); 
    if (q && !content.includes(q)) return;
    if (fGrup && String(u.ProductGroupId) !== String(fGrup)) return;
    if (fCat && String(u.CategoryId) !== String(fCat)) return;
    if (fBrand && String(u.BrandId) !== String(fBrand)) return;
    
    const gName = u.ProductGroupId ? (DB.ProductGroup.find(x => String(x.Id) === String(u.ProductGroupId))?.Name || '') : '';
    const cName = u.CategoryId ? (DB.Category.find(x => String(x.Id) === String(u.CategoryId))?.Name || '') : '';
    const bName = u.BrandId ? (DB.Brand.find(x => String(x.Id) === String(u.BrandId))?.Name || '') : '';
    
    let stok = Number(u.StockQuantity || 0); let bClass = stok >= 10 ? 'bg-green' : (stok > 0 ? 'bg-amber' : 'bg-red');
    
    let tagsHtml = '';
    if(gName) tagsHtml += `<span class="badge" style="border:1px solid var(--accent); color:var(--accent);">${gName}</span>`;
    if(cName) tagsHtml += `<span class="badge" style="border:1px solid var(--green); color:var(--green);">${cName}</span>`;
    if(bName) tagsHtml += `<span class="badge" style="border:1px solid var(--amber); color:var(--amber);">${bName}</span>`;

    list.innerHTML += `<div class="list-item" onclick="editUrun('${u.Id}')"><div><div style="font-weight:bold; margin-bottom:4px;">${u.Name}</div><div style="display:flex; gap:4px; margin-bottom:4px;">${tagsHtml}</div><div style="font-size:0.75rem; color:var(--text-muted)">Barkod: ${u.BarCode || '-'}</div></div><div style="text-align:right"><div style="font-weight:bold; color:var(--accent)">${fp(u.SalePrice)}</div><span class="badge ${bClass}">${stok} ${getBirimAd(u.UnitId)}</span></div></div>`;
  });
}

export function openUrunModal() {
  $('mu-Id').value = ''; $('mu-Name').value = ''; $('mu-BarCode').value = ''; $('mu-PurchasePrice').value = ''; $('mu-SalePrice').value = ''; $('mu-StockQuantity').value = ''; $('mu-UnitId').value = '1'; $('mu-Description').value = ''; 
  
  $('mu-ProductGroupId').value = ''; $('csd-mu-ProductGroupId').innerText = 'Grup Seç';
  $('mu-CategoryId').value = ''; $('csd-mu-CategoryId').innerText = 'Kategori Seç';
  $('mu-BrandId').value = ''; $('csd-mu-BrandId').innerText = 'Marka Seç';

  $('mu-PicturePath-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none'; 
  $('mu-del').classList.add('hidden'); 
  loadUrunGrupSelects(); 
  openM('mo-urun');
}

export function editUrun(id) {
  const u = DB.Product.find(x => String(x.Id) === String(id)); if (!u) return; loadUrunGrupSelects();
  $('mu-Id').value = u.Id; $('mu-Name').value = u.Name; $('mu-BarCode').value = u.BarCode || ''; $('mu-PurchasePrice').value = formatTR(u.PurchasePrice); $('mu-SalePrice').value = formatTR(u.SalePrice); $('mu-StockQuantity').value = u.StockQuantity || 0; $('mu-UnitId').value = u.UnitId || '1'; $('mu-Description').value = u.Description || ''; 
  
  $('mu-ProductGroupId').value = u.ProductGroupId || '';
  $('csd-mu-ProductGroupId').innerText = u.ProductGroupId ? (DB.ProductGroup.find(x => String(x.Id) === String(u.ProductGroupId))?.Name || 'Grup Seç') : 'Grup Seç';
  
  $('mu-CategoryId').value = u.CategoryId || '';
  $('csd-mu-CategoryId').innerText = u.CategoryId ? (DB.Category.find(x => String(x.Id) === String(u.CategoryId))?.Name || 'Kategori Seç') : 'Kategori Seç';
  
  $('mu-BrandId').value = u.BrandId || '';
  $('csd-mu-BrandId').innerText = u.BrandId ? (DB.Brand.find(x => String(x.Id) === String(u.BrandId))?.Name || 'Marka Seç') : 'Marka Seç';

  if (u.PicturePath) { $('mu-foto-preview').src = u.PicturePath; $('mu-foto-preview').style.display = 'block'; } else { $('mu-PicturePath-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none'; }
  $('mu-del').classList.remove('hidden'); $('mu-del').onclick = () => { showConfirm(`${u.Name} silinecek?`, () => { softDelete(DB.Product, id); saveDB(); closeM('mo-urun'); renderUrun(true); }, '🗑️', 'Sil'); }; openM('mo-urun');
}

export function saveUrun() {
  const name = toTitleCaseTR($('mu-Name').value.trim()); if (!name) return showToast('Ürün adı zorunlu!'); const id = $('mu-Id').value;
  const data = { 
    Name: name, BarCode: $('mu-BarCode').value, 
    ProductGroupId: $('mu-ProductGroupId').value || null, CategoryId: $('mu-CategoryId').value || null, BrandId: $('mu-BrandId').value || null,
    UnitId: Number($('mu-UnitId').value) || 1, Description: toTitleCaseTR($('mu-Description').value.trim()), 
    PurchasePrice: parseRawTR($('mu-PurchasePrice').value), SalePrice: parseRawTR($('mu-SalePrice').value), StockQuantity: Number($('mu-StockQuantity').value) || 0, PicturePath: $('mu-foto-preview').src.startsWith('data:') ? $('mu-foto-preview').src : '' 
  };
  
  if (id) Object.assign(DB.Product.find(x => String(x.Id) === String(id)), data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  else DB.Product.push({ Id: guid(), ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  
  // HATA YAKALAMA MEKANİZMASI (Cihaz hafızası dolsa bile uyarı verir)
  try {
    saveDB(); 
    closeM('mo-urun'); 
    renderUrun(true);
  } catch(e) {
    showToast("Kayıt Hatası: Cihaz hafızası dolu! Çok fazla görsel eklenmiş olabilir.");
    console.error(e);
  }
}