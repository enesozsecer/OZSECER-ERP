export let DB = { c: [], u: [], s: [], t: [], g: [], ug: [], k: [] };

export function loadDB() {
  try { DB.c = JSON.parse(localStorage.getItem('e3_c')) || []; } catch (e) { DB.c = []; }
  try { DB.u = JSON.parse(localStorage.getItem('e3_u')) || []; } catch (e) { DB.u = []; }
  try { DB.s = JSON.parse(localStorage.getItem('e3_s')) || []; } catch (e) { DB.s = []; }
  try { DB.t = JSON.parse(localStorage.getItem('e3_t')) || []; } catch (e) { DB.t = []; }
  try { DB.g = JSON.parse(localStorage.getItem('e3_g')) || []; } catch (e) { DB.g = []; }
  try { DB.ug = JSON.parse(localStorage.getItem('e3_ug')) || []; } catch (e) { DB.ug = []; }
  try { DB.k = JSON.parse(localStorage.getItem('e3_k')) || []; } catch (e) { DB.k = []; }
}

export function saveDB() {
  localStorage.setItem('e3_c', JSON.stringify(DB.c));
  localStorage.setItem('e3_u', JSON.stringify(DB.u));
  localStorage.setItem('e3_s', JSON.stringify(DB.s));
  localStorage.setItem('e3_t', JSON.stringify(DB.t));
  localStorage.setItem('e3_g', JSON.stringify(DB.g));
  localStorage.setItem('e3_ug', JSON.stringify(DB.ug));
  localStorage.setItem('e3_k', JSON.stringify(DB.k));
}