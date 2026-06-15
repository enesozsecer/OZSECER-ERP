import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fp, calcBalance, parseRawTR, formatTR, toRawTR, getCihazAdi, softDelete, showToast, openM, closeM, showConfirm, toTitleCaseTR } from '../core/utils.js';
import { printEkstre } from '../core/pdf.js';

let tempGroupType = ''; 
let tempGruplar = [];

export function openGrupModal(type) { 
  tempGroupType = type; 
  const targetDB = type === 'CurrentGroup' ? DB.CurrentGroup : DB.Sector;
  $('mg-title').innerText = type === 'CurrentGroup' ? 'Cari Grupları' : 'Sektör Yönetimi';
  
  tempGruplar = JSON.parse(JSON.stringify(targetDB.filter(x=>!x.Deleted))); 
  $('mg-new-ad').value = ''; 
  renderGrupList(); 
  openM('mo-grup'); 
}

export function renderGrupList() {
  const list = $('mg-list'); list.innerHTML = ''; 
  const activeItems = tempGruplar.filter(i => !i.Deleted);

  if (activeItems.length === 0) { 
      list.innerHTML = '<p class="text-muted">Kayıt yok.</p>'; 
      return; 
  }
  
  // Orijinal diziyi ezmeden ekrana basıyoruz ki indeksler kaymasın
  tempGruplar.forEach((g, idx) => { 
      if (!g.Deleted) {
          list.innerHTML += `<div class="flex items-center gap-2 mb-2">
            <input type="text" value="${g.Name}" onchange="updateTempGrup(${idx}, this.value)" style="margin:0;">
            <button class="icon-btn text-red" onclick="deleteTempGrup(${idx})">🗑️</button>
          </div>`; 
      }
  });
}

export function addTempGrup() { 
  const name = toTitleCaseTR($('mg-new-ad').value.trim()); 
  if (!name) return; 
  tempGruplar.push({ Id: guid(), Name: name, Deleted: false, CreatedDate: tsNow(), CreatedUser: getCihazAdi() }); 
  $('mg-new-ad').value = ''; 
  renderGrupList(); 
}

export function updateTempGrup(idx, val) { 
  tempGruplar[idx].Name = toTitleCaseTR(val.trim()); 
  tempGruplar[idx].UpdatedDate = tsNow(); 
}

export function deleteTempGrup(idx) { 
  tempGruplar[idx].Deleted = true; 
  tempGruplar[idx].DeletedDate = tsNow(); 
  tempGruplar[idx].DeletedUser = getCihazAdi();
  renderGrupList(); 
}

export function saveGrup() {
  const targetDB = tempGroupType === 'CurrentGroup' ? DB.CurrentGroup : DB.Sector;
  tempGruplar.forEach(tg => { const existing = targetDB.find(g => g.Id === tg.Id); if(existing) Object.assign(existing, tg); else targetDB.push(tg); });
  saveDB(); closeM('mo-grup'); 
  loadGrupSelects(); renderCari(true); showToast("Kayıtlar güncellendi!");
}

export function loadGrupSelects() {
  const selCari = $('mc-CurrentGroupId'); const selKasa = $('filter-kasa-grup'); const selAn = $('filter-an-grup');
  const selCariFiltre = $('filter-cari-grup'); // YENİ EKLENDİ
  const selSector = $('mc-SectorId'); const filterSector = $('filter-cari-sector');

  if (selCari) selCari.innerHTML = '<option value="">Grup Yok</option>'; 
  if (selKasa) selKasa.innerHTML = '<option value="">Tüm Gruplar</option>'; 
  if (selAn) selAn.innerHTML = '<option value="">Tüm Gruplar</option>';
  if (selCariFiltre) selCariFiltre.innerHTML = '<option value="">Tüm Gruplar</option>'; // YENİ EKLENDİ
  if (selSector) selSector.innerHTML = '<option value="">Sektör Yok</option>';
  if (filterSector) filterSector.innerHTML = '<option value="">Tüm Sektörler</option>';

  DB.CurrentGroup.filter(x=>!x.Deleted).forEach(g => { 
    if(selCari) selCari.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; 
    if(selKasa) selKasa.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; 
    if(selAn) selAn.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; 
    if(selCariFiltre) selCariFiltre.innerHTML += `<option value="${g.Id}">${g.Name}</option>`; // YENİ EKLENDİ
  });
  
  DB.Sector.filter(x=>!x.Deleted).forEach(s => { 
    if(selSector) selSector.innerHTML += `<option value="${s.Id}">${s.Name}</option>`; 
    if(filterSector) filterSector.innerHTML += `<option value="${s.Id}">${s.Name}</option>`; 
  });
}

let cariLimit = 20;

export function renderCari(force = false, resetLimit = true) {
  if (!force) return; 
  if (resetLimit) cariLimit = 20;

  const q = $('filter-cari-q').value.toLowerCase().trim(); 
  const f = $('filter-cari-durum').value; 
  const fGrup = $('filter-cari-grup') ? $('filter-cari-grup').value : ''; 
  const fSec = $('filter-cari-sector') ? $('filter-cari-sector').value : '';
  const list = $('cari-list'); list.innerHTML = '';
  
  let filteredList = DB.Current.filter(x => !x.Deleted).filter(c => {
    const content = (c.Name + " " + (c.PhoneNumber || "") + " " + (c.VKN || "")).toLowerCase(); 
    if (q && !content.includes(q)) return false;
    if (fGrup && String(c.CurrentGroupId) !== String(fGrup)) return false; 
    if (fSec && String(c.SectorId) !== String(fSec)) return false; 
    
    const net = calcBalance(c.Id) + (Number(c.Balance) || 0);
    if (f === 'alacakli' && net >= 0) return false; 
    if (f === 'borclu' && net <= 0) return false;

    return true;
  });

  filteredList.sort((a, b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));

  let pagedList = filteredList.slice(0, cariLimit);

  pagedList.forEach(c => {
    const net = calcBalance(c.Id) + (Number(c.Balance) || 0);
    const gName = c.CurrentGroupId ? (DB.CurrentGroup.find(x => String(x.Id) === String(c.CurrentGroupId))?.Name || '') : '';
    const sName = c.SectorId ? (DB.Sector.find(x => String(x.Id) === String(c.SectorId))?.Name || '') : '';
    
    let netHtml = `<span style="color:var(--text-muted)">0,00</span>`; 
    if (net > 0) netHtml = `<span class="text-red">Borçlu: ${fp(net)}</span>`; 
    if (net < 0) netHtml = `<span class="text-green">Alacaklı: ${fp(Math.abs(net))}</span>`;
    
    let tagsHtml = '';
    if(gName) tagsHtml += `<span class="badge" style="border:1px solid var(--accent); color:var(--accent);">${gName}</span>`;
    if(sName) tagsHtml += `<span class="badge" style="border:1px solid var(--amber); color:var(--amber);">${sName}</span>`;

    list.innerHTML += `<div class="list-item" onclick="editCari('${c.Id}')"><div><div style="font-weight:bold; margin-bottom:4px;">${c.Name}</div><div style="display:flex; gap:4px; margin-bottom:4px;">${tagsHtml}</div></div><div style="text-align:right; font-weight:bold">${netHtml}</div></div>`;
  });

  if (filteredList.length > cariLimit) {
    list.innerHTML += `<button class="btn-outline" style="margin-top:10px; width:100%; padding:0.8rem;" onclick="loadMoreCari()">Daha Fazla Göster (${filteredList.length - cariLimit} Kaldı)</button>`;
  }
}

window.loadMoreCari = function() {
    cariLimit += 20;
    renderCari(true, false);
};

export function openCariModal() {
  $('mc-Id').value = ''; $('mc-Name').value = ''; $('mc-PhoneNumber').value = ''; $('mc-VKN').value = ''; 
  $('mc-IdentityNumber').value = ''; $('mc-Email').value = ''; $('mc-Address').value = ''; $('mc-Balance').value = ''; 
  $('mc-CurrentGroupId').value = ''; $('mc-SectorId').value = '';
  loadGrupSelects();
  $('mc-title').innerText = 'Yeni Cari'; $('mc-del').classList.add('hidden'); $('mc-ekstre').classList.add('hidden'); openM('mo-cari');
}

export function editCari(id) {
  const c = DB.Current.find(x => String(x.Id) === String(id)); if (!c) return; loadGrupSelects();
  $('mc-Id').value = c.Id; $('mc-Name').value = c.Name; $('mc-PhoneNumber').value = c.PhoneNumber || ''; 
  $('mc-VKN').value = c.VKN || ''; $('mc-IdentityNumber').value = c.IdentityNumber || ''; $('mc-Email').value = c.Email || ''; 
  $('mc-Address').value = c.Address || ''; 
  $('mc-CurrentGroupId').value = c.CurrentGroupId || ''; 
  $('mc-SectorId').value = c.SectorId || ''; // Sektörü Doldur
  $('mc-Balance').value = c.Balance ? formatTR(c.Balance) : '';
  
  $('mc-title').innerText = 'Cari Düzenle'; $('mc-del').classList.remove('hidden'); $('mc-ekstre').classList.remove('hidden');
  $('mc-del').onclick = () => { showConfirm(`${c.Name} silinecek?`, () => { softDelete(DB.Current, id); saveDB(); closeM('mo-cari'); renderCari(true); }, '🗑️', 'Sil'); };
  $('mc-ekstre').onclick = () => { closeM('mo-cari'); printEkstre(c.Id); }; openM('mo-cari');
}

export function saveCari() {
  const name = toTitleCaseTR($('mc-Name').value.trim()); if (!name) return showToast('Ad zorunlu!'); 
  const id = $('mc-Id').value;
  
  const data = { 
    Name: name, 
    CurrentGroupId: $('mc-CurrentGroupId').value || null, 
    SectorId: $('mc-SectorId').value || null, // Sektörü Kaydet
    PhoneNumber: $('mc-PhoneNumber').value, 
    VKN: $('mc-VKN').value, 
    IdentityNumber: $('mc-IdentityNumber').value,
    Email: $('mc-Email').value.trim().toLowerCase(), 
    Address: toTitleCaseTR($('mc-Address').value.trim()), 
    Balance: parseRawTR($('mc-Balance').value) 
  };
  
  if (id) Object.assign(DB.Current.find(x => String(x.Id) === String(id)), data, { UpdatedDate: tsNow(), UpdatedUser: getCihazAdi() });
  else DB.Current.push({ Id: guid(), ...data, CreatedDate: tsNow(), CreatedUser: getCihazAdi(), Deleted: false });
  saveDB(); closeM('mo-cari'); renderCari(true);
}