import { $, showConfirm } from '../core/utils.js';
import { initApp } from './home.js';

export function checkAuth() {
  if (localStorage.getItem('ozsecer_loggedin') === '1') {
    $('login-screen').classList.add('hidden');
    $('app-container').classList.remove('hidden');
    initApp();
  } else {
    if (localStorage.getItem('ozsecer_remember') === '1') {
      if ($('log-remember')) $('log-remember').checked = true;
      if ($('log-user')) $('log-user').value = localStorage.getItem('ozsecer_user') || '';
      if ($('log-pass')) $('log-pass').value = atob(localStorage.getItem('ozsecer_pass') || '');
    }
  }
}

export function login() {
  const u = $('log-user').value.trim();
  const p = $('log-pass').value;
  if (u === 'oztoptanpazarlama@gmail.com' && p === 'Oztoptan6595.') {
    localStorage.setItem('ozsecer_loggedin', '1');
    if ($('log-remember').checked) {
      localStorage.setItem('ozsecer_remember', '1');
      localStorage.setItem('ozsecer_user', u);
      localStorage.setItem('ozsecer_pass', btoa(p));
    } else {
      localStorage.removeItem('ozsecer_remember');
      localStorage.removeItem('ozsecer_user');
      localStorage.removeItem('ozsecer_pass');
    }
    $('login-screen').classList.add('hidden');
    $('app-container').classList.remove('hidden');
    initApp();
  } else {
    $('log-err').innerText = 'Hatalı e-posta veya şifre!';
    $('log-err').classList.remove('hidden');
  }
}

export function logoutConfirm() {
  showConfirm("Oturumu kapatmak istediğinizden emin misiniz?", () => {
    localStorage.removeItem('ozsecer_loggedin');
    window.location.reload();
  }, '🚪', 'Çıkış');
}

export function togglePass() {
  const p = $('log-pass');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('log-toggle').innerHTML = p.type === 'password' ? '👁️' : '🙈';
}