import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-toastify'
import { useTranslation } from 'react-i18next'

export default function AgentLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const from = location.state?.from?.pathname || '/agent/dashboard'

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (user.role !== 'AGENT') {
        sessionStorage.removeItem('token')
        window.location.reload()
        toast.error(t('agent.login.agentOnly'))
        return
      }
      toast.success(t('agent.login.welcomeBack'))
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || ''
      toast.error(msg || t('agent.login.invalidCredentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="text-center mb-4">
          <div style={{
            width: 52, height: 52, background: '#1e40af', borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem'
          }}>
            <i className="bi bi-person-badge" style={{ color: '#fff', fontSize: '1.4rem' }}></i>
          </div>
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '1.5rem' }}>
            {t('agent.login.title')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('agent.login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label-custom">
              {t('agent.login.emailLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-envelope" style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none'
              }}></i>
              <input
                type="email" required
                className="form-control-custom w-100"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="agent@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label-custom">
              {t('agent.login.passwordLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <i className="bi bi-lock" style={{
                position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-muted)', pointerEvents: 'none'
              }}></i>
              <input
                type={showPwd ? 'text' : 'password'} required
                className="form-control-custom w-100"
                style={{ paddingLeft: '2.25rem', paddingRight: '2.5rem' }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0
              }}>
                <i className={`bi bi-eye${showPwd ? '-slash' : ''}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary-custom w-100"
            style={{ justifyContent: 'center', background: '#1e40af', borderColor: '#1e40af' }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('agent.login.signingIn')}</>
              : t('agent.login.signIn')}
          </button>
        </form>

        <div className="divider"></div>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem'
        }}>
          <i className="bi bi-arrow-left"></i>
          {t('agent.login.backHome')}
        </a>
      </div>
    </div>
  )
}
