import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'

export default function AgentMessagesPage() {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState({ admins: [], customers: [] })
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [recipientType, setRecipientType] = useState('ADMIN')
  const [recipientId, setRecipientId] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    api.get('/agent/contacts')
      .then(res => {
        setContacts({
          admins: Array.isArray(res.data.admins) ? res.data.admins : [],
          customers: Array.isArray(res.data.customers) ? res.data.customers : [],
        })
      })
      .catch(() => setContacts({ admins: [], customers: [] }))
      .finally(() => setLoadingContacts(false))
  }, [])

  const recipientList = recipientType === 'ADMIN' ? contacts.admins : contacts.customers

  const handleTypeChange = (type) => { setRecipientType(type); setRecipientId('') }

  const handleSend = async e => {
    e.preventDefault()
    if (!recipientId) { toast.error(t('agent.messages.recipientRequired')); return }
    if (!subject.trim()) { toast.error(t('agent.messages.subjectRequired')); return }
    if (!body.trim()) { toast.error(t('agent.messages.bodyRequired')); return }
    setSending(true)
    try {
      await api.post('/agent/messages', { recipientId: String(recipientId), subject, body })
      toast.success(t('agent.messages.sendSuccess'))
      setSent(true)
      setSubject(''); setBody(''); setRecipientId('')
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      toast.error(err.response?.data?.message || t('agent.messages.sendFailed'))
    } finally { setSending(false) }
  }

  const infoItems = [
    {
      icon: 'bi-shield-lock', color: '#9333ea',
      title: t('agent.messages.adminTitle'),
      desc: t('agent.messages.adminDesc'),
    },
    {
      icon: 'bi-person', color: '#16a34a',
      title: t('agent.messages.customerTitle'),
      desc: t('agent.messages.customerDesc'),
    },
    {
      icon: 'bi-bell', color: '#1d4ed8',
      title: t('agent.messages.notifTitle'),
      desc: t('agent.messages.notifDesc'),
    },
  ]

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          {t('agent.messages.title')}
        </h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          {t('agent.messages.subtitle')}
        </p>
      </div>

      <div className="row g-4">
        {/* Compose panel */}
        <div className="col-12 col-lg-7">
          <div className="card-custom">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              <i className="bi bi-envelope-plus me-2" style={{ color: 'var(--primary)' }}></i>
              {t('agent.messages.compose')}
            </h6>

            {loadingContacts ? (
              <div className="text-center py-4">
                <span className="spinner-border" style={{ color: 'var(--primary)' }}></span>
              </div>
            ) : (
              <form onSubmit={handleSend}>
                {/* Recipient type toggle */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    {t('agent.messages.sendTo')}
                  </label>
                  <div className="d-flex gap-2">
                    {[
                      { value: 'ADMIN',    label: 'Admin',    icon: 'bi-shield-lock', color: '#9333ea' },
                      { value: 'CUSTOMER', label: 'Customer', icon: 'bi-person',      color: '#16a34a' },
                    ].map(opt => (
                      <button type="button" key={opt.value} onClick={() => handleTypeChange(opt.value)} style={{
                        flex: 1, padding: '0.6rem 1rem', borderRadius: 10, border: '1.5px solid',
                        borderColor: recipientType === opt.value ? opt.color : 'var(--border)',
                        background: recipientType === opt.value
                          ? (opt.value === 'ADMIN' ? '#faf5ff' : '#f0fdf4') : 'var(--bg-secondary)',
                        color: recipientType === opt.value ? opt.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', transition: 'all .15s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                      }}>
                        <i className={`bi ${opt.icon}`}></i>{opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient select */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    {recipientType === 'ADMIN' ? 'Admin' : 'Customer'}
                  </label>
                  {recipientList.length === 0 ? (
                    <div style={{
                      padding: '0.75rem 1rem', borderRadius: 8, background: 'var(--bg-secondary)',
                      border: '1px dashed var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)'
                    }}>
                      {recipientType === 'CUSTOMER'
                        ? t('agent.messages.noCustomers')
                        : t('agent.messages.noAdmins')}
                    </div>
                  ) : (
                    <select className="form-select-custom w-100" value={recipientId}
                      onChange={e => setRecipientId(e.target.value)} required>
                      <option value="">{t('agent.messages.chooseRecipient')}</option>
                      {recipientList.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Subject */}
                <div className="mb-3">
                  <label className="form-label-custom">
                    {t('agent.messages.subjectLabel')}
                  </label>
                  <input className="form-control-custom w-100" value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder={t('agent.messages.subjectPlaceholder')} required />
                </div>

                {/* Body */}
                <div className="mb-4">
                  <label className="form-label-custom">
                    {t('agent.messages.bodyLabel')}
                  </label>
                  <textarea rows={6} className="form-control-custom w-100" style={{ resize: 'vertical' }}
                    value={body} onChange={e => setBody(e.target.value)}
                    placeholder={t('agent.messages.bodyPlaceholder')} required />
                </div>

                <button type="submit" disabled={sending || recipientList.length === 0}
                  className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
                  {sending
                    ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('agent.messages.sending')}</>
                    : sent
                    ? <><i className="bi bi-check-circle me-2"></i>{t('agent.messages.sent')}</>
                    : <><i className="bi bi-send me-2"></i>{t('agent.messages.sendBtn')}</>}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="col-12 col-lg-5">
          <div className="card-custom" style={{ background: 'var(--bg-secondary)' }}>
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <i className="bi bi-info-circle me-2" style={{ color: 'var(--primary)' }}></i>
              {t('agent.messages.howItWorks')}
            </h6>
            <div className="d-flex flex-column gap-3">
              {infoItems.map(item => (
                <div key={item.title} className="d-flex gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <i className={`bi ${item.icon}`} style={{ color: item.color, fontSize: '1rem' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contacts summary */}
          <div className="card-custom mt-3">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', fontSize: '0.88rem' }}>
              {t('agent.messages.availContacts')}
            </h6>
            <div className="d-flex gap-3">
              {[
                { label: 'Admin',    count: contacts.admins.length,    color: '#9333ea', bg: '#faf5ff' },
                { label: 'Customer', count: contacts.customers.length, color: '#16a34a', bg: '#f0fdf4' },
              ].map(c => (
                <div key={c.label} style={{
                  flex: 1, textAlign: 'center', padding: '0.75rem',
                  borderRadius: 10, background: c.bg
                }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: c.color }}>{c.count}</div>
                  <div style={{ fontSize: '0.78rem', color: c.color, fontWeight: 600 }}>{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
