import { useState } from 'react';
import Mark from './Mark.jsx';
import { AdBtn } from './primitives.jsx';
import { Field } from './Modal.jsx';
import { useAuth } from '../lib/auth.jsx';

// Normalize a VN phone to E.164 (+84…). '0905 123 456' → '+84905123456'.
function toE164(raw) {
  const d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('+')) return d;
  if (d.startsWith('0')) return '+84' + d.slice(1);
  if (d.startsWith('84')) return '+' + d;
  return '+84' + d;
}

export default function Login() {
  const { sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [attempts, setAttempts] = useState(0);

  const e164 = toE164(phone);
  const phoneOk = /^\+\d{11,12}$/.test(e164);
  const lockedOut = attempts >= 5;

  const submitPhone = async () => {
    if (!phoneOk || busy) return;
    setBusy(true); setErr('');
    const { error } = await sendOtp(e164);
    setBusy(false);
    if (error) setErr(error.message);
    else setStep('otp');
  };

  const submitOtp = async () => {
    if (code.length < 4 || busy || lockedOut) return;
    setBusy(true); setErr('');
    const { error } = await verifyOtp(e164, code.trim());
    setBusy(false);
    if (error) { setErr(error.message); setAttempts((a) => a + 1); }
    // success → onAuthStateChange swaps the app to the console
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div style={{ width: 'min(380px, 100%)', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, boxShadow: 'var(--shadow)', padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Mark size={40} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: -0.3 }}>ĐiChung</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Admin Console</div>
          </div>
        </div>

        {step === 'phone' ? (
          <>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Đăng nhập</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Nhập số điện thoại để nhận mã OTP.</div>
            <form onSubmit={(e) => { e.preventDefault(); submitPhone(); }}>
              <Field label="Số điện thoại" value={phone} onChange={setPhone} placeholder="0909 000 001" autoFocus />
              {err && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 8 }}>{err}</div>}
              <div style={{ marginTop: 16 }}>
                <button type="submit" disabled={!phoneOk || busy} style={ctaStyle(phoneOk && !busy)}>{busy ? 'Đang gửi…' : 'Gửi mã OTP'}</button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Nhập mã OTP</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>Đã gửi tới {e164}.</div>
            <form onSubmit={(e) => { e.preventDefault(); submitOtp(); }}>
              <Field label="Mã OTP" value={code} onChange={(v) => setCode(v.replace(/\D/g, ''))} placeholder="••••••" autoFocus />
              {err && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 8 }}>{err}</div>}
              {lockedOut && <div style={{ fontSize: 12.5, color: '#b91c1c', marginTop: 8 }}>Quá nhiều lần thử. Hãy bấm “Đổi số” để gửi lại mã.</div>}
              <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
                <AdBtn tone="light" sm onClick={() => { setStep('phone'); setErr(''); setCode(''); setAttempts(0); }}>Đổi số</AdBtn>
                <button type="submit" disabled={code.length < 4 || busy || lockedOut} style={{ ...ctaStyle(code.length >= 4 && !busy && !lockedOut), flex: 1 }}>{busy ? 'Đang xác minh…' : 'Xác minh'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function ctaStyle(enabled) {
  return {
    width: '100%', border: 'none', borderRadius: 12, padding: '12px 18px',
    background: enabled ? 'var(--brand)' : 'var(--line)', color: enabled ? '#fff' : 'var(--muted)',
    fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: enabled ? 'pointer' : 'not-allowed',
  };
}
