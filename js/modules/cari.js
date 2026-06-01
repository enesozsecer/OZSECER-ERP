import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, calcBalance, parseRawTR, formatTR, toRawTR, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm } from '../core/utils.js';
import { printEkstre } from '../core/pdf.js';
import { renderHome } from './home.js';

let tempGroupType = ''; let tempGruplar = [];

export function openGrupModal(type) { 
  tempGroupType = type; const targetDB = type === 'CurrentGroup' ? DB.CurrentGroup : DB.ProductGroup;
  $('mg-title').innerText = type === 'CurrentGroup' ? 'Cari Grupları' : 'Ürün Grupları';
  tempGruplar = JSON.parse(JSON.stringify(targetDB.filter(x=>!x.Deleted))); $('mg-new-ad').value = ''; renderGrupList(); openM('mo-grup'); 
}

export function renderGrupList() {
  const list = $('mg-list'); list.innerHTML = ''; if (tempGruplar.length === 0) { list.innerHTML = '<p class="text-muted">Kayıt yok.</p>'; return; }
  tempGruplar.forEach((g, idx) => { list.innerHTML += `<div class="flex items-center gap-2 mb-2"><input type="text" value="${g.Name}" onchange="updateTempGrup(${idx}, this.value)" style="margin:0;"><button class="icon-btn text-red" onclick="deleteTempGrup(${idx})">🗑️</button></div>`; });
}
export function addTempGrup() { const name = $('mg-new-ad').value.trim(); if (!name) return; tempGruplar.push({ Id: guid(), Name: name, Deleted: false, CreatedDate: tsNow(), CreatedUser: getCihazAdi() }); $('mg-new-ad').value = ''; renderGrupList(); }
export function updateTempGrup(idx, val) { tempGruplar[idx].Name = val.trim(); tempGruplar[idx].UpdatedDate = tsNow(); }
export function deleteTempGrup(idx) { tempGruplar[idx].Deleted = true; tempGruplar[idx].DeletedDate = tsNow(); renderGrupList(); }

export function saveGrup() {
  const targetDB = tempGroupType === 'CurrentGroup' ? DB.CurrentGroup : DB.ProductGroup;
  tempGruplar.forEach(tg => { const existing = targetDB.find(g => g.Id === tg.Id); if(existing) Object.assign(existing, tg); else targetDB.push(tg); });
  saveDB(); closeM('mo-grup'); if(tempGroupType === 'CurrentGroup') { loadGrupSelects(); renderCari(true); } else { window.loadUrunGrupSelects(); window.renderUrun(true); }
}

export function loadGrupSelects() {
  const selCari = $('mc-CurrentGroupId'); const selKasa = $('filter-kasa-grup'); const selAn = $('filter-an-grup');
  if (selCari) selCari.innerHTML = '<option value="">Grup Yok</option>'; if (selKasa) selKasa.innerHTML = '<option value="">Tüm Gruplar</option>'; if (selAn) selAn.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.CurrentGroup.filter(x=>!x.Deleted).forEach(g => { if(selCari) selCari.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; if(selKasa) selKasa.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; if(selAn) selAn.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; });
}

export function renderCari(force = false) {
  if (!force) return; const q = $('filter-cari-q').value.toLowerCase().trim(); const f = $('filter-cari-durum').value; const list = $('cari-list'); list.innerHTML = '';
  DB.Current.filter(x => !x.Deleted).sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate)).forEach(c => {
    const content = (c.Name + " " + (c.PhoneNumber || "") + " " + (c.VKN || "")).toLowerCase(); if (q && !content.includes(q)) return;
    const net = calcBalance(c.Id) + (Number(c.Balance) || 0);
    if (f === 'alacakli' && net >= 0) return; if (f === 'borclu' && net <= 0) return;
    const gName = c.CurrentGroupId ? (DB.CurrentGroup.find(x => String(x.Id) === String(c.CurrentGroupId))?.Name || '') : '';
    let netHtml = `<span style="color:var(--text-muted)">0,00</span>`; if (net > 0) netHtml = `<span class="text-red">Borçlu: ${fp(net)}</span>`; if (net < 0) netHtml = `<span class="text-green">Alacaklı: ${fp(Math.abs(net))}</span>`;
    list.innerHTML += `<div class="list-item" onclick="editCari('${c.Id}')"><div><div style="font-weight:bold">${c.Name} <span class="badge" style="display:${gName?'inline-block':'none'}">${gName}</span></div><div style="font-size:0.75rem; color:var(--text-muted)">${c.PhoneNumber || '-'} | VKN: ${c.VKN || '-'}</div></div><div style="text-align:right; font-weight:bold">${netHtml}</div></div>`;
  });
}

export function openCariModal() {
  $('mc-Id').value = ''; $('mc-Name').value = ''; $('mc-PhoneNumber').value = ''; $('mc-VKN').value = ''; 
  $('mc-IdentityNumber').value = ''; $('mc-Email').value = ''; $('mc-Address').value = ''; $('mc-Balance').value = ''; 
  loadGrupSelects();
  $('mc-title').innerText = 'Yeni Cari'; $('mc-del').classList.add('hidden'); $('mc-ekstre').classList.add('hidden'); openM('mo-cari');
}

export function editCari(id) {
  const c = DB.Current.find(x => String(x.Id) === String(id)); if (!c) return; loadGrupSelects();
  $('mc-Id').value = c.Id; $('mc-Name').value = c.Name; $('mc-PhoneNumber').value = c.PhoneNumber || ''; 
  $('mc-VKN').value = c.VKN || ''; $('mc-IdentityNumber').value = c.IdentityNumber || ''; $('mc-Email').value = c.Email || ''; 
  $('mc-Address').value = c.Address || ''; $('mc-CurrentGroupId').value = c.CurrentGroupId || '';
  $('mc-Balance').value = c.Balance ? formatTR(c.Balance) : '';
  
  $('mc-title').innerText = 'Cari Düzenle'; $('mc-del').classList.remove('hidden'); $('mc-ekstre').classList.remove('hidden');
  $('mc-del').onclick = () => { showConfirm(`${c.Name} silinecek?`, () => { softDelete(DB.Current, id); saveDB(); closeM('mo-cari'); renderCari(true); }, '🗑️', 'Sil'); };
  $('mc-ekstre').onclick = () => { closeM('mo-cari'); printEkstre(c.Id); }; openM('mo-cari');
}

export function saveCari() {
  const name = $('mc-Name').value.trim(); if (!name) return showToast('Ad zorunlu!'); const id = $('mc-Id').value;
  
  const data = { 
    Name: name, 
    CurrentGroupId: $('mc-CurrentGroupId').value || null, 
    PhoneNumber: $('mc-PhoneNumber').value, 
    VKN: $('mc-VKN').value, 
    IdentityNumber: $('mc-IdentityNumber').value,
    Email: $('mc-Email').value, 
    Address: $('mc-Address').value, 
    Balance: parseRawTR($('mc-Balance').value) 
  };
  
  if (id) Object.assign(DB.Current.find(x => String(x.Id) === String(id)), data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  else DB.Current.push({ Id: guid(), ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  saveDB(); closeM('mo-cari'); renderCari(true);
}