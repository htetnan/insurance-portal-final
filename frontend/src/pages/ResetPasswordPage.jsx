import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { verifyOtp } from '../services/otpService'
import { PWD_RULES, isStrongPassword } from '../utils/validation'
import PasswordStrengthWidget from '../components/PasswordStrengthWidget'
import { useOtpInput } from '../hooks/useOtpInput'

export default function ResetPasswordPage() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('my') ? 'my' : 'en'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdFocused, setPwdFocused] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    digits, setDigits, seconds, resending,
    inputs, mm, ss, code, BOX_COUNT,
    handleChange, handleKeyDown, handlePaste, handleResend, focus,
  } = useOtpInput(email, 'reset', t)

  const allPwdPassed = isStrongPassword(password)

  const handleSubmit = async e => {
    e.preventDefault()
    if (code.length < BOX_COUNT) { toast.error(t('otp.enterAll')); return }
    if (!allPwdPassed) { toast.error(t('auth.pwdWeak')); return }
    if (password !== confirm) { toast.error(t('auth.passwordMismatch')); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    const result = verifyOtp(email, 'reset', code)
    if (!result.ok) {
      setLoading(false)
      toast.error(result.reason === 'expired' ? t('otp.expired') : t('otp.invalid'))
      setDigits(Array(BOX_COUNT).fill(''))
      focus(0)
      return
    }
    setLoading(false)
    toast.success(t('auth.resetSuccess'))
    navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="text-center mb-4">
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a3a5c,#f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.1rem',
          }}>
            <i className="bi bi-shield-lock" style={{ color: '#fff', fontSize: '1.5rem' }}></i>
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            {t('auth.resetTitle')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '0.2rem' }}>
            {t('otp.subtitle')}
          </p>
          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-all' }}>
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-label-custom mb-2">{t('otp.code')}</label>
          <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
            {digits.map((d, i) => (
              <input key={i} ref={el => inputs.current[i] = el}
                type="text" inputMode="numeric" maxLength={1} value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                onFocus={e => e.target.select()}
                style={{
                  width: 46, height: 52, textAlign: 'center',
                  fontSize: '1.3rem', fontWeight: 700,
                  border: `2px solid ${d ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10, background: 'var(--bg-primary)',
                  color: 'var(--text-primary)', outline: 'none',
                  transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>

          {seconds > 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
              <i className="bi bi-clock me-1"></i>
              {t('otp.expiresIn')} <strong style={{ color: seconds < 60 ? '#ef4444' : 'var(--text-primary)' }}>{mm}:{ss}</strong>
            </p>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <button type="button" onClick={handleResend} disabled={resending} style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.86rem', padding: 0,
              }}>
                {resending
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('otp.resending')}</>
                  : <><i className="bi bi-arrow-repeat me-1"></i>{t('otp.resend')}</>}
              </button>
            </div>
          )}

          <div className="mb-2">
            <label className="form-label-custom">{t('auth.newPassword')} *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} required
                className="form-control-custom w-100" style={{ paddingRight: '2.5rem' }}
                placeholder="Create a strong password"
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={() => setPwdFocused(true)} onBlur={() => setPwdFocused(false)}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0,
              }}>
                <i className={`bi bi-eye${showPwd ? '-slash' : ''}`}></i>
              </button>
            </div>
            {(pwdFocused || password.length > 0) && (
              <PasswordStrengthWidget password={password} lang={lang} compact />
            )}
          </div>

          <div className="mb-3">
            <label className="form-label-custom">{t('auth.confirmPassword')} *</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} required
                className="form-control-custom w-100" style={{ paddingRight: '2.5rem' }}
                placeholder="Repeat new password"
                value={confirm} onChange={e => setConfirm(e.target.value)}
              />
              {confirm.length > 0 && (
                <span style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  color: confirm === password ? '#16a34a' : '#ef4444',
                }}>
                  <i className={`bi bi-${confirm === password ? 'check-circle-fill' : 'x-circle-fill'}`}></i>
                </span>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('auth.resetting')}</>
              : <><i className="bi bi-check-lg me-2"></i>{t('auth.resetPassword')}</>}
          </button>
        </form>

        <div className="divider"></div>
        <Link to="/login" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem',
        }}>
          <i className="bi bi-arrow-left"></i> {t('auth.backToLogin')}
        </Link>
      </div>
    </div>
  )
}
