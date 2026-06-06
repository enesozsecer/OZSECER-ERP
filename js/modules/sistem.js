import { DB, saveDB } from '../core/db.js';
import { $, guid, tsNow, showToast, openM, closeM, showConfirm, showSpinner, hideSpinner, showCustomAlert, updateSpinner, getCihazAdi } from '../core/utils.js';

export let tokenClient;
export let driveAccessToken = null;
export let lastUsedClientId = null;
export let currentDriveFolderId = null;
export let currentDriveFileName = null;

export function exportDB() {
  const data = JSON.stringify(DB);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `OzToptan_Yedek.json`; a.click(); URL.revokeObjectURL(url);
}

export function openSyncModal() {
  $('sync-client-id').value = localStorage.getItem('ozsecer_client_id') || '';
  $('sync-folder-id').value = localStorage.getItem('ozsecer_folder_id') || '';
  $('sync-step-1').classList.remove('hidden'); $('sync-step-2').classList.add('hidden'); $('sync-new-file').value = ''; openM('mo-sync-config');
}

export function connectAndFetchFiles() {
  const cId = $('sync-client-id').value.trim(); const fId = $('sync-folder-id').value.trim();
  if (!cId || !fId) return showToast('Lütfen tüm alanları doldurun!');

  localStorage.setItem('ozsecer_client_id', cId); localStorage.setItem('ozsecer_folder_id', fId); showSpinner("Drive'a bağlanılıyor...");

  try {
    if (cId !== lastUsedClientId || fId !== currentDriveFolderId) { driveAccessToken = null; lastUsedClientId = cId; currentDriveFolderId = fId; }

    // HESAP SEÇİM KURALI (prompt) BURAYA EKLENDİ (MOBİL OS EZEMEZ)
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: 'select_account',
      callback: async (response) => {
        if (response.error) { hideSpinner(); driveAccessToken = null; return showCustomAlert("İptal Edildi!\n" + response.error, false); }
        driveAccessToken = response.access_token; await fetchFileListFromDrive();
      },
      error_callback: (err) => { hideSpinner(); driveAccessToken = null; showCustomAlert("Bağlantı Kurulamadı!", false); }
    });

    if (!driveAccessToken) {
      // Parametre initTokenClient'tan alındığı için burası boş bırakıldı
      tokenClient.requestAccessToken();
    } else { fetchFileListFromDrive(); }
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
    saveDB(); hideSpinner(); window.location.reload();
  } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
}

export function mergeDatabases(remoteDB) {
  if (!remoteDB) return;
  const collections = ['Current', 'Product', 'Order', 'OrderItem', 'Payment', 'CurrentGroup', 'ProductGroup', 'Category', 'Brand', 'Offer', 'OfferItem', 'Sector'];
  function getLastMod(item) {
    if (item.DeletedDate) return new Date(item.DeletedDate).getTime();
    if (item.UpdatedDate) return new Date(item.UpdatedDate).getTime();
    if (item.CreatedDate) return new Date(item.CreatedDate).getTime();
    return 0;
  }
  collections.forEach(col => {
    if (!remoteDB[col]) return; if (!DB[col]) DB[col] = [];
    const localMap = new Map(); DB[col].forEach(item => localMap.set(String(item.Id), item));
    remoteDB[col].forEach(remoteItem => {
      const id = String(remoteItem.Id);
      if (localMap.has(id)) {
        const localItem = localMap.get(id);
        if (getLastMod(remoteItem) > getLastMod(localItem)) Object.assign(localItem, remoteItem);
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

    // HESAP SEÇİM KURALI BURAYA DA EKLENDİ
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: 'select_account',
      callback: async (response) => { if (response.error) { hideSpinner(); driveAccessToken = null; return showCustomAlert("İşlem İptal Edildi!", false); } driveAccessToken = response.access_token; await fetchFileListForReset(); },
      error_callback: () => { hideSpinner(); driveAccessToken = null; showCustomAlert("Bağlantı kurulamadı!", false); }
    });
    if (!driveAccessToken) { tokenClient.requestAccessToken(); } else { fetchFileListForReset(); }
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
const ADMIN_USER_HASH = '$2a$12$s8NV9XgVcqK3HRwio.FoS.2TnJYBNzVkinmDYfuSrxCTBbTKWCxkm';
const ADMIN_PASS_HASH = '$2a$10$1PFl6c.YxZdHOnUlydJP7.p9erQtaybRySWBuNBSt/fpDezHb9NZy';

export function confirmResetAuth() {
  const u = $('reset-user').value.trim(); const p = $('reset-pass').value.trim();
  const bcrypt = window.dcodeIO ? window.dcodeIO.bcrypt : window.bcrypt;

  // 1. Düz metin olarak girilen E-Posta, kayıtlı Bcrypt Hash ile eşleşiyor mu?
  const isUserValid = bcrypt.compareSync(u, ADMIN_USER_HASH);
  // 2. Düz metin olarak girilen Şifre, kayıtlı Bcrypt Hash ile eşleşiyor mu?
  const isPassValid = bcrypt.compareSync(p, ADMIN_PASS_HASH);
  if (!isUserValid || !isPassValid) return showToast('❌ Hatalı kullanıcı adı veya şifre!');
  closeM('mo-reset-auth');
  if (currentResetTarget === 'local') { if (confirm("⚠️ TÜM VERİLER silinecek?")) { DB.Current = []; DB.Product = []; DB.Order = []; DB.OrderItem = []; DB.Payment = []; DB.CurrentGroup = []; DB.ProductGroup = []; DB.Category = []; DB.Brand = []; DB.Offer = []; DB.OfferItem = []; DB.Sector = []; saveDB(); window.location.reload(); } }
  else if (currentResetTarget === 'drive') { if (confirm("🚨 DRIVE YEDEKLERİ silinecek?")) { executeDriveReset(); } }
}

export async function executeDriveReset() {
  const fId = currentDriveFolderId || localStorage.getItem('ozsecer_folder_id'); const fileName = currentDriveFileName;
  if (!fId || !fileName) return showCustomAlert("Hata!", false);
  showSpinner("Sıfırlanıyor...");
  try {
    const emptyDB = { Current: [], Product: [], Order: [], OrderItem: [], Payment: [], CurrentGroup: [], ProductGroup: [], Category: [], Brand: [], Offer: [], OfferItem: [], Sector: [] }; const pushData = JSON.stringify(emptyDB);
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
      'CurrentGroup': { db: DB.CurrentGroup, headers: ['Id', 'Name', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Sector': { db: DB.Sector, headers: ['Id', 'Name', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'ProductGroup': { db: DB.ProductGroup, headers: ['Id', 'Name', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Category': { db: DB.Category, headers: ['Id', 'Name', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Brand': { db: DB.Brand, headers: ['Id', 'Name', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Current': { db: DB.Current, headers: ['Id', 'Name', 'CurrentGroupId', 'SectorId', 'PhoneNumber', 'Email', 'VKN', 'IdentityNumber', 'Address', 'Balance', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Product': { db: DB.Product, headers: ['Id', 'Name', 'ProductGroupId', 'CategoryId', 'BrandId', 'BarCode', 'UnitId', 'StockQuantity', 'PurchasePrice', 'SalePrice', 'PicturePath', 'Description', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Order': { db: DB.Order, headers: ['Id', 'Code', 'OrderTypeId', 'CurrentId', 'Description', 'OrderDate', 'SubTotalPrice', 'TotalPrice', 'DisCount', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'OrderItem': { db: DB.OrderItem, headers: ['Id', 'OrderId', 'ProductId', 'Amount', 'UnitId', 'UnitPrice', 'TotalPrice', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Payment': { db: DB.Payment, headers: ['Id', 'PaymentTypeId', 'CurrentId', 'PaymentDate', 'Description', 'Payment', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'Offer': { db: DB.Offer, headers: ['Id', 'Name', 'Description', 'OfferDate', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] },
      'OfferItem': { db: DB.OfferItem, headers: ['Id', 'OfferId', 'ProductId', 'Price', 'DiscountRate', 'SalePrice', 'Deleted', 'CreatedDate', 'UpdatedDate', 'DeletedDate', 'CreatedUser', 'UpdatedUser', 'DeletedUser'] }
    };

    function addSheet(sheetName, info) {
      let wsData = [info.headers];
      if (withData && info.db && Array.isArray(info.db)) {
        
        // .filter(x => !x.Deleted) filtresi kaldırıldı! 
        // Böylece silinen (true) datalar da Excel satırlarına eklenecek.
        info.db.forEach(item => { 
          let row = []; 
          info.headers.forEach(h => { 
            let val = item[h] !== undefined && item[h] !== null ? item[h] : ''; 
            if (h === 'PicturePath' && typeof val === 'string' && val.length > 30000) {
              val = '[SİSTEMDE KAYITLI GÖRSEL]';
            }
            row.push(val); 
          }); 
          wsData.push(row); 
        });
        
      }
      const ws = window.XLSX.utils.aoa_to_sheet(wsData); window.XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    Object.keys(sheetsInfo).forEach(sheetName => addSheet(sheetName, sheetsInfo[sheetName]));
    window.XLSX.writeFile(wb, withData ? `OZSECER_ERP_Verili.xlsx` : `OZSECER_ERP_Sablon.xlsx`);
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
        let targetDB = DB[sheetName];

        if (targetDB && Array.isArray(targetDB)) {
          rows.forEach(row => {
            if (Object.keys(row).length < 2) return; // Boş satırları yoksay
            const rowId = row.Id ? String(row.Id).trim() : '';

            // Excel'den gelen "Deleted" (Silindi) durumunu güvenle algıla
            let isDeleted = false;
            if (row.Deleted !== undefined && row.Deleted !== "") {
              isDeleted = String(row.Deleted).toLowerCase() === 'true' || row.Deleted === 1 || row.Deleted === '1';
            }

            if (rowId !== '') {
              const existing = targetDB.find(x => x.Id === rowId);
              if (existing) {
                // ================= GÜNCELLEME İŞLEMİ =================
                let degisiklikVar = false;
                Object.keys(row).forEach(key => {
                  // Audit (Log) verilerinin Excel tarafından ezilmesini kesin olarak yasakla!
                  const protectedKeys = ['Id', 'Deleted', 'CreatedDate', 'CreatedUser', 'UpdatedDate', 'UpdatedUser', 'DeletedDate', 'DeletedUser'];
                  if (!protectedKeys.includes(key)) {
                    if (key === 'PicturePath' && row[key] === '[SİSTEMDE KAYITLI GÖRSEL]') return;
                    if (existing[key] !== row[key]) {
                      existing[key] = row[key];
                      degisiklikVar = true;
                    }
                  }
                });

                // Silinme Durumu Excel'den Tetiklendiyse
                if (isDeleted && !existing.Deleted) {
                  existing.Deleted = true;
                  existing.DeletedDate = tsNow();
                  existing.DeletedUser = getCihazAdi();
                  degisiklikVar = true;
                } else if (!isDeleted && existing.Deleted) {
                  existing.Deleted = false;
                  existing.DeletedDate = '';
                  existing.DeletedUser = '';
                  degisiklikVar = true;
                }

                // Herhangi bir veri değiştiyse Update loglarını bas
                if (degisiklikVar) {
                  existing.UpdatedDate = tsNow();
                  existing.UpdatedUser = getCihazAdi();
                  guncellendi++;
                }
              }
              else {
                // ================= YENİ KAYIT (ID Var ama DB'de Yok) =================
                if (row.PicturePath === '[SİSTEMDE KAYITLI GÖRSEL]') row.PicturePath = '';
                row.Deleted = isDeleted;
                row.CreatedDate = tsNow();
                row.CreatedUser = getCihazAdi();
                row.UpdatedDate = tsNow();
                row.UpdatedUser = getCihazAdi();
                if (isDeleted) { row.DeletedDate = tsNow(); row.DeletedUser = getCihazAdi(); } else { row.DeletedDate = ''; row.DeletedUser = ''; }
                targetDB.push(row); eklendi++;
              }
            } else {
              // ================= YENİ KAYIT (Yepyeni Satır) =================
              if (row.PicturePath === '[SİSTEMDE KAYITLI GÖRSEL]') row.PicturePath = '';
              row.Id = guid();
              row.Deleted = isDeleted;
              row.CreatedDate = tsNow();
              row.CreatedUser = getCihazAdi();
              row.UpdatedDate = tsNow();
              row.UpdatedUser = getCihazAdi();
              if (isDeleted) { row.DeletedDate = tsNow(); row.DeletedUser = getCihazAdi(); } else { row.DeletedDate = ''; row.DeletedUser = ''; }
              targetDB.push(row); eklendi++;
            }
          });
        }
      });
      saveDB(); window.location.reload();
    } catch (err) { hideSpinner(); showCustomAlert(err.message, false); }
    event.target.value = '';
  };
  reader.readAsArrayBuffer(file);
}