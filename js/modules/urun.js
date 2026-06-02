import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, getBirimAd, parseRawTR, formatTR, toRawTR, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm, toTitleCaseTR } from '../core/utils.js';
import { startCam } from './siparis.js';

export function loadUrunGrupSelects() {
  const sel = $('mu-ProductGroupId'); const selFiltre = $('filter-urun-grup');
  if (sel) sel.innerHTML = '<option value="">Grup Yok</option>'; if (selFiltre) selFiltre.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.ProductGroup.filter(x=>!x.Deleted).forEach(g => { if (sel) sel.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; if (selFiltre) selFiltre.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });
}

export function previewUrunFoto(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { $('mu-foto-preview').src = e.target.result; $('mu-foto-preview').style.display = 'block'; }; reader.readAsDataURL(file); }

export function renderUrun(force = false) {
  if (!force) return; const q = $('filter-urun-q').value.toLowerCase().trim(); const fGrup = $('filter-urun-grup') ? $('filter-urun-grup').value : ''; const list = $('urun-list'); list.innerHTML = '';
  DB.Product.filter(x => !x.Deleted).sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)).forEach(u => {
    const content = (u.Name + " " + (u.BarCode || "") + " " + (u.Description || "")).toLowerCase(); if (q && !content.includes(q)) return;
    if (fGrup && String(u.ProductGroupId) !== String(fGrup)) return;
    const gName = u.ProductGroupId ? (DB.ProductGroup.find(x => String(x.Id) === String(u.ProductGroupId))?.Name || '') : '';
    let stok = Number(u.StockQuantity || 0); let bClass = stok >= 10 ? 'bg-green' : (stok > 0 ? 'bg-amber' : 'bg-red');
    list.innerHTML += `<div class="list-item" onclick="editUrun('${u.Id}')"><div><div style="font-weight:bold">${u.Name} <span class="badge" style="display:${gName?'inline-block':'none'}">${gName}</span></div><div style="font-size:0.75rem; color:var(--text-muted)">Barkod: ${u.BarCode || '-'}</div></div><div style="text-align:right"><div style="font-weight:bold; color:var(--accent)">${fp(u.SalePrice)}</div><span class="badge ${bClass}">${stok} ${getBirimAd(u.UnitId)}</span></div></div>`;
  });
}

export function openUrunModal() {
  $('mu-Id').value = ''; $('mu-Name').value = ''; $('mu-BarCode').value = ''; $('mu-PurchasePrice').value = ''; $('mu-SalePrice').value = ''; $('mu-StockQuantity').value = ''; $('mu-UnitId').value = '1'; $('mu-Description').value = ''; $('mu-ProductGroupId').value = '';
  $('mu-PicturePath-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none'; $('mu-del').classList.add('hidden'); loadUrunGrupSelects(); openM('mo-urun');
}

export function editUrun(id) {
  const u = DB.Product.find(x => String(x.Id) === String(id)); if (!u) return; loadUrunGrupSelects();
  $('mu-Id').value = u.Id; $('mu-Name').value = u.Name; $('mu-BarCode').value = u.BarCode || ''; $('mu-PurchasePrice').value = formatTR(u.PurchasePrice); $('mu-SalePrice').value = formatTR(u.SalePrice); $('mu-StockQuantity').value = u.StockQuantity || 0; $('mu-UnitId').value = u.UnitId || '1'; $('mu-Description').value = u.Description || ''; $('mu-ProductGroupId').value = u.ProductGroupId || '';
  if (u.PicturePath) { $('mu-foto-preview').src = u.PicturePath; $('mu-foto-preview').style.display = 'block'; } else { $('mu-PicturePath-input').value = ''; $('mu-foto-preview').src = ''; $('mu-foto-preview').style.display = 'none'; }
  $('mu-del').classList.remove('hidden'); $('mu-del').onclick = () => { showConfirm(`${u.Name} silinecek?`, () => { softDelete(DB.Product, id); saveDB(); closeM('mo-urun'); renderUrun(true); }, '🗑️', 'Sil'); }; openM('mo-urun');
}

export function saveUrun() {
  const name = toTitleCaseTR($('mu-Name').value.trim()); if (!name) return showToast('Ürün adı zorunlu!'); const id = $('mu-Id').value;
  const data = { 
    Name: name, 
    BarCode: $('mu-BarCode').value, 
    ProductGroupId: $('mu-ProductGroupId').value || null, 
    UnitId: Number($('mu-UnitId').value) || 1, 
    Description: toTitleCaseTR($('mu-Description').value.trim()), 
    PurchasePrice: parseRawTR($('mu-PurchasePrice').value), 
    SalePrice: parseRawTR($('mu-SalePrice').value), 
    StockQuantity: Number($('mu-StockQuantity').value) || 0, 
    PicturePath: $('mu-foto-preview').src.startsWith('data:') ? $('mu-foto-preview').src : '' 
  };
  if (id) Object.assign(DB.Product.find(x => String(x.Id) === String(id)), data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  else DB.Product.push({ Id: guid(), ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  saveDB(); closeM('mo-urun'); renderUrun(true);
}