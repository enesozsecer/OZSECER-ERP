import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, fd, showToast, openM, closeM, showConfirm, showSpinner, hideSpinner, showCustomAlert, updateSpinner, getCihazAdi } from '../core/utils.js';
import { renderHome } from './home.js';

export function exportDB() {
  const data = JSON.stringify(DB); const blob = new Blob([data], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `OzToptan_Yedek_${tsNow().replace(/[: ]/g, '_')}.json`; a.click(); URL.revokeObjectURL(url); showToast("Veriler cihaza indirildi.");
}

export let tokenClient; export let driveAccessToken = null; export let lastUsedClientId = null; export let currentDriveFolderId = null; export let currentDriveFileName = null;
const DRIVE_FILE_NAME = 'ozsecer_erp_data.json'; // Gerektiğinde fallback

export function openSyncModal() {
  $('sync-client-id').value = localStorage.getItem('ozsecer_client_id') || ''; $('sync-folder-id').value = localStorage.getItem('ozsecer_folder_id') || '';
  $('sync-step-1').classList.remove('hidden'); $('sync-step-2').classList.add('hidden'); $('sync-new-file').value = ''; openM('mo-sync-config');
}

export function connectAndFetchFiles() {
  const cId = $('sync-client-id').value.trim(); const fId = $('sync-folder-id').value.trim();
  if (!cId || !fId) return showToast('Lütfen tüm alanları doldurun!');
  localStorage.setItem('ozsecer_client_id', cId); localStorage.setItem('ozsecer_folder_id', fId);
  showSpinner("Drive'a bağlanılıyor...");
  try {
    if (cId !== lastUsedClientId || fId !== currentDriveFolderId) { driveAccessToken = null; lastUsedClientId = cId; currentDriveFolderId = fId; }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (response) => {
        if (response.error) { hideSpinner(); driveAccessToken = null; return showCustomAlert("İptal Edildi!\n" + response.error, false); }
        driveAccessToken = response.access_token; await fetchFileListFromDrive();
      },
      error_callback: (err) => { hideSpinner(); driveAccessToken = null; showCustomAlert("Bağlantı Kurulamadı!", false); }
    });
    if (!driveAccessToken) { tokenClient.requestAccessToken({ prompt: 'select_account consent' }); } else { fetchFileListFromDrive(); }
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export async function fetchFileListFromDrive() {
  try {
    const query = encodeURIComponent(`'${currentDriveFolderId}' in parents and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers: { 'Authorization': `Bearer ${driveAccessToken}` } });
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error("Klasör bulunamadı.");
    const select = $('sync-file-select'); select.innerHTML = ''; let hasFiles = false;
    if (searchData.files && searchData.files.length > 0) {
      const files = searchData.files.filter(f => f.name.endsWith('.json'));
      if (files.length > 0) {
        hasFiles = true; files.forEach(file => { select.innerHTML += `<option value="${file.name}">${file.name}</option>`; });
        const savedFile = localStorage.getItem('ozsecer_file_name'); if (savedFile) select.value = savedFile;
      }
    }
    if (!hasFiles) { select.innerHTML = `<option value="">-- Yedek yok --</option>`; $('sync-mode-new').checked = true; $('sync-mode-update').disabled = true; toggleSyncMode(); } 
    else { $('sync-mode-update').checked = true; $('sync-mode-update').disabled = false; toggleSyncMode(); }
    hideSpinner(); $('sync-step-1').classList.add('hidden'); $('sync-step-2').classList.remove('hidden');
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function startSyncWithSelectedFile() {
  const isNewMode = $('sync-mode-new').checked; let targetFile = '';
  if (isNewMode) { targetFile = $('sync-new-file').value.trim(); if (!targetFile) return showToast("Dosya ismi yazın!"); } 
  else { targetFile = $('sync-file-select').value; if (!targetFile) return showToast("Mevcut dosyayı seçin!"); }
  if (!targetFile.endsWith('.json')) targetFile += '.json';
  localStorage.setItem('ozsecer_file_name', targetFile); currentDriveFileName = targetFile;
  closeM('mo-sync-config'); executePullMergePush();
}

export function toggleSyncMode() {
  if ($('sync-mode-new').checked) { $('sync-update-container').classList.add('hidden'); $('sync-new-container').classList.remove('hidden'); } 
  else { $('sync-update-container').classList.remove('hidden'); $('sync-new-container').classList.add('hidden'); }
}

export async function executePullMergePush() {
  const fId = currentDriveFolderId || localStorage.getItem('ozsecer_folder_id'); const fileName = currentDriveFileName || localStorage.getItem('ozsecer_file_name');
  if (!fId || !fileName) return showCustomAlert("Klasör veya Dosya ID eksik!", false);
  showSpinner("Eşitleme başladı...");
  try {
    const query = encodeURIComponent(`'${fId}' in parents and name='${fileName}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, { headers: { 'Authorization': `Bearer ${driveAccessToken}` } });
    const searchData = await searchRes.json();
    let fileId = null; let remoteDB = null;
    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id; updateSpinner("Buluttan çekiliyor...");
      const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, { headers: { 'Authorization': `Bearer ${driveAccessToken}` } });
      remoteDB = await getRes.json();
    }
    if (remoteDB) { updateSpinner("Birleştiriliyor..."); mergeDatabases(remoteDB); }
    updateSpinner("Buluta yazılıyor..."); const pushData = JSON.stringify(DB);
    if (fileId) {
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${driveAccessToken}`, 'Content-Type': 'application/json' }, body: pushData });
      if (!patchRes.ok) throw new Error("Güncelleme başarısız.");
    } else {
      const metadata = { name: fileName, parents: [fId] }; const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' })); form.append('file', new Blob([pushData], { type: 'application/json' }));
      const postRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': `Bearer ${driveAccessToken}` }, body: form });
      if (!postRes.ok) throw new Error("Yeni dosya başarısız.");
    }
    saveDB(); renderHome(); hideSpinner(); showCustomAlert(`Başarıyla eşitlendi!`, true);
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function mergeDatabases(remoteDB) {
  if (!remoteDB) return;
  const collections = ['c', 'u', 's', 't', 'g', 'ug', 'k'];
  function parseTRDate(str) {
    if (!str) return 0; if (str.includes('T')) return new Date(str).getTime();
    const parts = str.split(' '); if (parts.length !== 2) return 0;
    const d = parts[0].split('.'); const t = parts[1].split(':'); if (d.length !== 3 || t.length !== 3) return 0;
    return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]).getTime();
  }
  function getLastMod(item) {
    if (item.silinmeTarihi) return parseTRDate(item.silinmeTarihi);
    if (item.guncellenmeTarihi) return parseTRDate(item.guncellenmeTarihi);
    if (item.olusturmaTarihi) return parseTRDate(item.olusturmaTarihi); return 0;
  }
  function mergeOrderItems(localItems, remoteItems) {
    const itemMap = new Map(); localItems.forEach(it => itemMap.set(String(it.id), it));
    remoteItems.forEach(remoteIt => {
      const rId = String(remoteIt.id);
      if (itemMap.has(rId)) { const localIt = itemMap.get(rId); if (getLastMod(remoteIt) > getLastMod(localIt)) Object.assign(localIt, remoteIt); } 
      else { localItems.push(remoteIt); }
    });
    return localItems;
  }
  collections.forEach(col => {
    if (!remoteDB[col]) return; if (!DB[col]) DB[col] = [];
    const localMap = new Map(); DB[col].forEach(item => localMap.set(String(item.id), item));
    remoteDB[col].forEach(remoteItem => {
      const id = String(remoteItem.id);
      if (localMap.has(id)) {
        const localItem = localMap.get(id);
        if (col === 's') { const mergedItems = mergeOrderItems(localItem.items || [], remoteItem.items || []); if (getLastMod(remoteItem) > getLastMod(localItem)) Object.assign(localItem, remoteItem); localItem.items = mergedItems; } 
        else { if (getLastMod(remoteItem) > getLastMod(localItem)) Object.assign(localItem, remoteItem); }
      } else { DB[col].push(remoteItem); }
    });
  });
}

export let currentResetTarget = '';
export function openResetAuthModal(target) { currentResetTarget = target; $('reset-user').value = ''; $('reset-pass').value = ''; $('reset-user').setAttribute('readonly', 'readonly'); $('reset-pass').setAttribute('readonly', 'readonly'); openM('mo-reset-auth'); }

export function openDriveResetClientModal() { $('reset-client-id-input').value = localStorage.getItem('ozsecer_client_id') || ''; $('reset-folder-id-input').value = localStorage.getItem('ozsecer_folder_id') || ''; $('reset-step-1').classList.remove('hidden'); $('reset-step-2').classList.add('hidden'); openM('mo-reset-client'); }

export function verifyClientForReset() {
  const cId = $('reset-client-id-input').value.trim(); const fId = $('reset-folder-id-input').value.trim();
  if (!cId || !fId) return showToast('Tüm alanları doldurunuz!');
  localStorage.setItem('ozsecer_client_id', cId); localStorage.setItem('ozsecer_folder_id', fId); showSpinner("Google kimliği doğrulanıyor...");
  try {
    if (cId !== lastUsedClientId || fId !== currentDriveFolderId) { driveAccessToken = null; lastUsedClientId = cId; currentDriveFolderId = fId; }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId, scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (response) => { if (response.error) { hideSpinner(); driveAccessToken = null; return showCustomAlert("İşlem İptal Edildi!", false); } driveAccessToken = response.access_token; await fetchFileListForReset(); },
      error_callback: () => { hideSpinner(); driveAccessToken = null; showCustomAlert("Bağlantı kurulamadı!", false); }
    });
    if (!driveAccessToken) { tokenClient.requestAccessToken({ prompt: 'select_account consent' }); } else { fetchFileListForReset(); }
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export async function fetchFileListForReset() {
  try {
    const query = encodeURIComponent(`'${currentDriveFolderId}' in parents and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers: { 'Authorization': `Bearer ${driveAccessToken}` } });
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error("Klasör bulunamadı.");
    const select = $('reset-file-select'); select.innerHTML = '';
    if (searchData.files && searchData.files.length > 0) {
      const files = searchData.files.filter(f => f.name.endsWith('.json'));
      if (files.length === 0) select.innerHTML = `<option value="">-- Yedek yok --</option>`; else files.forEach(file => { select.innerHTML += `<option value="${file.name}">${file.name}</option>`; });
    } else { select.innerHTML = `<option value="">-- Boş --</option>`; }
    hideSpinner(); $('reset-step-1').classList.add('hidden'); $('reset-step-2').classList.remove('hidden');
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function startResetWithSelectedFile() {
  const targetFile = $('reset-file-select').value; if (!targetFile) return showToast("Dosya seçin!");
  currentDriveFileName = targetFile; closeM('mo-reset-client'); openResetAuthModal('drive');
}

export function confirmResetAuth() {
  const u = $('reset-user').value.trim(); const p = $('reset-pass').value.trim();
  if (u !== 'oztoptantedarik' || p !== 'Oztoptan6595.') return showToast('❌ Hatalı kullanıcı adı veya şifre!');
  closeM('mo-reset-auth');
  if (currentResetTarget === 'local') { if (confirm("⚠️ TÜM VERİLER silinecek?")) { DB.c = []; DB.u = []; DB.s = []; DB.t = []; DB.g = []; DB.ug = []; DB.k = []; saveDB(); renderHome(); showCustomAlert("Sıfırlandı!", true); } } 
  else if (currentResetTarget === 'drive') { if (confirm("🚨 DRIVE YEDEKLERİ silinecek?")) { executeDriveReset(); } }
}

export async function executeDriveReset() {
  const fId = currentDriveFolderId || localStorage.getItem('ozsecer_folder_id'); const fileName = currentDriveFileName;
  if (!fId || !fileName) return showCustomAlert("Hata!", false);
  showSpinner("Sıfırlanıyor...");
  try {
    const emptyDB = { c: [], u: [], s: [], t: [], g: [], ug: [], k: [] }; const pushData = JSON.stringify(emptyDB);
    const query = encodeURIComponent(`'${fId}' in parents and name='${fileName}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, { headers: { 'Authorization': `Bearer ${driveAccessToken}` } });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${driveAccessToken}`, 'Content-Type': 'application/json' }, body: pushData });
      if (!patchRes.ok) throw new Error("Sıfırlanamadı.");
    } else { throw new Error("Dosya bulunamadı."); }
    hideSpinner(); showCustomAlert(`Başarıyla sıfırlandı!`, true);
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function openExcelExportModal() { openM('mo-excel-export'); }

export function downloadExcel(withData) {
  closeM('mo-excel-export'); showSpinner(withData ? "Dönüştürülüyor..." : "Şablon hazırlanıyor...");
  try {
    const wb = window.XLSX.utils.book_new();
    const sheetsInfo = {
      'CariGrup': { db: DB.g, headers: ['id', 'ad'] },
      'UrunGrup': { db: DB.ug, headers: ['id', 'ad'] },
      'Cari': { db: DB.c, headers: ['id', 'ad', 'telefon', 'eposta', 'adres', 'grupId', 'bakiye'] },
      'Urun': { db: DB.u, headers: ['id', 'ad', 'barkod', 'urunGrupId', 'alisFiyat', 'satisFiyat', 'birim', 'desc'] },
      'Siparis': { db: DB.s, headers: ['id', 'tarih', 'cariId', 'tur', 'toplam', 'durum', 'aciklama'] },
      'SiparisDetay': { db: null, headers: ['id', 'siparisId', 'urunId', 'miktar', 'fiyat', 'toplam'] },
      'Kasa': { db: DB.t, headers: ['id', 'tarih', 'cariId', 'tur', 'tutar', 'aciklama'] },
      'Kampanya': { db: DB.k, headers: ['id', 'ad', 'indirimOrani', 'baslangic', 'bitis'] }
    };
    let siparisDetayData = [];
    if (withData && DB.s) {
      DB.s.filter(x => !x.silindi).forEach(sip => {
        const kalemler = sip.kalemler || sip.items || [];
        kalemler.forEach(k => { siparisDetayData.push({ id: k.id || guid(), siparisId: sip.id, urunId: k.urunId, miktar: k.miktar, fiyat: k.fiyat, toplam: k.toplam }); });
      });
    }
    sheetsInfo['SiparisDetay'].db = siparisDetayData;

    function addSheet(sheetName, info) {
      let wsData = [info.headers];
      if (withData && info.db && Array.isArray(info.db)) {
        const activeData = sheetName === 'SiparisDetay' ? info.db : info.db.filter(x => !x.silindi);
        activeData.forEach(item => { let row = []; info.headers.forEach(h => { row.push(item[h] !== undefined && item[h] !== null ? item[h] : ''); }); wsData.push(row); });
      }
      const ws = window.XLSX.utils.aoa_to_sheet(wsData); window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    Object.keys(sheetsInfo).forEach(sheetName => addSheet(sheetName, sheetsInfo[sheetName]));
    const dateStr = new Date().toISOString().slice(0, 10);
    window.XLSX.writeFile(wb, withData ? `OZSECER_ERP_Yedek_${dateStr}.xlsx` : `OZSECER_ERP_Bos_Sablon.xlsx`);
    hideSpinner(); showToast("Excel başarıyla indirildi!");
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function handleExcelImport(event) {
  const file = event.target.files[0]; if (!file) return;
  showSpinner("Excel okunuyor...");
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result); const workbook = window.XLSX.read(data, { type: 'array' });
      let eklendi = 0, guncellendi = 0;
      workbook.SheetNames.forEach(sheetName => {
        const rows = window.XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" }); if (rows.length === 0) return;
        let targetDB = null;
        if (sheetName === 'CariGrup') targetDB = DB.g; else if (sheetName === 'UrunGrup') targetDB = DB.ug; else if (sheetName === 'Cari') targetDB = DB.c; else if (sheetName === 'Urun') targetDB = DB.u; else if (sheetName === 'Siparis') targetDB = DB.s; else if (sheetName === 'Kasa') targetDB = DB.t; else if (sheetName === 'Kampanya') targetDB = DB.k; else if (sheetName === 'SiparisDetay') targetDB = 'SIP_DETAY';

        if (targetDB && targetDB !== 'SIP_DETAY') {
          rows.forEach(row => {
            if (!row.ad && !row.tarih) return; 
            const rowId = row.id ? String(row.id).trim() : '';
            if (rowId !== '') {
              const existing = targetDB.find(x => x.id === rowId);
              if (existing) { Object.keys(row).forEach(key => { if (key !== 'id') existing[key] = row[key]; }); existing.guncellenmeTarihi = tsNow(); existing.silindi = false; guncellendi++; } 
              else { row.olusturmaTarihi = tsNow(); row.guncellenmeTarihi = tsNow(); row.silindi = false; targetDB.push(row); eklendi++; }
            } else { row.id = guid(); row.olusturmaTarihi = tsNow(); row.guncellenmeTarihi = tsNow(); row.silindi = false; targetDB.push(row); eklendi++; }
          });
        } else if (targetDB === 'SIP_DETAY') {
          rows.forEach(row => {
            if (!row.siparisId || !row.urunId) return;
            const anaSiparis = DB.s.find(x => x.id === String(row.siparisId).trim());
            if (anaSiparis) {
              if (!anaSiparis.kalemler) anaSiparis.kalemler = [];
              const rowId = row.id ? String(row.id).trim() : ''; const exKalem = anaSiparis.kalemler.find(k => k.id === rowId);
              if (exKalem) { Object.keys(row).forEach(k => { if (k !== 'id' && k !== 'siparisId') exKalem[k] = row[k]; }); guncellendi++; } 
              else { row.id = guid(); anaSiparis.kalemler.push(row); eklendi++; }
              anaSiparis.guncellenmeTarihi = tsNow();
            }
          });
        }
      });
      saveDB(); renderHome(); hideSpinner(); showCustomAlert(`Aktarım Başarılı!\nYeni Eklenen: ${eklendi}\nGüncellenen: ${guncellendi}`, true);
    } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}