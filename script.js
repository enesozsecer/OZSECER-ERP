
// --- ENUMS & YARDIMCI FONKSİYONLAR ---
const ISLEM = { ALIS: 1, SATIS: 2 };
const KASA = { TAHSILAT: 1, ODEME: 2 };
const BIRIM = { 1: 'Ad', 2: 'Kg', 3: 'Gr', 4: 'Lt', 5: 'Mt', 6: 'Pk', 7: 'Koli' };

function getBirimAd(val) { return BIRIM[val] || val || 'Ad'; }
function $(id) { return document.getElementById(id); }
function guid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function pad(n) { return n < 10 ? '0' + n : n; }
function tsNow() {
  const d = new Date();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function dtNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dtFormat(v) {
  if (!v) return '';
  const [date, time] = v.split('T');
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y} ${time || ''}`;
}
function fd(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x)) return d;
  return `${pad(x.getDate())}.${pad(x.getMonth() + 1)}.${x.getFullYear()}`;
}
function fp(v) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(v || 0);
}
function showToast(msg) {
  const t = $('toast');
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 2000);
}
function getCihazAdi() { return localStorage.getItem('ozsecer_cihaz') || 'Mobil Cihaz'; }
function softDelete(arr, id) {
  const i = arr.findIndex(x => String(x.id) === String(id));
  if (i > -1) Object.assign(arr[i], { silindi: true, silinmeTarihi: tsNow(), silen: getCihazAdi() });
}

// --- VERİTABANI ---
let DB = { c: [], u: [], s: [], t: [], g: [], ug: [], k: [] }; // k eklendi
function loadDB() {
  try { DB.c = JSON.parse(localStorage.getItem('e3_c')) || []; } catch (e) { DB.c = []; }
  try { DB.u = JSON.parse(localStorage.getItem('e3_u')) || []; } catch (e) { DB.u = []; }
  try { DB.s = JSON.parse(localStorage.getItem('e3_s')) || []; } catch (e) { DB.s = []; }
  try { DB.t = JSON.parse(localStorage.getItem('e3_t')) || []; } catch (e) { DB.t = []; }
  try { DB.g = JSON.parse(localStorage.getItem('e3_g')) || []; } catch (e) { DB.g = []; }
  try { DB.ug = JSON.parse(localStorage.getItem('e3_ug')) || []; } catch (e) { DB.ug = []; }
  try { DB.k = JSON.parse(localStorage.getItem('e3_k')) || []; } catch (e) { DB.k = []; }
}
function saveDB() {
  localStorage.setItem('e3_c', JSON.stringify(DB.c));
  localStorage.setItem('e3_u', JSON.stringify(DB.u));
  localStorage.setItem('e3_s', JSON.stringify(DB.s));
  localStorage.setItem('e3_t', JSON.stringify(DB.t));
  localStorage.setItem('e3_g', JSON.stringify(DB.g));
  localStorage.setItem('e3_ug', JSON.stringify(DB.ug));
  localStorage.setItem('e3_k', JSON.stringify(DB.k));
}

// --- HESAPLAMALAR ---
function calcNet(cariId) {
  let net = 0;
  DB.s.filter(x => !x.silindi && String(x.cariId) === String(cariId)).forEach(x => {
    if (Number(x.tur) === ISLEM.SATIS) net += Number(x.toplam || 0);
    if (Number(x.tur) === ISLEM.ALIS) net -= Number(x.toplam || 0);
  });
  DB.t.filter(x => !x.silindi && String(x.cariId) === String(cariId)).forEach(x => {
    if (Number(x.tur) === KASA.TAHSILAT) net -= Number(x.tutar || 0);
    if (Number(x.tur) === KASA.ODEME) net += Number(x.tutar || 0);
  });
  return net;
}
function updateStok(urunId, miktar, isAlis, isEkleme) {
  const u = DB.u.find(x => String(x.id) === String(urunId));
  if (!u) return;
  let carp = isAlis ? 1 : -1;
  if (!isEkleme) carp *= -1;
  u.stok = (Number(u.stok) || 0) + (Number(miktar) * carp);
}

// --- AUTH ---
function checkAuth() {
  if (localStorage.getItem('ozsecer_loggedin') === '1') {
    $('login-screen').classList.add('hidden');
    $('app-container').classList.remove('hidden');
    initApp();
  } else {
    if (localStorage.getItem('ozsecer_remember') === '1') {
      $('log-remember').checked = true;
      $('log-pass').value = atob(localStorage.getItem('ozsecer_pass') || '');
    }
  }
}
function login() {
  const p = $('log-pass').value;
  if (p === 'Oztoptan6595.') {
    localStorage.setItem('ozsecer_loggedin', '1');
    if ($('log-remember').checked) {
      localStorage.setItem('ozsecer_remember', '1');
      localStorage.setItem('ozsecer_pass', btoa(p));
    } else {
      localStorage.removeItem('ozsecer_remember');
      localStorage.removeItem('ozsecer_pass');
    }
    $('login-screen').classList.add('hidden');
    $('app-container').classList.remove('hidden');
    initApp();
  } else {
    $('log-err').classList.remove('hidden');
  }
}
function logoutConfirm() {
  showConfirm("Oturumu kapatmak istediğinizden emin misiniz?", () => {
    localStorage.removeItem('ozsecer_loggedin');
    window.location.reload();
  }, '🚪', 'Çıkış');
}
function togglePass() {
  const p = $('log-pass');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('log-toggle').innerHTML = p.type === 'password' ? '👁️' : '🙈';
}

// --- NAVIGATION & UI ---
let currentView = 'home';
function toggleTheme() {
  const html = document.documentElement;
  const t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', t);
  localStorage.setItem('e3_theme', t);
  $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
}
function goTo(view) {
  currentView = view;

  // Tüm sayfaları ve aktif butonları temizle
  document.querySelectorAll('.view').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));

  // 1. Hedef sayfayı bulursa görünür yap
  const targetView = $(`view-${view}`);
  if (targetView) targetView.classList.remove('hidden');

  // 2. Alt menüde butonu varsa aktif yap (Hatanın çözüldüğü kısım!)
  const targetNav = $(`nav-${view}`);
  if (targetNav) targetNav.classList.add('active');

  // Üst başlıkları ayarla
  const titles = { home: 'Ana Sayfa', cari: 'Cari Hesaplar', urun: 'Ürünler', sip: 'Siparişler', kasa: 'Kasa', analiz: 'Analiz', ayarlar: 'Sistem Yönetimi' };
  const topTitle = $('top-title');
  if (topTitle) topTitle.innerText = titles[view] || 'OZSECER';

  // Ekleme (+) butonunu sayfalara göre göster/gizle
  const fab = $('main-fab');
  if (fab) {
    if (['cari', 'urun', 'sip', 'kasa'].includes(view)) { fab.style.display = 'flex'; }
    else { fab.style.display = 'none'; }
  }

  // Listeleri otomatik ekrana bastır
  if (view === 'home') renderHome();
  if (view === 'cari') $('cari-list').innerHTML = '';
  if (view === 'urun') $('urun-list').innerHTML = '';
  if (view === 'sip') $('sip-list').innerHTML = '';
  if (view === 'kasa') $('kasa-list').innerHTML = '';
  if (view === 'analiz') $('analiz-grid').innerHTML = '';
}

function initApp() {
  const t = localStorage.getItem('e3_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
  if (!localStorage.getItem('ozsecer_cihaz')) localStorage.setItem('ozsecer_cihaz', 'Cihaz_' + Math.floor(Math.random() * 1000));
  loadDB();
  loadGrupSelects();
  loadUrunGrupSelects();
  goTo('home');

  // Tüm dropdownları ve c-select'leri dışarı tıklandığında kapatma
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown-wrap')) {
      document.querySelectorAll('.dropdown-list').forEach(l => l.classList.add('hidden'));
    }
    if (!e.target.closest('.c-select')) {
      document.querySelectorAll('.c-select-menu').forEach(m => m.classList.remove('show'));
    }
  });
}

function openCurrentAddModal() {
  if (currentView === 'cari') openCariModal();
  else if (currentView === 'urun') openUrunModal();
  else if (currentView === 'sip') openSiparisModal();
  else if (currentView === 'kasa') openKasaModal();
}

// --- CUSTOM DROPDOWN SELECT (CARI SEÇİCİLER İÇİN) ---
function toggleCSelect(id, dataSource) {
  const menu = $('csm-' + id);
  const isShown = menu.classList.contains('show');
  document.querySelectorAll('.c-select-menu').forEach(m => m.classList.remove('show'));
  if (!isShown) {
    menu.classList.add('show');
    const inp = $('css-' + id);
    inp.value = '';
    renderCSelectList(id, dataSource, '');
  }
}

function renderCSelectList(id, dataSource, query) {
  const q = query.toLowerCase().trim();
  const list = $('csl-' + id);
  list.innerHTML = '';

  // Filtreler için "Tümü" seçeneği
  if (id.startsWith('filter')) {
    const div = document.createElement('div');
    div.className = 'c-select-item text-muted';
    div.innerText = 'Tümü / Seçimi Temizle';
    div.onclick = (e) => { e.stopPropagation(); selectCItem(id, '', 'Cari Seçiniz...'); };
    list.appendChild(div);
  }

  let res = [];
  if (dataSource === 'c') {
    res = DB.c.filter(x => !x.silindi && (x.ad + " " + (x.vkn || "") + " " + (x.tel || "")).toLowerCase().includes(q));
  }

  res.slice(0, 30).forEach(item => {
    const div = document.createElement('div');
    div.className = 'c-select-item';
    div.innerText = item.ad;
    div.onclick = (e) => { e.stopPropagation(); selectCItem(id, item.id, item.ad); };
    list.appendChild(div);
  });
  if (res.length === 0 && q) {
    list.innerHTML += `<div class="c-select-item text-muted" style="cursor:default">Sonuç bulunamadı.</div>`;
  }
}

function selectCItem(id, val, text) {
  $('csd-' + id).innerText = text;
  $(id).value = val;
  $('csm-' + id).classList.remove('show');
}

// --- MODAL YÖNETİMİ ---
function openM(id) { $(id).classList.add('show'); }
function closeM(id) { $(id).classList.remove('show'); }
function closeOnOutside(e, id) { if (e.target.id === id) closeM(id); }
function showConfirm(msg, cb, icon = '', title = 'Onay') {
  $('conf-title').innerText = icon + ' ' + title;
  $('conf-msg').innerText = msg;
  $('conf-yes').onclick = () => { closeM('mo-confirm'); cb(); };
  openM('mo-confirm');
}

// --- GRUP & CARİ ---
function loadGrupSelects() {
  const selCari = $('mc-grup');
  const selKasaFiltre = $('filter-kasa-grup');
  const selAnFiltre = $('filter-an-grup'); // YENİ

  if (selCari) selCari.innerHTML = '<option value="">Grup Yok</option>';
  if (selKasaFiltre) selKasaFiltre.innerHTML = '<option value="">Tüm Gruplar</option>';
  if (selAnFiltre) selAnFiltre.innerHTML = '<option value="">Tüm Gruplar</option>'; // YENİ

  DB.g.forEach(g => {
    if (selCari) selCari.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selKasaFiltre) selKasaFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selAnFiltre) selAnFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`; // YENİ
  });
}

let tempGruplar = [];

function openGrupModal() {
  // Mevcut grupların derin kopyasını al (kaydetmeden çıkılırsa bozulmasın diye)
  tempGruplar = JSON.parse(JSON.stringify(DB.g));
  $('mg-new-ad').value = '';
  renderGrupList();
  openM('mo-grup');
}

function renderGrupList() {
  const list = $('mg-list');
  list.innerHTML = '';
  if (tempGruplar.length === 0) {
    list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Kayıtlı grup yok.</p>';
    return;
  }
  tempGruplar.forEach((g, idx) => {
    list.innerHTML += `
          <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
            <input type="text" value="${g.ad}" onchange="updateTempGrup(${idx}, this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem;">
            <button class="icon-btn text-red" style="padding:0; font-size:1.2rem;" onclick="deleteTempGrup(${idx})">🗑️</button>
          </div>
        `;
  });
}

function addTempGrup() {
  const ad = $('mg-new-ad').value.trim();
  if (!ad) return showToast("Grup adı girin!");
  tempGruplar.push({ id: guid(), ad: ad });
  $('mg-new-ad').value = '';
  renderGrupList();
}

function updateTempGrup(idx, val) {
  tempGruplar[idx].ad = val.trim();
}

function deleteTempGrup(idx) {
  tempGruplar.splice(idx, 1);
  renderGrupList();
}

function saveGrup() {
  // 1. Silinen grupları tespit et (DB.g'de olup, tempGruplar'da olmayanlar)
  const deletedGroups = DB.g.filter(oldG => !tempGruplar.find(tG => tG.id === oldG.id));

  // 2. Silinen gruplardan herhangi biri bir CARİ tarafından kullanılıyor mu kontrol et
  for (let dg of deletedGroups) {
    const isUsed = DB.c.some(c => !c.silindi && c.grupId === String(dg.id));
    if (isUsed) {
      showToast(`HATA: "${dg.ad}" grubu bir caride kayıtlı olduğu için silinemez!`);
      return; // İşlemi iptal et
    }
  }

  // 3. Sorun yoksa geçici listeyi asıl listeye yaz ve kaydet
  DB.g = JSON.parse(JSON.stringify(tempGruplar));
  saveDB();
  closeM('mo-grup');
  loadGrupSelects();
  renderCari(true); // Cari listesini yenile (isimler değişmiş olabilir)
  showToast("Gruplar başarıyla kaydedildi!");
}

function renderCari(force = false) {
  if (!force) return;
  const q = $('filter-cari-q').value.toLowerCase().trim();
  const f = $('filter-cari-durum').value;
  const list = $('cari-list');
  list.innerHTML = '';

  DB.c.filter(x => !x.silindi).forEach(c => {
    const content = (c.ad + " " + (c.tel || "") + " " + (c.vkn || "") + " " + (c.adres || "")).toLowerCase();
    if (q && !content.includes(q)) return;

    const net = calcNet(c.id);
    if (f === 'alacakli' && net >= 0) return;
    if (f === 'borclu' && net <= 0) return;

    const gName = c.grupId ? (DB.g.find(x => x.id === c.grupId)?.ad || '') : '';
    let netHtml = `<span style="color:var(--text-muted)">0,00</span>`;
    if (net > 0) netHtml = `<span class="text-red">Borçlu: ${fp(net)}</span>`;
    if (net < 0) netHtml = `<span class="text-green">Alacaklı: ${fp(Math.abs(net))}</span>`;

    list.innerHTML += `
          <div class="list-item" onclick="editCari('${c.id}')">
            <div>
              <div style="font-weight:bold">${c.ad} <span style="font-size:0.65rem; color:var(--accent); font-weight:normal; border:1px solid var(--accent); padding:1px 4px; border-radius:4px; margin-left:4px">${gName}</span></div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">${c.tel || '-'} | VKN: ${c.vkn || '-'}</div>
            </div>
            <div style="text-align:right; font-weight:bold">${netHtml}</div>
          </div>
        `;
  });
}

function openCariModal() {
  $('mc-id').value = ''; $('mc-ad').value = ''; $('mc-tel').value = '';
  $('mc-vkn').value = ''; $('mc-adres').value = '';
  loadGrupSelects();
  $('mc-title').innerText = 'Yeni Cari';
  $('mc-del').classList.add('hidden');
  $('mc-ekstre').classList.add('hidden');
  openM('mo-cari');
}

function editCari(id) {
  const c = DB.c.find(x => String(x.id) === String(id));
  if (!c) return;
  loadGrupSelects();
  $('mc-id').value = c.id; $('mc-ad').value = c.ad; $('mc-tel').value = c.tel || '';
  $('mc-vkn').value = c.vkn || ''; $('mc-adres').value = c.adres || '';
  $('mc-grup').value = c.grupId || '';
  $('mc-title').innerText = 'Cari Düzenle';
  $('mc-del').classList.remove('hidden');
  $('mc-ekstre').classList.remove('hidden');

  $('mc-del').onclick = () => {
    showConfirm(`${c.ad} silinecek, emin misiniz?`, () => {
      softDelete(DB.c, id); saveDB(); closeM('mo-cari'); renderCari(true); renderHome();
    }, '🗑️', 'Cari Sil');
  };
  $('mc-ekstre').onclick = () => { closeM('mo-cari'); printEkstre(c.id); };
  openM('mo-cari');
}

function saveCari() {
  const ad = $('mc-ad').value.trim();
  if (!ad) return showToast('Ad zorunlu!');
  const id = $('mc-id').value;
  const data = { ad, grupId: $('mc-grup').value, tel: $('mc-tel').value, vkn: $('mc-vkn').value, adres: $('mc-adres').value };
  if (id) {
    Object.assign(DB.c.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  } else {
    DB.c.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
  }
  saveDB(); closeM('mo-cari'); renderCari(true);
}



// --- ÜRÜN ---
// --- ÜRÜN GRUPLARI & FOTOĞRAF ---
let tempUrunGruplar = [];

function loadUrunGrupSelects() {
  const sel = $('mu-grup');
  const selFiltre = $('filter-urun-grup'); // YENİ

  if (sel) sel.innerHTML = '<option value="">Grup Yok</option>';
  if (selFiltre) selFiltre.innerHTML = '<option value="">Tüm Gruplar</option>'; // YENİ

  DB.ug.forEach(g => {
    if (sel) sel.innerHTML += `<option value="${g.id}">${g.ad}</option>`;
    if (selFiltre) selFiltre.innerHTML += `<option value="${g.id}">${g.ad}</option>`; // YENİ
  });
}

function openUrunGrupModal() {
  tempUrunGruplar = JSON.parse(JSON.stringify(DB.ug));
  $('mug-new-ad').value = '';
  renderUrunGrupList();
  openM('mo-urun-grup');
}

function renderUrunGrupList() {
  const list = $('mug-list');
  list.innerHTML = '';
  if (tempUrunGruplar.length === 0) {
    list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Kayıtlı ürün grubu yok.</p>';
    return;
  }
  tempUrunGruplar.forEach((g, idx) => {
    list.innerHTML += `
          <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:center;">
            <input type="text" value="${g.ad}" onchange="updateTempUrunGrup(${idx}, this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem;">
            <button class="icon-btn text-red" style="padding:0; font-size:1.2rem;" onclick="deleteTempUrunGrup(${idx})">🗑️</button>
          </div>
        `;
  });
}

function addTempUrunGrup() {
  const ad = $('mug-new-ad').value.trim();
  if (!ad) return showToast("Grup adı girin!");
  tempUrunGruplar.push({ id: guid(), ad: ad });
  $('mug-new-ad').value = '';
  renderUrunGrupList();
}

function updateTempUrunGrup(idx, val) { tempUrunGruplar[idx].ad = val.trim(); }
function deleteTempUrunGrup(idx) { tempUrunGruplar.splice(idx, 1); renderUrunGrupList(); }

function saveUrunGrup() {
  const deletedGroups = DB.ug.filter(oldG => !tempUrunGruplar.find(tG => tG.id === oldG.id));
  for (let dg of deletedGroups) {
    const isUsed = DB.u.some(u => !u.silindi && String(u.grupId) === String(dg.id));
    if (isUsed) return showToast(`HATA: "${dg.ad}" grubu bir ürüne bağlı, silinemez!`);
  }
  DB.ug = JSON.parse(JSON.stringify(tempUrunGruplar));
  saveDB(); closeM('mo-urun-grup'); loadUrunGrupSelects(); renderUrun(true);
  showToast("Ürün grupları kaydedildi!");
}

function previewUrunFoto(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    $('mu-foto-preview').src = e.target.result;
    $('mu-foto-preview').style.display = 'block';
  }
  reader.readAsDataURL(file);
}

// --- ÜRÜN İŞLEMLERİ ---
function renderUrun(force = false) {
  if (!force) return;
  const q = $('filter-urun-q').value.toLowerCase().trim();
  const fGrup = $('filter-urun-grup') ? $('filter-urun-grup').value : '';
  const list = $('urun-list');
  list.innerHTML = '';

  DB.u.filter(x => !x.silindi).forEach(u => {
    const content = (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase();
    if (q && !content.includes(q)) return;

    if (fGrup && String(u.grupId) !== String(fGrup)) return;

    const gName = u.grupId ? (DB.ug.find(x => x.id === u.grupId)?.ad || '') : '';
    let stok = Number(u.stok || 0);
    let bClass = stok >= 10 ? 'bg-green' : (stok > 0 ? 'bg-amber' : 'bg-red');

    list.innerHTML += `
          <div class="list-item" onclick="editUrun('${u.id}')">
            <div>
              <div style="font-weight:bold">${u.ad} <span style="font-size:0.65rem; color:var(--accent); font-weight:normal; border:1px solid var(--accent); padding:1px 4px; border-radius:4px; margin-left:4px; display:${gName ? 'inline-block' : 'none'}">${gName}</span></div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px">Barkod: ${u.barkod || '-'}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:bold; color:var(--accent)">${fp(u.satisFiyat)}</div>
              <span class="badge ${bClass}">${stok} ${getBirimAd(u.birim)}</span>
            </div>
          </div>
        `;
  });
}

function openUrunModal() {
  $('mu-id').value = ''; $('mu-ad').value = ''; $('mu-barkod').value = '';
  $('mu-alis').value = ''; $('mu-satis').value = ''; $('mu-stok').value = '';
  $('mu-birim').value = '1';
  $('mu-desc').value = ''; // Kategori yerine açıklama eklendi
  $('mu-grup').value = '';

  $('mu-foto-input').value = '';
  $('mu-foto-preview').src = '';
  $('mu-foto-preview').style.display = 'none';

  $('mu-del').classList.add('hidden');
  loadUrunGrupSelects();
  openM('mo-urun');
}

function editUrun(id) {
  const u = DB.u.find(x => String(x.id) === String(id));
  if (!u) return;
  loadUrunGrupSelects();

  $('mu-id').value = u.id; $('mu-ad').value = u.ad; $('mu-barkod').value = u.barkod || '';

  $('mu-alis').value = formatTR(u.alisFiyat);
  $('mu-satis').value = formatTR(u.satisFiyat);

  $('mu-stok').value = u.stok || 0; $('mu-birim').value = u.birim || '1';
  $('mu-desc').value = u.desc || ''; // Kategori yerine açıklama
  $('mu-grup').value = u.grupId || '';

  if (u.foto) {
    $('mu-foto-preview').src = u.foto;
    $('mu-foto-preview').style.display = 'block';
  } else {
    $('mu-foto-input').value = '';
    $('mu-foto-preview').src = '';
    $('mu-foto-preview').style.display = 'none';
  }

  $('mu-del').classList.remove('hidden');
  $('mu-del').onclick = () => {
    showConfirm(`${u.ad} silinecek, emin misiniz?`, () => {
      softDelete(DB.u, id); saveDB(); closeM('mo-urun'); renderUrun(true);
    }, '🗑️', 'Ürün Sil');
  };
  openM('mo-urun');
}

function saveUrun() {
  const ad = $('mu-ad').value.trim();
  if (!ad) return showToast('Ürün adı zorunlu!');
  const id = $('mu-id').value;
  const data = {
    ad, barkod: $('mu-barkod').value, grupId: $('mu-grup').value,
    birim: Number($('mu-birim').value) || 1,
    desc: $('mu-desc').value.trim(), // Kategori yerine açıklama eklendi
    alisFiyat: parseRawTR($('mu-alis').value),
    satisFiyat: parseRawTR($('mu-satis').value),
    stok: Number($('mu-stok').value) || 0,
    foto: $('mu-foto-preview').src.startsWith('data:') ? $('mu-foto-preview').src : ''
  };

  if (id) Object.assign(DB.u.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  else DB.u.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });

  saveDB(); closeM('mo-urun'); renderUrun(true);
}

// --- SİPARİŞ ---
let tempSipItems = [];
let oldSipTur = null;

// TÜRKÇE SAYI FORMATLAMA YARDIMCILARI
function formatTR(val) {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '';
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function toRawTR(val) {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '';
  if (val === 0) return '0';
  return val.toString().replace('.', ',');
}

function parseRawTR(str) {
  if (!str) return 0;
  let clean = str.toString().replace(/\./g, '').replace(/,/g, '.');
  return parseFloat(clean) || 0;
}

function renderSip(force = false) {
  if (!force) return;
  const fTur = $('filter-sip-tur').value;
  const fCari = $('filter-sip-cari').value;
  const fStart = $('filter-sip-start').value;
  const fEnd = $('filter-sip-end').value;
  const list = $('sip-list');
  list.innerHTML = '';

  let sips = DB.s.filter(x => !x.silindi).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));

  sips.forEach(s => {
    const c = DB.c.find(x => String(x.id) === String(s.cariId)) || { ad: 'Bilinmeyen' };
    if (fTur && Number(s.tur) !== Number(fTur)) return;
    if (fCari && String(s.cariId) !== String(fCari)) return;
    if (fStart || fEnd) {
      const d = new Date(s.tarih);
      if (fStart && d < new Date(fStart)) return;
      if (fEnd && d > new Date(fEnd + 'T23:59:59')) return;
    }

    const isAlis = Number(s.tur) === ISLEM.ALIS;
    list.innerHTML += `
          <div class="list-item" onclick="editSip('${s.id}')">
            <div>
              <div style="font-weight:bold; color:${isAlis ? 'var(--red)' : 'var(--green)'}; font-size:0.9rem">
                ${isAlis ? '⬇️ Alış' : '⬆️ Satış'} | ${s.no}
              </div>
              <div style="font-size:0.85rem">${c.ad}</div>
              <div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(s.tarih)}</div>
            </div>
            <div style="text-align:right; font-weight:bold; font-size:1.1rem">
              ${fp(s.toplam)}
            </div>
          </div>
        `;
  });
}

// Başlık Satırı Eklenmiş ve Türkçe Format Uyumlu Kalem Listesi
function renderSipItems() {
  const p = $('ms-items');
  p.innerHTML = '';

  // Sadece silinmemiş aktif kalemleri filtreleyip gösteriyoruz
  const visibleItems = tempSipItems.filter(it => !it.silindi);

  if (visibleItems.length > 0) {
    p.innerHTML += `
          <div style="display:flex; gap:0.4rem; margin-bottom:0.4rem; padding:0 0.5rem; font-size:0.8rem; font-weight:bold; color:var(--text-muted);">
            <div style="flex:3;">Ürün Adı</div>
            <div style="flex:2;">Miktar</div>
            <div style="flex:2;">Birim Fiyat</div>
            <div style="flex:2;">Toplam Fiyat</div>
            <div style="width:1.1rem; margin-left:4px;"></div>
          </div>
        `;
  }

  visibleItems.forEach((it) => {
    p.innerHTML += `
          <div style="display:flex; gap:0.4rem; margin-bottom:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;">
            
            <div style="flex:3; position:relative;">
              <input type="text" value="${it.ad}" placeholder="Ürün Ara (İçeren)..." onkeyup="ddUrunSearch('${it.id}', this)" onchange="findSipItem('${it.id}').ad = this.value; findSipItem('${it.id}').guncellenmeTarihi = tsNow();" style="margin:0; padding:0.4rem; font-size:0.85rem" autocomplete="off">
            </div>
            
            <div style="flex:2; position:relative;">
              <input type="number" id="sip-mik-${it.id}" value="${it.miktar || ''}" placeholder="Miktar" oninput="handleSipRowChange('${it.id}', 'miktar', this.value)" style="margin:0; padding:0.4rem; padding-right:2.4rem; font-size:0.85rem; width:100%; box-sizing:border-box;">
              <span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:0.75rem; color:var(--text-muted); font-weight:bold; pointer-events:none;">${getBirimAd(it.birim)}</span>
            </div>

            <div style="flex:2">
              <input type="text" id="sip-fiy-${it.id}" value="${formatTR(it.fiyat)}" placeholder="Birim Fiyat" onfocus="this.value=toRawTR(findSipItem('${it.id}').fiyat)" onblur="this.value=formatTR(findSipItem('${it.id}').fiyat)" oninput="handleSipRowChangeText('${it.id}', 'fiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
            </div>
            <div style="flex:2">
              <input type="text" id="sip-top-${it.id}" value="${formatTR(it.toplam)}" placeholder="Toplam Fiyat" onfocus="this.value=toRawTR(findSipItem('${it.id}').toplam)" onblur="this.value=formatTR(findSipItem('${it.id}').toplam)" oninput="handleSipRowChangeText('${it.id}', 'toplam', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
            </div>
            <button class="icon-btn text-red" style="padding:0; font-size:1.1rem; margin-left:4px;" onclick="delSipItem('${it.id}')">✕</button>
          </div>
        `;
  });
  calcSipTotal();
}

function ddUrunSearch(idx, inp) {
  const q = inp.value.toLowerCase().trim();
  const listId = `dd-urun-list-${idx}`;
  let list = $(listId);
  if (!list) {
    list = document.createElement('div');
    list.id = listId; list.className = 'dropdown-list';
    inp.parentNode.appendChild(list);
    inp.parentNode.style.position = 'relative';
  }
  list.innerHTML = '';
  tempSipItems[idx].ad = inp.value;

  if (!q) { list.classList.add('hidden'); return; }

  const res = DB.u.filter(x => !x.silindi && (x.ad + " " + (x.barkod || "")).toLowerCase().includes(q)).slice(0, 8);
  if (res.length === 0) { list.classList.add('hidden'); return; }

  res.forEach(u => {
    const div = document.createElement('div');
    div.className = 'dropdown-item';
    div.innerText = u.ad;
    div.onclick = () => {
      inp.value = u.ad;
      list.classList.add('hidden');
      const tur = Number($('ms-tur').value);
      tempSipItems[idx].urunId = u.id;
      tempSipItems[idx].ad = u.ad;
      tempSipItems[idx].fiyat = (tur === ISLEM.ALIS) ? (u.alisFiyat || 0) : (u.satisFiyat || 0);
      tempSipItems[idx].birim = u.birim || 1;
      tempSipItems[idx].toplam = tempSipItems[idx].fiyat * (tempSipItems[idx].miktar || 1);
      renderSipItems();
    };
    list.appendChild(div);
  });
  list.classList.remove('hidden');
}

// Miktar değiştiğinde çalışan tetikleyici
function handleSipRowChange(idx, field, val) {
  let m = parseFloat(val) || 0;
  tempSipItems[idx][field] = m;

  let f = parseFloat(tempSipItems[idx].fiyat) || 0;
  let t = m * f;
  tempSipItems[idx].toplam = t;

  $('sip-top-' + idx).value = formatTR(t);
  $('sip-fiy-' + idx).value = formatTR(f);
  calcSipTotal();
}

// Birim Fiyat veya Toplam Fiyat elle değiştirildiğinde çift yönlü hesaplama mantığı
function handleSipRowChangeText(idx, field, val) {
  let parsedVal = parseRawTR(val);
  tempSipItems[idx][field] = parsedVal;

  let m = parseFloat(tempSipItems[idx].miktar) || 0;
  let f = parseFloat(tempSipItems[idx].fiyat) || 0;
  let t = parseFloat(tempSipItems[idx].toplam) || 0;

  if (field === 'fiyat') {
    t = m * parsedVal;
    tempSipItems[idx].toplam = t;
    let topInput = $('sip-top-' + idx);
    if (topInput && document.activeElement !== topInput) {
      topInput.value = formatTR(t);
    }
  } else if (field === 'toplam') {
    f = m !== 0 ? parsedVal / m : 0;
    tempSipItems[idx].fiyat = f;
    let fiyInput = $('sip-fiy-' + idx);
    if (fiyInput && document.activeElement !== fiyInput) {
      fiyInput.value = formatTR(f);
    }
  }
  calcSipTotal();
}

function updateSipItem(idx, key, val) { tempSipItems[idx][key] = val; }
function delSipItem(idx) { tempSipItems.splice(idx, 1); renderSipItems(); }
function addSipItem() { tempSipItems.push({ urunId: null, ad: '', fiyat: '', miktar: 1, toplam: '', birim: 1 }); renderSipItems(); }

function calcSipTotal() {
  const araT = tempSipItems.reduce((sum, it) => sum + (parseFloat(it.toplam) || 0), 0);
  $('ms-ara').innerText = fp(araT);
  $('ms-genel').innerText = fp(araT - (Number($('ms-indirim').value) || 0));
}

function openSiparisModal() {
  $('ms-id').value = ''; $('ms-tur').value = ISLEM.SATIS; oldSipTur = null;
  $('ms-tarih').value = dtNow(); $('ms-not').value = ''; $('ms-indirim').value = '0';
  $('ms-cari').value = ''; $('csd-ms-cari').innerText = 'Cari Seçiniz...';
  $('ms-del').classList.add('hidden'); $('ms-pdf').classList.add('hidden');
  tempSipItems = []; renderSipItems(); openM('mo-sip');
}

function editSip(id) {
  const s = DB.s.find(x => String(x.id) === String(id));
  if (!s) return;
  const c = DB.c.find(x => String(x.id) === String(s.cariId));

  $('ms-id').value = s.id; $('ms-tur').value = s.tur; oldSipTur = Number(s.tur);
  $('ms-tarih').value = s.tarih; $('ms-not').value = s.not || ''; $('ms-indirim').value = s.indirim || 0;
  $('ms-cari').value = s.cariId; $('csd-ms-cari').innerText = c ? c.ad : 'Bilinmeyen Cari';
  tempSipItems = JSON.parse(JSON.stringify(s.items || [])).map(it => {
    it.toplam = it.toplam !== undefined ? it.toplam : ((it.fiyat || 0) * (it.miktar || 0));
    return it;
  });
  $('ms-del').classList.remove('hidden'); $('ms-pdf').classList.remove('hidden');

  $('ms-del').onclick = () => {
    showConfirm(`${s.no} silinecek, emin misiniz?`, () => {
      s.items.forEach(it => { if (it.urunId) updateStok(it.urunId, it.miktar, Number(s.tur) === ISLEM.ALIS, false); });
      softDelete(DB.s, id); saveDB(); closeM('mo-sip'); renderSip(true); renderHome();
    }, '🗑️', 'Sipariş Sil');
  };
  $('ms-pdf').onclick = () => printSip(s.id);
  renderSipItems(); openM('mo-sip');
}

function saveSip() {
  const cariId = $('ms-cari').value;
  if (!cariId) return showToast('Cari seçimi zorunlu!');
  if (tempSipItems.length === 0) return showToast('Kalem girilmedi!');

  const id = $('ms-id').value;
  const tur = Number($('ms-tur').value);
  const isAlis = tur === ISLEM.ALIS;
  const finalItems = tempSipItems.map(it => ({
    ...it,
    fiyat: parseFloat(it.fiyat) || 0,
    miktar: parseFloat(it.miktar) || 0,
    toplam: parseFloat(it.toplam) || 0
  }));

  const ara = finalItems.reduce((sum, it) => sum + it.toplam, 0);
  const ind = Number($('ms-indirim').value) || 0;
  const data = {
    tur, cariId: String(cariId), tarih: $('ms-tarih').value, not: $('ms-not').value,
    items: finalItems, araToplam: ara, indirim: ind, genelToplam: ara - ind, toplam: ara - ind
  };

  if (id) {
    const s = DB.s.find(x => String(x.id) === String(id));
    s.items.forEach(it => { if (it.urunId) updateStok(it.urunId, it.miktar, oldSipTur === ISLEM.ALIS, false); });
    Object.assign(s, data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
    s.items.forEach(it => { if (it.urunId) updateStok(it.urunId, it.miktar, isAlis, true); });
  } else {
    data.no = `SIP-${pad(DB.s.length + 1)}`;
    DB.s.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });
    data.items.forEach(it => { if (it.urunId) updateStok(it.urunId, it.miktar, isAlis, true); });
  }
  saveDB(); closeM('mo-sip'); renderSip(true); renderHome();
}

// --- KASA ---
function renderKasa(force = false) {
  if (!force) return;
  const fTur = $('filter-kasa-tur').value;
  const fCari = $('filter-kasa-cari').value;
  const fGrup = $('filter-kasa-grup').value; // YENİ
  const fStart = $('filter-kasa-start').value;
  const fEnd = $('filter-kasa-end').value;
  const list = $('kasa-list');
  list.innerHTML = '';

  let ts = DB.t.filter(x => !x.silindi).sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  ts.forEach(t => {
    const c = DB.c.find(x => String(x.id) === String(t.cariId));
    const cObj = c || { ad: 'Bilinmeyen' };

    if (fTur && Number(t.tur) !== Number(fTur)) return;
    if (fCari && String(t.cariId) !== String(fCari)) return;

    // YENİ: Grup filtresi kontrolü
    if (fGrup) {
      if (!c || String(c.grupId) !== String(fGrup)) return;
    }

    if (fStart || fEnd) {
      const d = new Date(t.tarih);
      if (fStart && d < new Date(fStart)) return;
      if (fEnd && d > new Date(fEnd + 'T23:59:59')) return;
    }

    const isTah = Number(t.tur) === KASA.TAHSILAT;
    list.innerHTML += `
          <div class="list-item" onclick="editKasa('${t.id}')">
            <div>
              <div style="font-weight:bold; color:${isTah ? 'var(--green)' : 'var(--red)'}; font-size:0.9rem">
                ${isTah ? '⬇️ Tahsilat' : '⬆️ Ödeme'}
              </div>
              <div style="font-size:0.85rem">${cObj.ad}</div>
              <div style="font-size:0.75rem; color:var(--text-muted)">${dtFormat(t.tarih)}</div>
            </div>
            <div style="text-align:right; font-weight:bold; font-size:1.1rem">
              ${fp(t.tutar)}
            </div>
          </div>
        `;
  });
}

function openKasaModal() {
  $('mk-id').value = ''; $('mk-tur').value = KASA.TAHSILAT;
  $('mk-tarih').value = dtNow(); $('mk-tutar').value = ''; $('mk-aciklama').value = '';
  $('mk-cari').value = ''; $('csd-mk-cari').innerText = 'Cari Seçiniz...';
  $('mk-del').classList.add('hidden'); $('mk-pdf').classList.add('hidden');
  openM('mo-kasa');
}

function editKasa(id) {
  const t = DB.t.find(x => String(x.id) === String(id));
  if (!t) return;
  const c = DB.c.find(x => String(x.id) === String(t.cariId));

  $('mk-id').value = t.id; $('mk-tur').value = t.tur;
  $('mk-tarih').value = t.tarih;

  // DEĞİŞEN KISIM: Tutarı okurken Türkçe formata çevirerek yazar
  $('mk-tutar').value = formatTR(t.tutar);

  $('mk-aciklama').value = t.aciklama || '';
  $('mk-cari').value = t.cariId; $('csd-mk-cari').innerText = c ? c.ad : 'Bilinmeyen Cari';
  $('mk-del').classList.remove('hidden'); $('mk-pdf').classList.remove('hidden');

  $('mk-del').onclick = () => {
    showConfirm(`Bu işlem silinecek, emin misiniz?`, () => {
      softDelete(DB.t, id); saveDB(); closeM('mo-kasa'); renderKasa(true); renderHome();
    }, '🗑️', 'İşlem Sil');
  };
  $('mk-pdf').onclick = () => printKasa(t.id);
  openM('mo-kasa');
}

function saveKasa() {
  const cariId = $('mk-cari').value;
  if (!cariId) return showToast('Cari seçimi zorunlu!');

  // DEĞİŞEN KISIM: Textbox'taki virgüllü veriyi saf sayı formatına çevirir
  const tutar = parseRawTR($('mk-tutar').value);

  if (!tutar || tutar <= 0) return showToast('Geçerli bir tutar girin!');

  const id = $('mk-id').value;
  const data = { tur: Number($('mk-tur').value), cariId: String(cariId), tarih: $('mk-tarih').value, tutar, aciklama: $('mk-aciklama').value };

  if (id) Object.assign(DB.t.find(x => String(x.id) === String(id)), data, { guncellenmeTarihi: tsNow(), guncelleyen: getCihazAdi() });
  else DB.t.push({ id: guid(), ...data, olusturmaTarihi: tsNow(), olusturan: getCihazAdi(), silindi: false });

  saveDB(); closeM('mo-kasa'); renderKasa(true); renderHome();
}

// --- ANALİZ ---
function renderHome() {
  $('home-cari-count').innerText = DB.c.filter(x => !x.silindi).length;
  $('home-urun-count').innerText = DB.u.filter(x => !x.silindi).length;
  if ($('home-kampanya-count')) $('home-kampanya-count').innerText = DB.k.length + " Geçmiş ➔";
}

function renderAnaliz(force = false) {
  if (!force) return;
  const start = $('an-start').value;
  const end = $('an-end').value;
  const fGrup = $('filter-an-grup').value;

  let ss = DB.s.filter(x => !x.silindi);

  // Siparişleri Gruba Göre Filtrele
  if (fGrup) {
    ss = ss.filter(s => {
      const c = DB.c.find(x => String(x.id) === String(s.cariId));
      return c && String(c.grupId) === String(fGrup);
    });
  }

  if (start && end) {
    const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59);
    ss = ss.filter(x => { const d = new Date(x.tarih); return d >= sD && d <= eD; });
  }

  let tAlis = 0, tSatis = 0, tKar = 0;
  ss.forEach(s => {
    if (Number(s.tur) === ISLEM.ALIS) tAlis += s.toplam;
    if (Number(s.tur) === ISLEM.SATIS) {
      tSatis += s.toplam;
      s.items.forEach(it => {
        const u = DB.u.find(x => String(x.id) === String(it.urunId));
        const maliyet = u ? u.alisFiyat : 0;
        tKar += (it.fiyat - maliyet) * it.miktar;
      });
    }
  });

  let mBorc = 0, mAlacak = 0;
  DB.c.filter(x => !x.silindi).forEach(c => {
    // Cari Bakiyelerini Gruba Göre Filtrele
    if (fGrup && String(c.grupId) !== String(fGrup)) return;

    const n = calcNet(c.id);
    if (n > 0) mBorc += n;
    if (n < 0) mAlacak += Math.abs(n);
  });

  let stokMaliyet = 0, stokDeger = 0;
  DB.u.filter(x => !x.silindi).forEach(u => {
    const s = Number(u.stok) || 0;
    if (s > 0) { stokMaliyet += s * (Number(u.alisFiyat) || 0); stokDeger += s * (Number(u.satisFiyat) || 0); }
  });

  // YENİ EKLENEN KISIM: Kasa İşlemlerini Gruba ve Tarihe Göre Filtrele (Tahsilat / Ödeme)
  let tTahsilat = 0, tOdeme = 0;
  let tt = DB.t.filter(x => !x.silindi);

  // Kasadaki işlemi yapan carinin grubuna göre filtrele
  if (fGrup) {
    tt = tt.filter(t => {
      const c = DB.c.find(x => String(x.id) === String(t.cariId));
      return c && String(c.grupId) === String(fGrup);
    });
  }

  // Kasa tarih aralığı
  if (start && end) {
    const sD = new Date(start); const eD = new Date(end); eD.setHours(23, 59, 59);
    tt = tt.filter(x => { const d = new Date(x.tarih); return d >= sD && d <= eD; });
  }

  // Filtrelenmiş kasa işlemlerini topla
  tt.forEach(t => {
    if (Number(t.tur) === KASA.TAHSILAT) tTahsilat += Number(t.tutar);
    if (Number(t.tur) === KASA.ODEME) tOdeme += Number(t.tutar);
  });

  const or = tSatis > 0 ? ((tKar / tSatis) * 100).toFixed(1) : 0;

  // HTML İçeriğini Basma (Yeni kartlar eklendi)
  $('analiz-grid').innerHTML = `
        <div class="card"><div class="card-title">Alış Tutarı</div><div class="card-value text-red">${fp(tAlis)}</div></div>
        <div class="card"><div class="card-title">Satış Tutarı</div><div class="card-value text-green">${fp(tSatis)}</div></div>
        <div class="card"><div class="card-title">Kasa Ödeme (Çıkan)</div><div class="card-value text-red">${fp(tOdeme)}</div></div>
        <div class="card"><div class="card-title">Kasa Tahsilat (Giren)</div><div class="card-value text-green">${fp(tTahsilat)}</div></div>
        <div class="card"><div class="card-title">Stok Alış Maliyeti</div><div class="card-value text-red">${fp(stokMaliyet)}</div></div>
        <div class="card"><div class="card-title">Stok Satış Değeri</div><div class="card-value text-green">${fp(stokDeger)}</div></div>
        <div class="card"><div class="card-title">Piyasaya Borcumuz</div><div class="card-value text-red">${fp(mAlacak)}</div></div>
        <div class="card"><div class="card-title">Piyasadaki Alacağımız</div><div class="card-value text-green">${fp(mBorc)}</div></div>
        <div class="card"><div class="card-title">Kâr Tutarı / Oranı</div><div class="card-value">${fp(tKar)} <span style="font-size:1rem;color:var(--text-muted)">(%${or})</span></div></div>
      `;
}

// --- KATALOG & KAMPANYA İŞLEMLERİ ---
let tempKatItems = [];

function openKatalogModal() {
  $('kat-id').value = '';
  $('kat-ad').value = '';
  $('kat-desc').value = '';
  $('filter-kat-q').value = '';
  tempKatItems = [];

  const sel = $('filter-kat-grup');
  sel.innerHTML = '<option value="">Tüm Gruplar</option>';
  DB.ug.forEach(g => { sel.innerHTML += `<option value="${g.id}">${g.ad}</option>`; });

  renderKatUrun();
  renderKatSepet();
  openM('mo-katalog');
}

function renderKatUrun() {
  const q = $('filter-kat-q').value.toLowerCase().trim();
  const fGrup = $('filter-kat-grup').value;
  const list = $('kat-urun-list');
  list.innerHTML = '';

  let res = DB.u.filter(x => !x.silindi);
  if (fGrup) res = res.filter(u => String(u.grupId) === String(fGrup));
  if (q) res = res.filter(u => (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase().includes(q));

  if (res.length === 0) { list.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Ürün bulunamadı.</p>'; return; }

  res.forEach(u => {
    const isAdded = tempKatItems.some(k => k.urunId === u.id);
    list.innerHTML += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.5rem; border-bottom:1px solid var(--border);">
            <div style="font-size:0.85rem; font-weight:bold;">${u.ad} <span style="font-weight:normal; color:var(--text-muted); font-size:0.75rem;">(S.Fiyat: ${fp(u.satisFiyat)})</span></div>
            <button class="${isAdded ? 'btn-outline' : 'btn-primary'}" style="width:auto; padding:0.3rem 0.6rem; font-size:0.8rem;" onclick="addKatItem('${u.id}')" ${isAdded ? 'disabled' : ''}>
              ${isAdded ? 'Eklendi' : '+ Ekle'}
            </button>
          </div>
        `;
  });
}

function addKatItem(id) {
  const u = DB.u.find(x => x.id === id);
  if (!u || tempKatItems.some(k => k.urunId === id)) return;

  // YENİ: desc (açıklama) objesi zorunlu olarak sepete ekleniyor
  tempKatItems.push({
    urunId: u.id, ad: u.ad, foto: u.foto || '', desc: u.desc || '',
    normalFiyat: u.satisFiyat || 0,
    indirimYuzde: 0,
    indirimliFiyat: u.satisFiyat || 0
  });
  renderKatUrun();
  renderKatSepet();
}

function selectAllKat() {
  const q = $('filter-kat-q').value.toLowerCase().trim();
  const fGrup = $('filter-kat-grup').value;

  let res = DB.u.filter(x => !x.silindi);
  if (fGrup) res = res.filter(u => String(u.grupId) === String(fGrup));
  if (q) res = res.filter(u => (u.ad + " " + (u.barkod || "") + " " + (u.desc || "")).toLowerCase().includes(q));

  res.forEach(u => {
    if (!tempKatItems.some(k => k.urunId === u.id)) {
      // YENİ: desc (açıklama) objesi tümünü seçte de ekleniyor
      tempKatItems.push({
        urunId: u.id, ad: u.ad, foto: u.foto || '', desc: u.desc || '',
        normalFiyat: u.satisFiyat || 0, indirimYuzde: 0, indirimliFiyat: u.satisFiyat || 0
      });
    }
  });
  renderKatUrun();
  renderKatSepet();
}

function removeKatItem(idx) {
  tempKatItems.splice(idx, 1);
  renderKatUrun();
  renderKatSepet();
}

function renderKatSepet() {
  const p = $('kat-sepet-list');
  p.innerHTML = '';

  if (tempKatItems.length === 0) { p.innerHTML = '<p class="text-muted" style="font-size:0.85rem;">Sepette ürün yok.</p>'; return; }

  p.innerHTML += `
        <div style="display:flex; gap:0.4rem; padding:0 0.5rem; font-size:0.75rem; font-weight:bold; color:var(--text-muted); margin-bottom:4px;">
          <div style="flex:3;">Ürün Adı</div>
          <div style="flex:2;">Normal Fiyat</div>
          <div style="flex:2;">İndirim %</div>
          <div style="flex:2;">İndirimli Fiyat</div>
          <div style="width:1.2rem;"></div>
        </div>
      `;

  tempKatItems.forEach((it, idx) => {
    // YENİ: Fareyle ürün adının üstüne gelince açıklamayı göster (tooltip)
    p.innerHTML += `
          <div style="display:flex; gap:0.4rem; margin-bottom:0.5rem; align-items:center; background:var(--bg); padding:0.5rem; border-radius:0.4rem;">
            <div style="flex:3; font-size:0.85rem; font-weight:bold; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;" title="${it.desc ? it.desc : 'Açıklama yok'}">${it.ad}</div>
            <div style="flex:2">
              <input type="text" id="kat-nf-${idx}" value="${formatTR(it.normalFiyat)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].normalFiyat)" onblur="this.value=formatTR(tempKatItems[${idx}].normalFiyat)" oninput="handleKatRow(${idx}, 'normalFiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
            </div>
            <div style="flex:2">
              <input type="text" id="kat-yuz-${idx}" value="${formatTR(it.indirimYuzde)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].indirimYuzde)" onblur="this.value=formatTR(tempKatItems[${idx}].indirimYuzde)" oninput="handleKatRow(${idx}, 'indirimYuzde', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
            </div>
            <div style="flex:2">
              <input type="text" id="kat-ind-${idx}" value="${formatTR(it.indirimliFiyat)}" onfocus="this.value=toRawTR(tempKatItems[${idx}].indirimliFiyat)" onblur="this.value=formatTR(tempKatItems[${idx}].indirimliFiyat)" oninput="handleKatRow(${idx}, 'indirimliFiyat', this.value)" style="margin:0; padding:0.4rem; font-size:0.85rem">
            </div>
            <button class="icon-btn text-red" style="padding:0; font-size:1.1rem; margin-left:4px;" onclick="removeKatItem(${idx})">✕</button>
          </div>
        `;
  });
}

function handleKatRow(idx, field, val) {
  let parsedVal = parseRawTR(val);
  tempKatItems[idx][field] = parsedVal;

  let n = parseFloat(tempKatItems[idx].normalFiyat) || 0;
  let y = parseFloat(tempKatItems[idx].indirimYuzde) || 0;
  let i = parseFloat(tempKatItems[idx].indirimliFiyat) || 0;

  if (field === 'normalFiyat') {
    i = n * (1 - (y / 100));
    tempKatItems[idx].indirimliFiyat = i;
    if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i);
  } else if (field === 'indirimYuzde') {
    i = n * (1 - (parsedVal / 100));
    tempKatItems[idx].indirimliFiyat = i;
    if (document.activeElement.id !== 'kat-ind-' + idx) $('kat-ind-' + idx).value = formatTR(i);
  } else if (field === 'indirimliFiyat') {
    y = n !== 0 ? ((n - parsedVal) / n) * 100 : 0;
    tempKatItems[idx].indirimYuzde = y;
    if (document.activeElement.id !== 'kat-yuz-' + idx) $('kat-yuz-' + idx).value = formatTR(y);
  }
}

function openKampanyaListeModal() {
  renderKampanyaListe();
  openM('mo-kampanya-liste');
}

function renderKampanyaListe() {
  const list = $('kl-list');
  list.innerHTML = '';

  if ($('home-kampanya-count')) $('home-kampanya-count').innerText = DB.k.length + " Geçmiş ➔";

  if (DB.k.length === 0) {
    list.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding:1rem; text-align:center;">Kayıtlı kampanya bulunmuyor.</p>';
    return;
  }

  DB.k.forEach(k => {
    list.innerHTML += `
          <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; padding:0.75rem;">
            <div style="flex:1; cursor:pointer;" onclick="editKampanya('${k.id}')">
              <div style="font-weight:bold; color:var(--accent); font-size:0.95rem;">${k.ad}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:3px;">${k.tarih} | ${k.items.length} Kalem Ürün</div>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button class="icon-btn" title="PDF İndir" onclick="printKatalogById('${k.id}')">⬇️</button>
              <button class="icon-btn text-red" title="Sil" onclick="deleteKampanya('${k.id}')">🗑️</button>
            </div>
          </div>
        `;
  });
}

function printKatalogById(id) {
  const k = DB.k.find(x => x.id === id);
  if (k) printKatalog(k);
}

function editKampanya(id) {
  const k = DB.k.find(x => x.id === id);
  if (!k) return;

  closeM('mo-kampanya-liste');
  openKatalogModal();

  $('kat-id').value = k.id;
  $('kat-ad').value = k.ad;
  $('kat-desc').value = k.desc || '';

  // YENİ: Geçmiş katalog açıldığında ürün listesindeki açıklamaları da ana veritabanından güncelle
  tempKatItems = JSON.parse(JSON.stringify(k.items)).map(it => {
    const anaUrun = DB.u.find(x => String(x.id) === String(it.urunId));
    it.desc = (anaUrun && anaUrun.desc) ? anaUrun.desc : (it.desc || '');
    it.foto = (anaUrun && anaUrun.foto) ? anaUrun.foto : (it.foto || '');
    return it;
  });

  renderKatUrun();
  renderKatSepet();
}

function deleteKampanya(id) {
  showConfirm("Bu kampanyayı silmek istediğinize emin misiniz?", () => {
    DB.k = DB.k.filter(x => x.id !== id);
    saveDB();
    renderKampanyaListe();
    renderHome();
    showToast("Kampanya silindi.");
  }, '🗑️', 'Kampanya Sil');
}

function saveAndPrintKatalog() {
  const ad = $('kat-ad').value.trim();
  if (!ad) return showToast('Katalog Adı zorunlu!');
  if (tempKatItems.length === 0) return showToast('Katalogda ürün yok!');

  const id = $('kat-id').value;
  const kData = {
    id: id || guid(),
    ad: ad,
    desc: $('kat-desc').value.trim(),
    tarih: tsNow(),
    // YENİ: İndirim oranları ve açıklamalarıyla birlikte ürünler tamamen kaydedilir
    items: JSON.parse(JSON.stringify(tempKatItems))
  };

  if (id) {
    const idx = DB.k.findIndex(x => x.id === id);
    if (idx > -1) DB.k[idx] = kData;
  } else {
    DB.k.push(kData);
  }

  saveDB();
  closeM('mo-katalog');
  showToast('Katalog kaydedildi, PDF hazırlanıyor...');
  renderHome();

  setTimeout(() => printKatalog(kData), 500);
}

// --- BARKOD KAMERA ---
let camTarget = null;
let lastScanTime = 0;

function startCam(target) {
  camTarget = target;
  $('cam-info').innerText = "Kamera izni bekleniyor...";
  openM('mo-cam');
  $('cam-video').style.display = 'block';

  // 1. ADIM: Tarayıcıdan açıkça kamera izni iste
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(function (stream) {
        // İzin verildi. Akışı durdur ve kamerayı Quagga'ya devret.
        stream.getTracks().forEach(track => track.stop());
        $('cam-info').innerText = "Barkodu kameraya okutun";
        initQuagga();
      })
      .catch(function (err) {
        // İzin reddedildi veya donanım yok
        showToast("Kamera izni verilmedi veya erişilemiyor.");
        $('cam-info').innerText = "Kamera izni reddedildi: " + err.name;
        setTimeout(stopCam, 2000);
      });
  } else {
    showToast("Tarayıcınız kamera erişimini desteklemiyor (HTTPS gerekli olabilir).");
    stopCam();
  }

  // 2. ADIM: İzin alındıktan sonra Quagga'yı başlat
  function initQuagga() {
    Quagga.init({
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: $('scanner-container'),
        constraints: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      },
      locator: { patchSize: "large", halfSample: false },
      numOfWorkers: 0,
      decoder: { readers: ["ean_reader", "code_128_reader", "ean_8_reader", "code_39_reader"] },
      locate: true
    }, function (err) {
      if (err) { showToast(err.name); stopCam(); return; }
      Quagga.start();
      const v = document.querySelector('#scanner-container video');
      if (v) v.play().catch(e => console.log(e));
    });

    Quagga.onDetected(function (result) {
      const now = Date.now();
      // Peş peşe çift okumayı engellemek için 1.5 saniye bekle
      if (now - lastScanTime < 1500) return; 

      const code = result.codeResult.code;

      if (camTarget === 'urun-arama') {
        stopCam(); $('filter-urun-q').value = code; renderUrun(true);
      } else if (camTarget === 'urun-form') {
        stopCam(); $('mu-barkod').value = code;
      } else if (camTarget === 'sip-item') {
        lastScanTime = now;
        
        // Ürünü aktif (silinmemiş) veriler arasından bul
        const u = DB.u.find(x => !x.silindi && x.barkod === code);
        
        if (u) {
          const exItem = tempSipItems.find(x => !x.silindi && x.urunId === u.id);
          let mevcutMiktar = 0;
          
          if (exItem) {
            exItem.miktar++;
            exItem.toplam = exItem.miktar * exItem.fiyat;
            exItem.guncellenmeTarihi = tsNow();
            mevcutMiktar = exItem.miktar;
          } else {
            const isAlis = Number($('ms-tur').value) === ISLEM.ALIS;
            const fiy = isAlis ? (u.alisFiyat || 0) : (u.satisFiyat || 0);
            const sipId = $('ms-id').value || null;
            
            tempSipItems.push({
              id: guid(),
              siparisId: sipId,
              urunId: u.id, 
              ad: u.ad, 
              fiyat: fiy, 
              miktar: 1, 
              toplam: fiy, 
              birim: u.birim || 1,
              olusturmaTarihi: tsNow(),
              guncellenmeTarihi: tsNow(),
              silindi: false
            });
            mevcutMiktar = 1;
          }
          
          renderSipItems(); 
          
          // BAŞARILI BİLDİRİMİ EKRANA BAS (Yeni Süper Katmanı Çağır)
          showCamFeedback(true, u.ad, `Toplam: ${mevcutMiktar} ${getBirimAd(u.birim)}`);
          $('cam-info').innerText = `${u.ad} eklendi (${mevcutMiktar} adet)`;
          
        } else {
          // BAŞARISIZ BİLDİRİMİ EKRANA BAS (Yeni Süper Katmanı Çağır)
          showCamFeedback(false, "Sistemde Bulunamadı!\nBarkod: " + code);
          $('cam-info').innerText = "Kayıtsız Barkod: " + code;
        }
      }
    });
  }
}

function stopCam() {
  try { Quagga.stop(); } catch (e) { }
  $('cam-video').style.display = 'none';
  closeM('mo-cam');
}

// --- BARKOD GERİ BİLDİRİM EKRANI (KAMERA ÜSTÜ SÜPER KATMAN) ---
    function showCamFeedback(isSuccess, title, countMsg = "") {
      let fb = $('cam-feedback-pro');
      
      // Kutu yoksa JavaScript ile en üst katmana (z-index: 999999) zorla oluştur!
      if (!fb) {
        fb = document.createElement('div');
        fb.id = 'cam-feedback-pro';
        fb.className = 'hidden';
        fb.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); z-index:999999; background:rgba(0,0,0,0.85); border-radius:1rem; padding:2rem 1rem; text-align:center; color:white; width:80%; max-width:300px; backdrop-filter:blur(4px); box-shadow:0 10px 25px rgba(0,0,0,0.5); transition: opacity 0.2s; pointer-events:none;';
        
        fb.innerHTML = `
          <div id="cam-feedback-pro-icon" style="font-size:4rem; margin-bottom:0.5rem; line-height:1;"></div>
          <div id="cam-feedback-pro-title" style="font-size:1.1rem; font-weight:bold; margin-bottom:0.5rem; word-wrap: break-word;"></div>
          <div id="cam-feedback-pro-count" style="font-size:2rem; font-weight:900;"></div>
        `;
        document.body.appendChild(fb);
      }
      
      $('cam-feedback-pro-icon').innerText = isSuccess ? '✅' : '❌';
      $('cam-feedback-pro-title').innerText = title;
      
      const c = $('cam-feedback-pro-count');
      c.innerText = countMsg;
      c.style.display = countMsg ? 'block' : 'none';
      c.style.color = isSuccess ? 'var(--green)' : 'var(--red)';

      fb.classList.remove('hidden');
      
      // Peş peşe okutmalarda yazının titrememesi için eski sayacı temizle
      if(window.camFbTimer) clearTimeout(window.camFbTimer);
      
      // 1.5 Saniye sonra ekrandan kaybolsun
      window.camFbTimer = setTimeout(() => {
        fb.classList.add('hidden');
      }, 1500);
    }

// --- PDF MOTORU ---
// --- PDF MOTORU GÜNCELLENDİ ---
const PDF_CSS = `
      body { font-family: Arial, sans-serif; font-size: 16pt; color: #000; background: #fff; margin:0; padding:0; }
      @page { size: A4; margin: 15mm; }
      h1 { font-size: 22pt; font-weight: bold; text-align: center; margin-top: 0; padding-bottom: 10px; border-bottom: 2px solid #000; }
      p { margin: 5px 0; }
      .bold { font-weight: bold; }
      .master-box { border: 1px solid #000; padding: 15px; margin-bottom: 20px; font-weight: bold; border-radius: 5px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 16pt; }
      th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
      th { background: #f4f4f4; font-weight: bold; }
      .text-red { color: #d32f2f; font-weight: bold; }
      .text-green { color: #388e3c; font-weight: bold; }
      .text-right { text-align: right; }
      .bakiye-wrap { margin-top: 20px; display: flex; flex-direction: column; align-items: flex-end; }
      .total-line { font-size: 20pt; font-weight: bold; margin-top:10px; border-top: 2px solid #000; padding-top:10px; }
      .pdf-container { max-width: 800px; margin: 0 auto; }
      @media print { .pdf-container { max-width: none; } }
    `;

function getMasterHtml(tarih, cari, islemAdi) {
  const net = calcNet(cari.id);
  let bakiyeStr = '0,00 (Kapalı)';
  if (net > 0) bakiyeStr = `<span class="text-red">${fp(net)} (Borçlu)</span>`;
  else if (net < 0) bakiyeStr = `<span class="text-green">${fp(Math.abs(net))} (Alacaklı)</span>`;

  return `
        <h1>${islemAdi}</h1>
        <div class="master-box">
          <p><span class="bold">İşlem Tarihi:</span> ${dtFormat(tarih)}</p>
          <p><span class="bold">Firma/Şahıs Adı:</span> ${cari.ad}</p>
          <p><span class="bold">Kalan Bakiye:</span> ${bakiyeStr}</p>
        </div>
      `;
}

function openInTab(htmlStr, title) {
  const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' + PDF_CSS + '</style></head><body><div class="pdf-container">' + htmlStr + '</div><script>setTimeout(function(){window.print();}, 500);<\/script></body></html>';
  const w = window.open('', '_blank');
  if (w) {
    w.document.open();
    w.document.write(full);
    w.document.close();
  } else {
    alert("Lütfen yazdırmak için tarayıcınızın 'Açılır Pencere' (Popup) engelleyicisini kapatın.");
  }
}

function printSip(id) {
  const s = DB.s.find(x => String(x.id) === String(id));
  const c = DB.c.find(x => String(x.id) === String(s.cariId)) || { ad: '-', vkn: '-', tel: '-', adres: '-' };
  const title = Number(s.tur) === ISLEM.ALIS ? 'ALIŞ SİPARİŞ FİŞİ' : 'SATIŞ SİPARİŞ FİŞİ';

  let trs = '';
  s.items.forEach(it => {
    trs += `<tr>
          <td>${it.miktar}</td>
          <td>${getBirimAd(it.birim)}</td>
          <td class="bold">${it.ad}</td>
          <td>${fp(it.fiyat)}</td>
          <td class="text-right bold">${fp(it.fiyat * it.miktar)}</td>
        </tr>`;
  });

  const h = `
        ${getMasterHtml(s.tarih, c, title)}
        <h3 class="bold">Sipariş Detayları</h3>
        <table>
          <thead>
            <tr>
              <th>Miktar</th>
              <th>Birim</th>
              <th>Ürün Adı</th>
              <th>Birim Fiyat</th>
              <th class="text-right">Toplam Fiyat</th>
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>
        <div class="bakiye-wrap">
          <div>Ara Toplam: ${fp(s.araToplam)}</div>
          <div>İskonto: ${fp(s.indirim)}</div>
          <div class="total-line">Sipariş Toplamı: ${fp(s.toplam)}</div>
        </div>
      `;
  openInTab(h, title);
}

function printKasa(id) {
  const t = DB.t.find(x => String(x.id) === String(id));
  const c = DB.c.find(x => String(x.id) === String(t.cariId)) || { ad: '-' };
  const isTahsilat = Number(t.tur) === KASA.TAHSILAT;
  const title = isTahsilat ? 'TAHSİLAT MAKBUZU' : 'ÖDEME MAKBUZU';

  const h = `
        ${getMasterHtml(t.tarih, c, title)}
        <h3 class="bold">İşlem Detayları</h3>
        <table>
          <thead>
            <tr>
              <th>Ödeme Tipi</th>
              <th class="text-right">Tutar</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="bold ${isTahsilat ? 'text-green' : 'text-red'}">${isTahsilat ? 'Tahsilat' : 'Ödeme'}</td>
              <td class="text-right bold">${fp(t.tutar)}</td>
            </tr>
          </tbody>
        </table>
        ${t.aciklama ? `<p style="margin-top:20px;"><span class="bold">Açıklama:</span> ${t.aciklama}</p>` : ''}
      `;
  openInTab(h, title);
}

function printEkstre(cariId) {
  const c = DB.c.find(x => String(x.id) === String(cariId));
  if (!c) return;
  const title = 'CARİ HESAP EKSTRESİ';
  const masterHtml = getMasterHtml(dtNow(), c, title);

  const har = [];
  DB.s.filter(x => !x.silindi && String(x.cariId) === cariId).forEach(x => {
    har.push({
      t: x.tarih,
      tur: (Number(x.tur) === ISLEM.SATIS ? 'Satış' : 'Alış'),
      isRed: Number(x.tur) === ISLEM.SATIS,
      b: (Number(x.tur) === ISLEM.SATIS ? x.toplam : -x.toplam)
    });
  });
  DB.t.filter(x => !x.silindi && String(x.cariId) === cariId).forEach(x => {
    har.push({
      t: x.tarih,
      tur: (Number(x.tur) === KASA.TAHSILAT ? 'Tahsilat' : 'Ödeme'),
      isRed: Number(x.tur) === KASA.ODEME,
      b: (Number(x.tur) === KASA.ODEME ? x.tutar : -x.tutar)
    });
  });
  har.sort((a, b) => new Date(a.t) - new Date(b.t));

  let trs = ''; let bakiye = 0;
  har.forEach(h => {
    bakiye += h.b;
    const islemClass = h.isRed ? 'text-red' : 'text-green';
    const tutarStr = `<span class="${islemClass}">${fp(Math.abs(h.b))}</span>`;

    const bakiyeClass = bakiye > 0 ? 'text-red' : (bakiye < 0 ? 'text-green' : '');
    const bakiyeStr = `<span class="${bakiyeClass}">${fp(Math.abs(bakiye))} ${bakiye > 0 ? '(B)' : (bakiye < 0 ? '(A)' : '')}</span>`;

    trs += `<tr>
          <td>${dtFormat(h.t)}</td>
          <td class="bold ${islemClass}">${h.tur}</td>
          <td class="text-right">${tutarStr}</td>
          <td class="text-right">${bakiyeStr}</td>
        </tr>`;
  });

  const h = `
        ${masterHtml}
        <h3 class="bold">Hesap Hareketleri</h3>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>İşlem</th>
              <th class="text-right">Tutar</th>
              <th class="text-right">Bakiye</th>
            </tr>
          </thead>
          <tbody>${trs}</tbody>
        </table>
      `;
  openInTab(h, title);
}

function printKatalog(kat) {
  const title = kat.ad.toUpperCase();

  // Özel Katalog Tasarımı (Açıklamaların görünmesi için CSS düzeltildi)
  const KAT_CSS = `
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; margin:0; padding:10mm; color:#333; }
        .kat-header { text-align: center; border-bottom: 3px solid #e74c3c; margin-bottom: 30px; padding-bottom: 20px; }
        .kat-title { font-size: 32px; color: #2c3e50; font-weight: bold; margin: 0; letter-spacing: 1px; }
        .kat-desc { font-size: 16px; color: #7f8c8d; margin-top: 10px; font-style: italic; }
        .kat-tarih { font-size: 12px; color: #95a5a6; margin-top: 5px; }
        .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .product-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; text-align: center; background-color: #fff; page-break-inside: avoid; box-shadow: 0 4px 8px rgba(0,0,0,0.05); position:relative; display:flex; flex-direction:column; }
        .product-img { width: 100%; height: 160px; object-fit: contain; margin-bottom: 15px; border-radius:4px; }
        .product-name { font-size: 18px; font-weight: bold; color: #34495e; margin: 5px 0; }
        .product-item-desc { font-size: 13px; color: #7f8c8d; margin-bottom: 15px; font-style: italic; line-height: 1.4; word-wrap: break-word; }
        .price-container { margin-top: auto; padding-top: 15px; border-top: 1px dashed #eee; }
        .old-price { font-size: 14px; color: #95a5a6; text-decoration: line-through; margin-right: 8px; }
        .new-price { font-size: 24px; color: #e74c3c; font-weight: bold; }
        .badge { background: #e74c3c; color: #fff; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; position: absolute; top: 15px; right: 15px; }
        .pdf-container { max-width: 900px; margin: 0 auto; }
        @media print { .pdf-container { max-width: none; } body{padding:0;} @page{size: A4; margin:15mm;} }
      `;

  let gridHtml = '';
  kat.items.forEach(it => {
    // En güncel açıklamayı Ana Veritabanından (DB.u) çekeriz.
    const anaUrun = DB.u.find(x => String(x.id) === String(it.urunId));

    // Eğer ürünün ana listesinde açıklama varsa onu kullan, yoksa katalogdakine bak, o da yoksa boş kalsın.
    const finalDesc = (anaUrun && anaUrun.desc) ? anaUrun.desc : (it.desc || '');
    const finalFoto = (anaUrun && anaUrun.foto) ? anaUrun.foto : (it.foto || '');

    const isDiscounted = it.indirimliFiyat < it.normalFiyat;

    let priceHtml = '';
    if (isDiscounted) {
      priceHtml = `
            <span class="old-price">${fp(it.normalFiyat)}</span>
            <span class="new-price">${fp(it.indirimliFiyat)}</span>
          `;
    } else {
      priceHtml = `<span class="new-price">${fp(it.normalFiyat)}</span>`;
    }

    const badgeHtml = isDiscounted ? `<div class="badge">%${formatTR(it.indirimYuzde)} İndirim</div>` : '';
    const imgHtml = finalFoto ? `<img src="${finalFoto}" class="product-img">` : `<div class="product-img" style="background:#f5f5f5; display:flex; align-items:center; justify-content:center; color:#ccc; font-style:italic; font-size:12px;">Görsel Yok</div>`;

    // Boşsa bile kontrol edebilmen için uyarısı eklendi.
    const itemDescHtml = finalDesc
      ? `<div class="product-item-desc">${finalDesc}</div>`
      : `<div class="product-item-desc" style="color:#d1d5db;">(Açıklama girilmemiş)</div>`;

    gridHtml += `
          <div class="product-card">
            ${badgeHtml}
            ${imgHtml}
            <div class="product-name">${it.ad}</div>
            ${itemDescHtml}
            <div class="price-container">
              ${priceHtml}
            </div>
          </div>
        `;
  });

  const h = `
        <div class="kat-header">
          <div class="kat-title">${title}</div>
          <div class="kat-desc">${kat.desc || 'Ürünlerimize ait güncel kampanya fiyatlarıdır.'}</div>
          <div class="kat-tarih">Tarih: ${kat.tarih}</div>
        </div>
        <div class="product-grid">
          ${gridHtml}
        </div>
      `;

  // script etiketi kaçış karakteriyle (\/) eklendi ki VS Code / Tarayıcı hata vermesin.
  const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' + KAT_CSS + '</style></head><body><div class="pdf-container">' + h + '</div><script>setTimeout(function(){window.print();}, 800);<\/script></body></html>';
  const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) window.location.href = url;
}

// --- YEDEKLEME (JSON) ---
function pushData() {
  const data = { version: 3, cihaz: getCihazAdi(), tarih: tsNow(), data: DB };
  const str = JSON.stringify(data);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OZSECER_${fd(new Date())}_${getCihazAdi()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Dosya indirildi.");
}

function pullData() { $('restore-file').click(); }

function processPull(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const res = JSON.parse(ev.target.result);
      if (!res.data || !res.data.c) return showToast('Geçersiz dosya!');
      showConfirm("Veriler mevcut verilerinizle birleştirilecek ve çakışanlar yedeğe göre güncellenecek. Devam edilsin mi?", () => {
        ['c', 'u', 's', 't', 'g'].forEach(k => {
          if (!res.data[k]) return;
          res.data[k].forEach(item => {
            const ex = DB[k].find(x => String(x.id) === String(item.id));
            if (ex) Object.assign(ex, item);
            else DB[k].push(item);
          });
        });
        saveDB(); renderHome(); showToast('Veriler başarıyla eşitlendi!');
      }, '🔄', 'Eşitle');
    } catch (err) { showToast('Dosya okuma hatası!'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function exportDB() {
  const data = JSON.stringify(DB);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `OzToptan_Yedek_${tsNow().replace(/[: ]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Veriler cihaza indirildi.");
}

// --- DİNAMİK CLIENT ID VE EŞİTLEME BAŞLATICISI ---
const DRIVE_FOLDER_ID = '1cgeuSHmzhfYdX9pDGAc4pxvaYNWt1_X2';
const DRIVE_FILE_NAME = 'oztoptan_sync_db.json'; // Klasörde aranacak/oluşturulacak dosya

let tokenClient;
let driveAccessToken = null;
let lastUsedClientId = null; // YENİ EKLENDİ: Son kullanılan ID'yi hafızada tutacak

function openSyncModal() {
  // Hafızada önceden girilmiş ID varsa direkt kutuya yazdır
  const savedId = localStorage.getItem('ozsecer_client_id') || '';
  $('sync-client-id').value = savedId;
  openM('mo-sync-config');
}

function saveClientIdAndSync() {
  const cId = $('sync-client-id').value.trim();
  if (!cId) return showToast('Lütfen Client ID bilgisini girin!');

  localStorage.setItem('ozsecer_client_id', cId);
  closeM('mo-sync-config');

  showSpinner("Google hesabı ile iletişim kuruluyor...");

  try {
    // İŞTE ÇÖZÜM BURASI: Eğer textbox'taki ID değiştiyse, elimizdeki eski Google iznini (token) çöpe at!
    if (cId !== lastUsedClientId) {
      driveAccessToken = null;
      lastUsedClientId = cId;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (response) => {
        if (response.error) {
          hideSpinner();
          driveAccessToken = null; // Hata durumunda kilitlenmemesi için izni temizle
          return showCustomAlert("İşlem İptal Edildi!\n\nGoogle giriş ekranını kapattınız veya yetki vermediniz.\n\nDetay: " + response.error, false);
        }
        driveAccessToken = response.access_token;
        await executePullMergePush();
      },
      error_callback: (err) => {
        hideSpinner();
        driveAccessToken = null; // Hata durumunda kilitlenmemesi için izni temizle
        showCustomAlert("Google bağlantısı kurulamadı!\n\nOlası Sebepler:\n1- Client ID'nizi eksik veya hatalı girdiniz.\n2- Tarayıcınız açılır pencereleri (popup) engelliyor.\n\nDetay: " + (err.type || JSON.stringify(err)), false);
      }
    });

    // Elimde geçerli bir izin yoksa (veya ID değiştiği için az önce sildiysek) yeni izin iste
    if (!driveAccessToken) {
      tokenClient.requestAccessToken({ prompt: 'select_account consent' });
    } else {
      // İzin hala geçerliyse ve ID (textbox'taki) bir öncekiyle AYNIYSA hiç sormadan direkt eşitle
      executePullMergePush();
    }

  } catch (err) {
    hideSpinner();
    showCustomAlert("Beklenmeyen bir sistem hatası oluştu:\n" + err.message, false);
  }
}

async function executePullMergePush() {
  updateSpinner("Eşitleme başladı: Drive'a bağlanılıyor...");

  try {
    const query = encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and name='${DRIVE_FILE_NAME}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
      headers: { 'Authorization': `Bearer ${driveAccessToken}` }
    });
    const searchData = await searchRes.json();

    if (searchData.error) throw new Error("Klasör bulunamadı veya yetkiniz yok.");

    let fileId = null;
    let remoteDB = null;

    if (searchData.files && searchData.files.length > 0) {
      fileId = searchData.files[0].id;
      updateSpinner("Buluttaki verileriniz çekiliyor (Pull)...");

      const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { 'Authorization': `Bearer ${driveAccessToken}` }
      });
      remoteDB = await getRes.json();
    }

    if (remoteDB) {
      updateSpinner("Cihazınızdaki verilerle bulut birleştiriliyor (Merge)...");
      try {
        mergeDatabases(remoteDB);
      } catch (mergeErr) {
        throw new Error("Veri çakışması tespit edildi! Algoritma güvenliğiniz için durduruldu.\nDetay: " + mergeErr);
      }
    }

    updateSpinner("Güncel verileriniz güvenle buluta yükleniyor (Push)...");
    const pushData = JSON.stringify(DB);

    if (fileId) {
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${driveAccessToken}`, 'Content-Type': 'application/json' },
        body: pushData
      });
      if (!patchRes.ok) throw new Error("Push (Güncelleme) işlemi başarısız oldu.");
    } else {
      const metadata = { name: DRIVE_FILE_NAME, parents: [DRIVE_FOLDER_ID] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([pushData], { type: 'application/json' }));

      const postRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${driveAccessToken}` },
        body: form
      });
      if (!postRes.ok) throw new Error("Push (Yeni Oluşturma) işlemi başarısız oldu.");
    }

    // Bütün işlemler başarılıysa
    saveDB();
    renderHome();
    hideSpinner();
    showCustomAlert("Tüm verileriniz cihazınızla bulut arasında saniyesi saniyesine kıyaslandı, hiçbir kayıp yaşanmadan birleştirildi ve güvenle yedeklendi!", true);

  } catch (err) {
    // Herhangi bir hata durumunda spinner'ı kaldırıp hatayı ekrana bas
    hideSpinner();
    showCustomAlert(err.message, false);
  }
}

function mergeDatabases(remoteDB) {
  if (!remoteDB) return;

  // Sistemdeki tüm tablolar (Cari, Ürün, Sipariş, Kasa, Gruplar, Katalog vb.)
  const collections = ['c', 'u', 's', 't', 'g', 'ug', 'k'];

  // Tarih formatını (DD.MM.YYYY HH:mm:ss veya ISO) kıyaslanabilir sayısal süreye çevirir
  function parseTRDate(str) {
    if (!str) return 0;
    if (str.includes('T')) return new Date(str).getTime();
    const parts = str.split(' ');
    if (parts.length !== 2) return 0;
    const d = parts[0].split('.');
    const t = parts[1].split(':');
    if (d.length !== 3 || t.length !== 3) return 0;
    return new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2]).getTime();
  }

  // Bir kaydın en son ne zaman dokunulduğunu (değiştirildiğini) bulur
  function getLastMod(item) {
    if (item.silinmeTarihi) return parseTRDate(item.silinmeTarihi);
    if (item.guncellenmeTarihi) return parseTRDate(item.guncellenmeTarihi);
    if (item.olusturmaTarihi) return parseTRDate(item.olusturmaTarihi);
    return 0; // Tarih yoksa 0 döner
  }

  collections.forEach(col => {
    if (!remoteDB[col]) return; // Drive'da bu tablo yoksa atla
    if (!DB[col]) DB[col] = []; // Cihazda bu tablo yoksa boş oluştur

    const localMap = new Map();
    DB[col].forEach(item => localMap.set(String(item.id), item));

    remoteDB[col].forEach(remoteItem => {
      const id = String(remoteItem.id);

      if (localMap.has(id)) {
        // KAYIT HER İKİ CİHAZDA DA VAR: Hangisi daha güncelse o kazanır
        const localItem = localMap.get(id);
        const remoteTime = getLastMod(remoteItem);
        const localTime = getLastMod(localItem);

        // Eğer Drive'daki (başka cihazdan gelen) kayıt daha yeniyse, bendeki (local) veriyi güncelle
        if (remoteTime > localTime) {
          Object.assign(localItem, remoteItem);
        }
        // Eğer bendeki daha yeniyse (localTime > remoteTime), hiçbir şeye dokunma.
        // Aşağıdaki PUSH işlemi sırasında benim güncel verim Drive'a gidecektir.

      } else {
        // KAYIT SADECE DRIVE'DA VAR: (Demek ki diğer cihaz yeni eklemiş), o zaman bendeki listeye de ekle
        DB[col].push(remoteItem);
        localMap.set(id, remoteItem);
      }
    });
  });
}

// --- SIFIRLAMA VE GÜVENLİK DOĞRULAMASI MANTIĞI ---
let currentResetTarget = '';

function openResetAuthModal(target) {
  currentResetTarget = target;
  const uInp = $('reset-user');
  const pInp = $('reset-pass');

  uInp.value = '';
  pInp.value = '';
  uInp.setAttribute('readonly', 'readonly');
  pInp.setAttribute('readonly', 'readonly');

  openM('mo-reset-auth');
}

// 1. ZİNCİR: DRIVE SIFIRLAMAK İÇİN ÖNCE GOOGLE CLIENT ID İSTE
function openDriveResetClientModal() {
  const savedId = localStorage.getItem('ozsecer_client_id') || '';
  $('reset-client-id-input').value = savedId;
  openM('mo-reset-client');
}

function verifyClientForReset() {
  const cId = $('reset-client-id-input').value.trim();
  if (!cId) return showToast('Lütfen Client ID bilgisini girin!');

  closeM('mo-reset-client');
  showSpinner("Google kimliği doğrulanıyor...");

  try {
    if (cId !== lastUsedClientId) {
      driveAccessToken = null;
      lastUsedClientId = cId;
    }

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: async (response) => {
        if (response.error) {
          hideSpinner();
          driveAccessToken = null;
          return showCustomAlert("İşlem İptal Edildi!\nGoogle kimliğinizi onaylamadınız.", false);
        }
        driveAccessToken = response.access_token;
        hideSpinner();

        // GOOGLE ONAYLANDI! ŞİMDİ 2. ZİNCİRE GEÇ (Sistem Şifresini Sor)
        openResetAuthModal('drive');
      },
      error_callback: (err) => {
        hideSpinner();
        driveAccessToken = null;
        showCustomAlert("Google bağlantısı kurulamadı!\nClient ID'niz hatalı olabilir.", false);
      }
    });

    // Eğer elimizde hazır token yoksa Google'dan iste
    if (!driveAccessToken) {
      tokenClient.requestAccessToken({ prompt: 'select_account consent' });
    } else {
      hideSpinner();
      // Token zaten varsa ve ID doğruysa direkt 2. zincire geç
      openResetAuthModal('drive');
    }
  } catch (err) {
    hideSpinner();
    showCustomAlert("Hata oluştu:\n" + err.message, false);
  }
}

// 2. ZİNCİR: KENDİ KULLANICI ADI VE ŞİFREMİZİN DOĞRULANMASI
function confirmResetAuth() {
  const u = $('reset-user').value.trim();
  const p = $('reset-pass').value.trim();

  if (u !== 'oztoptantedarik' || p !== 'Oztoptan6595.') {
    return showToast('❌ Hatalı kullanıcı adı veya şifre!');
  }

  closeM('mo-reset-auth');

  if (currentResetTarget === 'local') {
    if (confirm("⚠️ DİKKAT!\nCihazınızdaki (tarayıcıdaki) TÜM VERİLER silinecek.\nBu işlemi onaylıyor musunuz?")) {
      DB = { c: [], u: [], s: [], t: [], g: [], ug: [], k: [] };
      saveDB();
      renderHome();
      showCustomAlert("Cihazınızdaki tüm veriler başarıyla sıfırlandı!", true);
    }
  } else if (currentResetTarget === 'drive') {
    // İki güvenlik kapısından da başarıyla geçti. Şimdi son onay ve silme!
    if (confirm("🚨 KRİTİK İŞLEM!\nGoogle Drive üzerindeki TÜM YEDEK VERİLERİNİZ kalıcı olarak silinecek.\nEmin misiniz?")) {
      executeDriveReset();
    }
  }
}

// 3. ZİNCİR: ASIL SİLME İŞLEMİ (GOOLGE DRIVE API ÇAĞRISI)
async function executeDriveReset() {
  showSpinner("Bulut üzerindeki veritabanı sıfırlanıyor...");
  try {
    const emptyDB = { c: [], u: [], s: [], t: [], g: [], ug: [], k: [] };
    const pushData = JSON.stringify(emptyDB);

    const query = encodeURIComponent(`'${DRIVE_FOLDER_ID}' in parents and name='${DRIVE_FILE_NAME}' and trashed=false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
      headers: { 'Authorization': `Bearer ${driveAccessToken}` }
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      const patchRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${driveAccessToken}`, 'Content-Type': 'application/json' },
        body: pushData
      });
      if (!patchRes.ok) throw new Error("Google Drive veritabanı ezilemedi.");
    } else {
      throw new Error("Sıfırlanacak bir bulut yedeği bulunamadı.");
    }

    hideSpinner();
    showCustomAlert("Drive üzerindeki tüm yedekleriniz başarıyla sıfırlandı!", true);
  } catch (err) {
    hideSpinner();
    showCustomAlert(err.message, false);
  }
}

// --- UI GÖRSEL YARDIMCILARI (SPINNER & ALERT) ---
function showSpinner(msg) {
  $('spinner-msg').innerText = msg || 'Lütfen bekleyin...';
  openM('mo-spinner');
}
function updateSpinner(msg) { $('spinner-msg').innerText = msg; }
function hideSpinner() { closeM('mo-spinner'); }

function showCustomAlert(msg, isSuccess = true) {
  $('alert-icon').innerText = isSuccess ? '✅' : '❌';
  $('alert-title').innerText = isSuccess ? 'Eşitleme Başarılı' : 'Hata Oluştu';
  $('alert-title').style.color = isSuccess ? 'var(--green)' : 'var(--red)';
  $('alert-msg').innerText = msg;
  openM('mo-alert');
}

window.onload = checkAuth;