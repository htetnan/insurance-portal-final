import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { issueOtp, storePendingRegistration } from '../services/otpService'
import api from '../services/api'
import {
  EMAIL_PATTERN, EMAIL_MAX_LENGTH, EMAIL_ERROR,
  isEmailValid, PWD_RULES, passwordStrengthLevel, isStrongPassword,
} from '../utils/validation'

export default function RegisterPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '', email: '', address: '', password: '', confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [agree, setAgree] = useState(false)
  const [pwdFocused, setPwdFocused] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)

  const lang = i18n.language?.startsWith('my') ? 'my' : 'en'
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const emailValid = form.email.length === 0 || isEmailValid(form.email)
  const allRulesPassed = isStrongPassword(form.password)
  const { level, label: strengthLabel, color: strengthColor } = passwordStrengthLevel(form.password)

  const handleSubmit = async e => {
    e.preventDefault()
    setEmailTouched(true)
    if (!isEmailValid(form.email)) { return }
    if (!allRulesPassed) { toast.error(t('auth.pwdWeak')); return }
    if (form.password !== form.confirmPassword) { toast.error(t('auth.passwordMismatch')); return }
    if (!agree) { toast.error(t('auth.mustAgree')); return }
    setLoading(true)
    const { confirmPassword, ...payload } = form

    // Step 1: check email availability — account is NOT created yet
    try {
      await api.get(`/auth/check-email?email=${encodeURIComponent(payload.email)}`)
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.registerError'))
      setLoading(false)
      return
    }

    // Step 2: stash pending registration data in sessionStorage
    storePendingRegistration(payload)

    // Step 3: send OTP — account stays out of DB until code is verified
    try {
      await issueOtp(payload.email, 'verify')
      toast.success(t('otp.sent') || 'Verification code sent!')
    } catch (err) {
      const detail = err?.emailjsDetail || err?.message || ''
      toast.warn(`${t('otp.sendError') || 'Could not send code'} — ${detail}`, { autoClose: false })
    }
    setLoading(false)
    navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`)
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="text-center mb-4">
          <div className="auth-logo-wrap">
            <img src="/dicp-logo.svg" alt="DICP Logo" className="auth-logo-img" />
          </div>
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', fontSize: '1.5rem' }}>
            {t('auth.createAccount')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {t('auth.registerSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-sm-6">
              <label className="form-label-custom">{t('auth.fullName')} *</label>
              <input name="name" required className="form-control-custom w-100" placeholder="John Doe"
                value={form.name} onChange={handleChange} />
            </div>
            <div className="col-12 col-sm-6">
              <label className="form-label-custom">{t('auth.email')} *</label>
              <input name="email" type="email" required className="form-control-custom w-100"
                placeholder="you@example.com" value={form.email} onChange={handleChange}
                maxLength={EMAIL_MAX_LENGTH}
                onBlur={() => setEmailTouched(true)}
                style={emailTouched && !emailValid ? { borderColor: '#ef4444' } : undefined} />
              {emailTouched && !emailValid && (
                <p style={{ fontSize: '0.76rem', color: '#ef4444', margin: '0.25rem 0 0' }}>
                  {EMAIL_ERROR[lang]}
                </p>
              )}
            </div>
            <div className="col-12">
              <label className="form-label-custom">{t('auth.address')}</label>
              <input name="address" className="form-control-custom w-100"
                placeholder="Yangon, Myanmar" value={form.address} onChange={handleChange} />
            </div>

            {/* Password with live requirements */}
            <div className="col-12">
              <label className="form-label-custom">{t('auth.password')} *</label>
              <div style={{ position: 'relative' }}>
                <input
                  name="password" type={showPwd ? 'text' : 'password'} required
                  className="form-control-custom w-100" style={{ paddingRight: '2.5rem' }}
                  placeholder="Create a strong password"
                  value={form.password} onChange={handleChange}
                  onFocus={() => setPwdFocused(true)}
                  onBlur={() => setPwdFocused(false)}
                />
                <button type="button" onClick={() => setShowPwd(v => !v)} style={{
                  position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0
                }}>
                  <i className={`bi bi-eye${showPwd ? '-slash' : ''}`}></i>
                </button>
              </div>

              {/* Strength bar */}
              {form.password.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 99,
                        background: i <= level ? strengthColor : 'var(--border)',
                        transition: 'background 0.25s',
                      }} />
                    ))}
                  </div>
                  {strengthLabel && (
                    <p style={{ fontSize: '0.78rem', color: strengthColor, margin: '0.25rem 0 0', fontWeight: 600 }}>
                      {strengthLabel}
                    </p>
                  )}
                </div>
              )}

              {/* Requirements checklist — shows on focus or while typing */}
              {(pwdFocused || form.password.length > 0) && (
                <div style={{
                  marginTop: '0.6rem', padding: '0.75rem 1rem',
                  background: 'var(--bg-secondary, #f8fafc)',
                  border: '1px solid var(--border)', borderRadius: 10,
                }}>
                  {PWD_RULES.map(r => {
                    const passed = r.test(form.password)
                    return (
                      <div key={r.key} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        marginBottom: '0.3rem', fontSize: '0.82rem',
                        color: passed ? '#16a34a' : 'var(--text-muted)',
                        transition: 'color 0.2s',
                      }}>
                        <div style={{
                          width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: passed ? '#16a34a' : 'transparent',
                          border: `1.5px solid ${passed ? '#16a34a' : 'var(--text-muted)'}`,
                          transition: 'all 0.2s',
                        }}>
                          {passed && <i className="bi bi-check" style={{ color: '#fff', fontSize: '0.6rem', lineHeight: 1 }}></i>}
                        </div>
                        {r.label[lang]}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="col-12">
              <label className="form-label-custom">{t('auth.confirmPassword')} *</label>
              <div style={{ position: 'relative' }}>
                <input name="confirmPassword" type={showPwd ? 'text' : 'password'} required
                  className="form-control-custom w-100" style={{ paddingRight: '2.5rem' }}
                  placeholder="Repeat password"
                  value={form.confirmPassword} onChange={handleChange} />
                {form.confirmPassword.length > 0 && (
                  <span style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    fontSize: '1rem',
                    color: form.confirmPassword === form.password ? '#16a34a' : '#ef4444',
                  }}>
                    <i className={`bi bi-${form.confirmPassword === form.password ? 'check-circle-fill' : 'x-circle-fill'}`}></i>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="d-flex align-items-start gap-2 mt-3">
            <input type="checkbox" id="agree" checked={agree} onChange={e => setAgree(e.target.checked)}
              style={{ marginTop: '0.2rem', flexShrink: 0 }} />
            <label htmlFor="agree" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              {t('auth.agreeText')}{' '}
              <Link to="/terms" style={{ color: 'var(--primary)' }}>{t('auth.termsLink')}</Link>{' & '}
              <Link to="/privacy" style={{ color: 'var(--primary)' }}>{t('auth.privacyLink')}</Link>
            </label>
          </div>

          <button type="submit" disabled={loading || !agree}
            className="btn-primary-custom mt-3 w-100" style={{ justifyContent: 'center' }}>
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('auth.registering')}</>
              : t('auth.register')}
          </button>
        </form>

        <div className="text-center mt-4">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {t('auth.haveAccount')}{' '}
            <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
              {t('auth.loginHere')}
            </Link>
          </p>
        </div>
        <div className="divider"></div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}>
          <i className="bi bi-arrow-left"></i> {t('auth.backHome')}
        </Link>
      </div>
    </div>
  )
}
