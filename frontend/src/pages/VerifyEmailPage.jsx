import { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { verifyOtp, getPendingRegistration, clearPendingRegistration } from '../services/otpService'
import { useAuth } from '../context/AuthContext'
import { useOtpInput } from '../hooks/useOtpInput'

export default function VerifyEmailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const email = params.get('email') || ''
  const { register } = useAuth()

  const [loading, setLoading] = useState(false)
  const {
    digits, setDigits, seconds, resending,
    inputs, mm, ss, code, BOX_COUNT,
    handleChange, handleKeyDown, handlePaste, handleResend, focus,
  } = useOtpInput(email, 'verify', t)

  const handleSubmit = async e => {
    e.preventDefault()
    if (code.length < BOX_COUNT) { toast.error(t('otp.enterAll')); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    const result = verifyOtp(email, 'verify', code)

    if (!result.ok) {
      setLoading(false)
      toast.error(result.reason === 'expired' ? t('otp.expired') : t('otp.invalid'))
      setDigits(Array(BOX_COUNT).fill(''))
      focus(0)
      return
    }

    // OTP verified — now create the account in the database
    const pending = getPendingRegistration(email)
    if (pending) {
      try {
        await register(pending)
        clearPendingRegistration(email)
      } catch (err) {
        setLoading(false)
        toast.error(err.response?.data?.message || t('auth.registerError'))
        return
      }
    }

    setLoading(false)
    toast.success(t('emailVerify.confirmSuccessTitle') || 'Email verified! Please log in.')
    navigate('/login')
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="text-center mb-4">
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'linear-gradient(135deg,#1a3a5c,#16a34a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.1rem',
          }}>
            <i className="bi bi-envelope-check" style={{ color: '#fff', fontSize: '1.5rem' }}></i>
          </div>
          <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
            {t('emailVerify.title') || 'Verify your email'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginBottom: '0.2rem' }}>
            {t('otp.subtitle') || 'Enter the 6-digit code sent to'}
          </p>
          <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.88rem', wordBreak: 'break-all' }}>
            {email}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="form-label-custom mb-2">{t('otp.code') || 'Verification Code'}</label>
          <div style={{ display: 'flex', gap: '0.45rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
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
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
              <i className="bi bi-clock me-1"></i>
              {t('otp.expiresIn') || 'Expires in'}{' '}
              <strong style={{ color: seconds < 60 ? '#ef4444' : 'var(--text-primary)' }}>{mm}:{ss}</strong>
            </p>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <button type="button" onClick={handleResend} disabled={resending} style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontWeight: 600, cursor: 'pointer', fontSize: '0.86rem', padding: 0,
              }}>
                {resending
                  ? <><span className="spinner-border spinner-border-sm me-1"></span>{t('otp.resending') || 'Resending…'}</>
                  : <><i className="bi bi-arrow-repeat me-1"></i>{t('otp.resend') || 'Resend code'}</>}
              </button>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('auth.verifying') || 'Verifying…'}</>
              : <><i className="bi bi-check-lg me-2"></i>{t('otp.verify')}</>}
          </button>
        </form>

        <div className="divider"></div>
        <Link to="/login" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem',
        }}>
          <i className="bi bi-arrow-left"></i> {t('auth.backToLogin') || 'Back to Login'}
        </Link>
      </div>
    </div>
  )
}
