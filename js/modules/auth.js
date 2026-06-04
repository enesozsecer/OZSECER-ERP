import { $, showConfirm } from '../core/utils.js';

// =========================================================================
// GÜVENLİK: KULLANICI ADI VE ŞİFRE DÜZ METİN OLARAK KODDA YER ALAMAZ!
// =========================================================================
// Aşağıdaki tırnak içindeki hashler geçici ve sahtedir. Sistemi ilk defa 
// çalıştırdığında F12 Konsol ekranından kendi gerçek hashlerini alıp buraya yapıştıracaksın.

const ADMIN_USER_HASH = '$2a$12$s8NV9XgVcqK3HRwio.FoS.2TnJYBNzVkinmDYfuSrxCTBbTKWCxkm'; 
const ADMIN_PASS_HASH = '$2a$10$1PFl6c.YxZdHOnUlydJP7.p9erQtaybRySWBuNBSt/fpDezHb9NZy'; 

export function checkAuth() {
  if (localStorage.getItem('ozsecer_loggedin') === '1') {
    // Beni Hatırla çalışıyorsa direkt içeri al
    $('login-screen').classList.add('hidden');
    $('app-container').classList.remove('hidden');
    window.initApp();
  } else {
    // Oturum kapalı ama Beni Hatırla aktifse: Kutuları doldur (Şifre base64 ile gizlenerek saklanır)
    if (localStorage.getItem('ozsecer_remember') === '1') {
      if ($('log-remember')) $('log-remember').checked = true;
      try {
        if ($('log-user')) $('log-user').value = atob(localStorage.getItem('ozsecer_user') || '');
        if ($('log-pass')) $('log-pass').value = atob(localStorage.getItem('ozsecer_pass') || '');
      } catch (e) { }
    }
  }
}

export function login() {
  const u = $('log-user').value.trim(); 
  const p = $('log-pass').value;
  
  if (!u || !p) {
    $('log-err').innerText = 'Lütfen e-posta ve şifrenizi girin!';
    $('log-err').classList.remove('hidden');
    return;
  }

  const bcrypt = window.dcodeIO ? window.dcodeIO.bcrypt : window.bcrypt;


  // 1. Düz metin olarak girilen E-Posta, kayıtlı Bcrypt Hash ile eşleşiyor mu?
  const isUserValid = bcrypt.compareSync(u, ADMIN_USER_HASH);
  // 2. Düz metin olarak girilen Şifre, kayıtlı Bcrypt Hash ile eşleşiyor mu?
  const isPassValid = bcrypt.compareSync(p, ADMIN_PASS_HASH);

  if (isUserValid && isPassValid) {
    localStorage.setItem('ozsecer_loggedin', '1');
    
    // Beni Hatırla işaretlendiyse inputlardaki verileri tarayıcıda geçici sakla (Base64 ile)
    if ($('log-remember').checked) { 
        localStorage.setItem('ozsecer_remember', '1'); 
        localStorage.setItem('ozsecer_user', btoa(u)); 
        localStorage.setItem('ozsecer_pass', btoa(p)); 
    } else { 
        localStorage.removeItem('ozsecer_remember'); 
        localStorage.removeItem('ozsecer_user'); 
        localStorage.removeItem('ozsecer_pass'); 
    }
    
    $('log-err').classList.add('hidden');
    $('login-screen').classList.add('hidden'); 
    $('app-container').classList.remove('hidden');
    window.initApp();
  } else { 
    $('log-err').innerText = 'Hatalı e-posta veya şifre!';
    $('log-err').classList.remove('hidden'); 
  }
}

export function logoutConfirm() { 
  showConfirm("Oturumu kapatmak istediğinize emin misiniz?", () => { 
      localStorage.removeItem('ozsecer_loggedin'); 
      window.location.reload(); 
  }, '🚪', 'Çıkış'); 
}

export function togglePass() { 
  const p = $('log-pass'); 
  p.type = p.type === 'password' ? 'text' : 'password'; 
  $('log-toggle').innerHTML = p.type === 'password' ? '👁️' : '🙈'; 
}