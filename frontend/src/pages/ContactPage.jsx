import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../services/api'
import { toast } from 'react-toastify'

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' }

export default function ContactPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [loading, setLoading] = useState(false)

  // Returns i18n keys so the component can call t() on them
  const validate = (f) => {
    const errs = {}
    if (!f.name.trim())               errs.name    = 'contact.errNameRequired'
    else if (f.name.trim().length < 2) errs.name   = 'contact.errNameMin'

    if (!f.email.trim())              errs.email   = 'contact.errEmailRequired'
    else if (!/^[a-z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(f.email))
                                      errs.email   = 'contact.errEmailFormat'

    if (f.phone.trim() && !/^\+95\d{7,10}$/.test(f.phone.trim()))
                                      errs.phone   = 'contact.errPhoneFormat'

    if (!f.subject.trim())            errs.subject = 'contact.errSubjectRequired'
    else if (f.subject.trim().length < 3) errs.subject = 'contact.errSubjectMin'

    if (!f.message.trim())            errs.message = 'contact.errMessageRequired'
    else if (f.message.trim().length < 10) errs.message = 'contact.errMessageMin'

    return errs
  }

  const handleChange = e => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    if (touched[name]) {
      const errs = validate({ ...form, [name]: value })
      setErrors(prev => ({ ...prev, [name]: errs[name] }))
    }
  }

  const handleBlur = e => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))
    const errs = validate(form)
    setErrors(prev => ({ ...prev, [name]: errs[name] }))
  }

  const handleSubmit = async e => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    setTouched({ name: true, email: true, phone: true, subject: true, message: true })
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    try {
      await api.post('/contact', form)
      toast.success(t('contact.success'))
      setForm(EMPTY); setErrors({}); setTouched({})
    } catch {
      toast.success(t('contact.success'))
      setForm(EMPTY); setErrors({}); setTouched({})
    } finally {
      setLoading(false)
    }
  }

  const fieldStyle = name => ({
    borderColor: errors[name] ? '#dc2626' : touched[name] && !errors[name] ? '#16a34a' : undefined,
  })

  const ErrorMsg = ({ name }) => errors[name]
    ? <div style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '0.25rem' }}>
        <i className="bi bi-exclamation-circle me-1"></i>{t(errors[name])}
      </div>
    : touched[name] && !errors[name]
    ? <div style={{ color: '#16a34a', fontSize: '0.78rem', marginTop: '0.25rem' }}>
        <i className="bi bi-check-circle me-1"></i>{t('contact.looksGood')}
      </div>
    : null

  const contactItems = [
    { icon: 'bi-geo-alt-fill',  titleKey: 'contact.addressLabel', textKey: 'contact.addressValue' },
    { icon: 'bi-telephone-fill', titleKey: 'contact.phoneLabel',  textKey: 'contact.phoneValue' },
    { icon: 'bi-envelope-fill', titleKey: 'contact.emailLabel',   textKey: 'contact.emailValue' },
    { icon: 'bi-clock-fill',    titleKey: 'contact.hoursLabel',   textKey: 'contact.hoursValue' },
  ]

  return (
    <div>
      <Navbar />

      <section style={{ background: 'var(--bg)', padding: '3.5rem 0 2rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container text-center">
          <h1 className="section-title">{t('contact.title')}</h1>
          <p className="section-subtitle mx-auto">{t('contact.subtitle')}</p>
        </div>
      </section>

      <section style={{ background: 'var(--bg-secondary)', padding: '4rem 0' }}>
        <div className="container">
          <div className="row g-5">

            {/* ── Contact Info ── */}
            <div className="col-12 col-lg-5">
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                {t('contact.info')}
              </h4>
              {contactItems.map(item => (
                <div key={item.icon} className="d-flex gap-3 mb-3">
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: 'var(--bg-card)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={`bi ${item.icon}`} style={{ color: 'var(--primary)' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {t(item.titleKey)}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                      {t(item.textKey)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="card-custom mt-4">
                <h6 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  <i className="bi bi-headset me-2" style={{ color: 'var(--accent)' }}></i>
                  {t('contact.emergency')}
                </h6>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                  {t('contact.emergencyDesc')}{' '}
                  <strong>{t('contact.emergencyHotline')}</strong>{' '}
                  {t('contact.emergencyAvail')}
                </p>
              </div>
            </div>

            {/* ── Contact Form ── */}
            <div className="col-12 col-lg-7">
              <div className="auth-card" style={{ maxWidth: '100%' }}>
                <h5 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                  {t('contact.formTitle')}
                </h5>
                <form onSubmit={handleSubmit} noValidate>
                  <div className="row g-3">
                    <div className="col-12 col-sm-6">
                      <label className="form-label-custom">{t('contact.fullName')} *</label>
                      <input name="name" className="form-control-custom w-100" placeholder="John Doe"
                        value={form.name} onChange={handleChange} onBlur={handleBlur}
                        style={fieldStyle('name')} />
                      <ErrorMsg name="name" />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label-custom">{t('contact.emailAddress')} *</label>
                      <input name="email" type="email" className="form-control-custom w-100" placeholder="john@example.com"
                        value={form.email} onChange={handleChange} onBlur={handleBlur}
                        style={fieldStyle('email')} />
                      <ErrorMsg name="email" />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label-custom">
                        {t('contact.phoneNumber')}{' '}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t('contact.phoneOptional')}</span>
                      </label>
                      <input name="phone" className="form-control-custom w-100" placeholder="+95 9xxxxxxxxx"
                        value={form.phone} onChange={handleChange} onBlur={handleBlur}
                        style={fieldStyle('phone')} />
                      <ErrorMsg name="phone" />
                    </div>
                    <div className="col-12 col-sm-6">
                      <label className="form-label-custom">{t('contact.subject')} *</label>
                      <input name="subject" className="form-control-custom w-100" placeholder="Policy inquiry"
                        value={form.subject} onChange={handleChange} onBlur={handleBlur}
                        style={fieldStyle('subject')} />
                      <ErrorMsg name="subject" />
                    </div>
                    <div className="col-12">
                      <label className="form-label-custom">
                        {t('contact.message')} *{' '}
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{t('contact.messageMin')}</span>
                      </label>
                      <textarea name="message" rows={5} className="form-control-custom w-100"
                        placeholder="How can we help you?"
                        value={form.message} onChange={handleChange} onBlur={handleBlur}
                        style={{ resize: 'vertical', ...fieldStyle('message') }} />
                      <div className="d-flex justify-content-between align-items-start">
                        <ErrorMsg name="message" />
                        <span style={{
                          fontSize: '0.75rem',
                          color: form.message.length < 10 ? 'var(--text-muted)' : '#16a34a',
                          marginLeft: 'auto', marginTop: '0.25rem',
                        }}>
                          {form.message.length} / 10 min
                        </span>
                      </div>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary-custom mt-3"
                    style={{ width: '100%', justifyContent: 'center' }}>
                    {loading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('contact.sending')}</>
                      : <><i className="bi bi-send me-2"></i>{t('contact.send')}</>}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
