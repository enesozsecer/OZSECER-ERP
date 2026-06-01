import { DB, loadDB } from '../core/db.js';
import { $ } from '../core/utils.js';
import { loadGrupSelects, renderCari, openCariModal } from './cari.js';
import { loadUrunGrupSelects, renderUrun, openUrunModal } from './urun.js';
import { renderSip, openSiparisModal } from './siparis.js';
import { renderKasa, openKasaModal } from './kasa.js';
import { renderAnaliz } from './analiz.js';

export let currentView = 'home';

export function toggleTheme() {
  const html = document.documentElement;
  const t = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', t);
  localStorage.setItem('e3_theme', t);
  $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
}

export function goTo(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(e => e.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
  const targetView = $(`view-${view}`);
  if (targetView) targetView.classList.remove('hidden');
  const targetNav = $(`nav-${view}`);
  if (targetNav) targetNav.classList.add('active');

  const titles = { home: 'Ana Sayfa', cari: 'Cari Hesaplar', urun: 'Ürünler', sip: 'Siparişler', kasa: 'Kasa', analiz: 'Analiz', ayarlar: 'Sistem Yönetimi' };
  const topTitle = $('top-title');
  if (topTitle) topTitle.innerText = titles[view] || 'OZSECER';

  const fab = $('main-fab');
  if (fab) {
    if (['cari', 'urun', 'sip', 'kasa'].includes(view)) { fab.style.display = 'flex'; }
    else { fab.style.display = 'none'; }
  }

  if (view === 'home') renderHome();
  if (view === 'cari') $('cari-list').innerHTML = '';
  if (view === 'urun') $('urun-list').innerHTML = '';
  if (view === 'sip') $('sip-list').innerHTML = '';
  if (view === 'kasa') $('kasa-list').innerHTML = '';
  if (view === 'analiz') $('analiz-grid').innerHTML = '';
}

export function renderHome() {} // Şimdilik sadece placeholder olarak tutuluyor

export function initApp() {
  const t = localStorage.getItem('e3_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  $('theme-btn').innerHTML = t === 'dark' ? '☀️' : '🌙';
  if (!localStorage.getItem('ozsecer_cihaz')) localStorage.setItem('ozsecer_cihaz', 'Cihaz_' + Math.floor(Math.random() * 1000));
  loadDB();
  loadGrupSelects();
  loadUrunGrupSelects();
  goTo('home');

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.dropdown-wrap')) {
      document.querySelectorAll('.dropdown-list').forEach(l => l.classList.add('hidden'));
    }
    if (!e.target.closest('.c-select')) {
      document.querySelectorAll('.c-select-menu').forEach(m => m.classList.remove('show'));
    }
  });
}

export function openCurrentAddModal() {
  if (currentView === 'cari') openCariModal();
  else if (currentView === 'urun') openUrunModal();
  else if (currentView === 'sip') openSiparisModal();
  else if (currentView === 'kasa') openKasaModal();
}

// C-SELECT FONKSİYONLARI
export function toggleCSelect(id, dataSource) {
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

export function renderCSelectList(id, dataSource, query) {
  const q = query.toLowerCase().trim();
  const list = $('csl-' + id);
  list.innerHTML = '';
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

export function selectCItem(id, val, text) {
  $('csd-' + id).innerText = text;
  $(id).value = val;
  $('csm-' + id).classList.remove('show');
}