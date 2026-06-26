/* ─── mock data ─── */
const DEMO_OTP = '123456';
let otpTarget = '';
let otpTimerInterval = null;
let otpSeconds = 600;

function showPage(p) {
  if (p === 'login' || p === 'register') {
    window.location.href = 'register.html';
  }
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  const hidden = inp.type === 'password';
  inp.type = hidden ? 'text' : 'password';
  btn.textContent = hidden ? '⨯' : '✓';
}

function checkNewPw() {
  const v = document.getElementById('new-pw').value;
  toggle('nchk-len', v.length >= 8);
  toggle('nchk-up', /[A-Z]/.test(v));
  toggle('nchk-num', /[0-9]/.test(v));
  toggle('nchk-sym', /[^A-Za-z0-9]/.test(v));
}
function toggle(id, ok) {
  document.getElementById(id).classList.toggle('met', ok);
}
function pwValid(v) {
  return v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
}

function setErr(fieldId, show) {
  document.getElementById(fieldId).classList.toggle('has-error', show);
}

function sendOtp() {
  const email = document.getElementById('rp-email').value.trim().toLowerCase();
  const ok = /^[^\s@]+@aiesec\.ph$/i.test(email);
  setErr('f-rp-email', !ok);
  if (!ok) return;

  otpTarget = email;
  document.getElementById('otp-email-label').textContent = email;
  goFpStep(2);
  startOtpTimer();
  showToast('Verification code sent to ' + email + ' (demo: 123456)');
}

function verifyOtp() {
  const val = document.getElementById('otp-input').value.trim();
  if (val !== DEMO_OTP) { setErr('f-otp', true); return; }
  setErr('f-otp', false);
  clearInterval(otpTimerInterval);
  goFpStep(3);
}

function resendOtp() {
  otpSeconds = 600;
  clearInterval(otpTimerInterval);
  startOtpTimer();
  showToast('📧 Code resent! (demo: 123456)');
}

function startOtpTimer() {
  otpTimerInterval = setInterval(() => {
    otpSeconds--;
    const m = String(Math.floor(otpSeconds / 60)).padStart(2, '0');
    const s = String(otpSeconds % 60).padStart(2, '0');
    const el = document.getElementById('otp-timer');
    if (el) el.textContent = m + ':' + s;
    if (otpSeconds <= 0) {
      clearInterval(otpTimerInterval);
      if (el) el.textContent = 'Expired';
    }
  }, 1000);
}

function submitNewPw() {
  const np  = document.getElementById('new-pw').value;
  const cnp = document.getElementById('confirm-new-pw').value;
  let valid = true;
  if (!pwValid(np)) { setErr('f-np', true); valid = false; } else { setErr('f-np', false); }
  if (np !== cnp || !cnp) { setErr('f-cnp', true); valid = false; } else { setErr('f-cnp', false); }
  if (!valid) return;
  goFpStep(4);
  showToast('Password updated successfully!');
}

function goFpStep(n) {
  [1,2,3].forEach(i => {
    document.getElementById('fp-step'+i).style.display = 'none';
  });
  document.getElementById('fp-success').classList.remove('visible');
  if (n <= 3) document.getElementById('fp-step'+n).style.display = 'block';
  else document.getElementById('fp-success').classList.add('visible');

  [1,2,3].forEach(i => {
    const s = document.getElementById('s'+i);
    s.classList.remove('active','done');
    if (i < n) s.classList.add('done');
    else if (i === n) s.classList.add('active');
  });
  [1,2].forEach(i => {
    document.getElementById('line-'+i).classList.toggle('done', i < n);
  });
}

function resetForgot() {
  clearInterval(otpTimerInterval);
  otpSeconds = 600;
  otpTarget = '';
  document.getElementById('rp-email').value = '';
  document.getElementById('otp-input').value = '';
  document.getElementById('new-pw').value = '';
  document.getElementById('confirm-new-pw').value = '';
  ['f-rp-email','f-otp','f-np','f-cnp'].forEach(id => setErr(id, false));
  checkNewPw();
  goFpStep(1);
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

resetForgot();
