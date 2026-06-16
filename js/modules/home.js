import { DB, loadDB } from '../core/db.js';
import { $ } from '../core/utils.js';

export let currentView = 'home';

export function toggleTheme() {
  const html = document.documentElement; const t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', t); localStorage.setItem('e3_theme', t); $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
}

export function goTo(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  const targetView = $(`view-${view}`); if (targetView) targetView.classList.remove('hidden');
  const targetNav = $(`nav-${view}`); if (targetNav) targetNav.classList.add('active');

  const titles = { home: 'Ana Sayfa', cari: 'Cari Hesaplar', urun: 'Ürünler', sip: 'Siparişler', kasa: 'Kasa', analiz: 'Analiz', ayarlar: 'Sistem Yönetimi', publish: 'Yayın', katalog: 'Katalog & Kampanya', 'cloud-settings': 'Bulut Bağlantı' };
  const topTitle = $('top-title'); if (topTitle) topTitle.innerText = titles[view] || 'OZSECER ERP';

  const fab = $('main-fab');
  if (fab) { if (['cari', 'urun', 'sip', 'kasa'].includes(view)) { fab.style.display = 'flex'; } else { fab.style.display = 'none'; } }

  if (view === 'home') renderHome();
  if (view === 'cari') window.renderCari(true);
  if (view === 'urun') window.renderUrun(true);
  if (view === 'sip') window.renderSip(true);
  if (view === 'kasa') window.renderKasa(true);
  if (view === 'analiz') window.renderAnaliz(true);
}

// EKSİK OLAN VE HATAYA YOL AÇAN FONKSİYON EKLENDİ
export function renderHome() {
  const kampanyaCount = $('home-kampanya-count');
  if (kampanyaCount && DB && DB.Offer) {
    const aktifKampanyaSayisi = DB.Offer.filter(x => !x.Deleted).length;
    kampanyaCount.innerText = `${aktifKampanyaSayisi} Kampanya Kayıtlı ➔`;
  }
}

export function initApp() {
  const t = localStorage.getItem('e3_theme') || 'dark'; document.documentElement.setAttribute('data-theme', t); $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
  if (!localStorage.getItem('ozsecer_cihaz')) localStorage.setItem('ozsecer_cihaz', 'Cihaz_' + Math.floor(Math.random() * 1000));
  loadDB(); window.loadGrupSelects(); window.loadUrunGrupSelects(); goTo('home');

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown-wrap')) document.querySelectorAll('.dropdown-list').forEach(l => l.classList.add('hidden'));
    if (!e.target.closest('.c-select')) document.querySelectorAll('.c-select-menu').forEach(m => m.classList.remove('show'));
  });
}

export function openCurrentAddModal() {
  if (currentView === 'cari') window.openCariModal();
  else if (currentView === 'urun') window.openUrunModal();
  else if (currentView === 'sip') window.openSiparisModal();
  else if (currentView === 'kasa') window.openKasaModal();
}

// CARİ (C-SELECT) ARAMA VE SEÇİM MOTORU
export function toggleCSelect(id, dataSource) {
  const menu = $('csm-' + id); const isShown = menu.classList.contains('show');
  document.querySelectorAll('.c-select-menu').forEach(m => m.classList.remove('show'));
  if (!isShown) { menu.classList.add('show'); const inp = $('css-' + id); if(inp) inp.value = ''; renderCSelectList(id, dataSource, ''); }
}

export function renderCSelectList(id, dataSource, query) {
  const q = query.toLowerCase().trim(); const list = $('csl-' + id); list.innerHTML = '';
  
  // Seçimi temizleme butonu
  const div = document.createElement('div'); div.className = 'c-select-item text-muted'; div.innerText = 'Seçimi Temizle / Boş';
  div.onclick = (e) => { e.stopPropagation(); selectCItem(id, '', 'Seçim İptal'); }; list.appendChild(div);
  
  let res = [];
  if (dataSource === 'Current') { 
    res = DB.Current.filter(x => !x.Deleted && (x.Name + " " + (x.VKN || "") + " " + (x.PhoneNumber || "")).toLowerCase().includes(q)); 
  } else if (dataSource === 'ProductGroup') {
    res = DB.ProductGroup.filter(x => !x.Deleted && x.Name.toLowerCase().includes(q));
  } else if (dataSource === 'Category') {
    res = DB.Category.filter(x => !x.Deleted && x.Name.toLowerCase().includes(q));
  } else if (dataSource === 'Brand') {
    res = DB.Brand.filter(x => !x.Deleted && x.Name.toLowerCase().includes(q));
  }

  res.slice(0, 30).forEach(item => {
    const div = document.createElement('div'); div.className = 'c-select-item'; div.innerText = item.Name;
    div.onclick = (e) => { e.stopPropagation(); selectCItem(id, item.Id, item.Name); }; list.appendChild(div);
  });
  if (res.length === 0 && q) { list.innerHTML += `<div class="c-select-item text-muted" style="cursor:default">Sonuç bulunamadı.</div>`; }
}

export function selectCItem(id, val, text) { $('csd-' + id).innerText = text; $(id).value = val; $('csm-' + id).classList.remove('show'); }