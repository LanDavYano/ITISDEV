/* this is the mock registered accounts */
const REGISTERED = new Set(['existing@aiesec.ph']);

function showPage(p) {
  if (p === 'login') { showToast('Sign-in page coming soon!'); return; }
  if (p === 'forgot') {
    window.location.href = 'passreset.html';
  }
}

document.querySelectorAll('input[name=role]').forEach(r => {
  r.addEventListener('change', () => {
    document.getElementById('role-admin').classList.toggle('selected', r.value === 'admin' && r.checked);
    document.getElementById('role-member').classList.toggle('selected', r.value === 'member' && r.checked);
    document.querySelectorAll('input[name=role]').forEach(x => {
      document.getElementById('role-'+x.value).classList.toggle('selected', x.checked);
    });
  });
});

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  const hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  btn.textContent = hidden ? '⨯' : '✓';
}

function checkPw() {
  const v = document.getElementById('reg-pw').value;
  toggle('chk-len', v.length >= 8);
  toggle('chk-up', /[A-Z]/.test(v));
  toggle('chk-num', /[0-9]/.test(v));
  toggle('chk-sym', /[^A-Za-z0-9]/.test(v));
}
function toggle(id, ok) {
  document.getElementById(id).classList.toggle('met', ok);
}
function pwValid(v) {
  return v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
}

/* error helpers */
function setErr(fieldId, show) {
  document.getElementById(fieldId).classList.toggle('has-error', show);
}

function submitRegister() {
  const fname = document.getElementById('reg-fname').value.trim();
  const lname = document.getElementById('reg-lname').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const pw    = document.getElementById('reg-pw').value;
  const cpw   = document.getElementById('reg-cpw').value;
  let valid = true;

  setErr('f-fname', !fname); if (!fname) valid = false;
  setErr('f-lname', !lname); if (!lname) valid = false;

  const emailOk = /^[^\s@]+@aiesec\.ph$/i.test(email);
  if (!emailOk) {
    setErr('f-email', true);
    document.getElementById('email-err').textContent = 'Must be a valid @aiesec.ph address.';
    valid = false;
  } else if (REGISTERED.has(email)) {
    setErr('f-email', true);
    document.getElementById('email-err').textContent = 'This email is already registered. Sign in instead.';
    valid = false;
  } else {
    setErr('f-email', false);
  }

  if (!pwValid(pw)) { setErr('f-pw', true); valid = false; } else { setErr('f-pw', false); }
  if (pw !== cpw || !cpw) { setErr('f-cpw', true); valid = false; } else { setErr('f-cpw', false); }

  if (!valid) return;
  REGISTERED.add(email);
  showToast('Account created! You can now sign in.');
  document.getElementById('reg-fname').value = '';
  document.getElementById('reg-lname').value = '';
  document.getElementById('reg-email').value = '';
  document.getElementById('reg-pw').value = '';
  document.getElementById('reg-cpw').value = '';
  checkPw();
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}
