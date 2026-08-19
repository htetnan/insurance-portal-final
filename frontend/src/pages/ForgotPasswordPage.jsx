import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { issueOtp } from '../services/otpService'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await issueOtp(email, 'reset')
      toast.success(t('otp.sent'))
    } catch (err) {
      const detail = err?.emailjsDetail || err?.message || ''
      toast.warn(`${t('otp.sendError')} — ${detail}`, { autoClose: false })
    }
    setLoading(false)
    navigate(`/reset-password?email=${encodeURIComponent(email)}`)
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 400, textAlign: 'center' }}>

        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1a3a5c,#f59e0b)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.25rem',
        }}>
          <i className="bi bi-lock-fill" style={{ color: '#fff', fontSize: '1.5rem' }}></i>
        </div>

        <h2 style={{ fontWeight: 700, fontSize: '1.4rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          {t('auth.forgotTitle')}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
          {t('auth.forgotSubtitle')}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="mb-3">
            <label className="form-label-custom">{t('auth.email')}</label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-envelope" style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none',
              }}></i>
              <input
                type="email" required
                className="form-control-custom w-100"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('auth.sending')}</>
              : <><i className="bi bi-send me-2"></i>{t('auth.sendCode')}</>}
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
