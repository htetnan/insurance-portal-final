import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'

export default function AdminNotificationsPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ targetRole: 'ALL', targetUserId: '', title: '', message: '', type: 'INFO' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState([])

  useEffect(() => {
    api.get('/admin/users').then(res => setUsers(Array.isArray(res.data) ? res.data : [])).catch(() => {})
    api.get('/admin/notifications/sent').then(res => setSent(Array.isArray(res.data) ? res.data : [])).catch(() => {})
  }, [])

  const handleSend = async e => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/admin/notifications/send', form)
      toast.success(t('admin.notifications.sentSuccess'))
      setForm({ targetRole: 'ALL', targetUserId: '', title: '', message: '', type: 'INFO' })
      api.get('/admin/notifications/sent').then(res => setSent(Array.isArray(res.data) ? res.data : [])).catch(() => {})
    } catch (err) { toast.error(err.response?.data?.message || t('admin.notifications.sendFailed')) } finally { setSending(false) }
  }

  const typeColors = { INFO: '#6b7280', APPROVAL: '#16a34a', REJECTION: '#dc2626', PAYMENT: '#1d4ed8', CLAIM: '#f59e0b', REMINDER: '#9333ea' }

  return (
    <div className="fade-in">
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.notifications.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('admin.notifications.subtitle')}</p>
      </div>
      <div className="row g-4">
        <div className="col-12 col-lg-5">
          <div className="card-custom">
            <h6 style={{ fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>{t('admin.notifications.formTitle')}</h6>
            <form onSubmit={handleSend}>
              <div className="mb-3">
                <label className="form-label-custom">{t('admin.notifications.sendTo')}</label>
                <select className="form-select-custom w-100" value={form.targetRole} onChange={e => setForm(f => ({ ...f, targetRole: e.target.value, targetUserId: '' }))}>
                  <option value="ALL">{t('admin.notifications.allUsers')}</option>
                  <option value="CUSTOMER">{t('admin.notifications.allCustomers')}</option>
                  <option value="AGENT">{t('admin.notifications.allAgents')}</option>
                  <option value="SPECIFIC_AGENT">{t('admin.notifications.specificAgent')}</option>
                  <option value="SPECIFIC">{t('admin.notifications.specificUser')}</option>
                </select>
              </div>
              {(form.targetRole === 'SPECIFIC' || form.targetRole === 'SPECIFIC_AGENT') && (
                <div className="mb-3">
                  <label className="form-label-custom">
                    {form.targetRole === 'SPECIFIC_AGENT' ? t('admin.notifications.selectAgent') : t('admin.notifications.selectUser')}
                  </label>
                  <select required className="form-select-custom w-100" value={form.targetUserId} onChange={e => setForm(f => ({ ...f, targetUserId: e.target.value }))}>
                    <option value="">{form.targetRole === 'SPECIFIC_AGENT' ? t('admin.notifications.chooseAgent') : t('admin.notifications.chooseUser')}</option>
                    {users
                      .filter(u => form.targetRole === 'SPECIFIC_AGENT' ? u.role === 'AGENT' : true)
                      .map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="form-label-custom">{t('admin.notifications.type')}</label>
                <select className="form-select-custom w-100" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {['INFO', 'APPROVAL', 'REJECTION', 'PAYMENT', 'CLAIM', 'REMINDER'].map(tp => <option key={tp} value={tp}>{tp}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label-custom">{t('admin.notifications.titleLabel')}</label>
                <input required className="form-control-custom w-100" placeholder={t('admin.notifications.titlePlaceholder')} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="mb-3">
                <label className="form-label-custom">{t('admin.notifications.messageLabel')}</label>
                <textarea required rows={4} className="form-control-custom w-100" style={{ resize: 'vertical' }}
                  placeholder={t('admin.notifications.messagePlaceholder')}
                  value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
              </div>
              <button type="submit" disabled={sending} className="btn-primary-custom w-100" style={{ justifyContent: 'center' }}>
                {sending
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('admin.notifications.sending')}</>
                  : <><i className="bi bi-send me-2"></i>{t('admin.notifications.sendBtn')}</>}
              </button>
            </form>
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="card-custom p-0">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.notifications.history')}</h6>
            </div>
            {sent.length === 0 ? (
              <div className="text-center py-5"><p style={{ color: 'var(--text-muted)', margin: 0 }}>{t('admin.notifications.noHistory')}</p></div>
            ) : (
              <div>
                {sent.map((n, i) => (
                  <div key={n.id || i} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="d-flex align-items-start gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[n.type] || '#6b7280', flexShrink: 0, marginTop: 6 }}></div>
                      <div className="flex-grow-1">
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{n.title}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.83rem' }}>{n.message}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {t('admin.notifications.to')}: {n.targetRole === 'SPECIFIC_AGENT' ? t('admin.notifications.specificAgent') : n.targetRole === 'SPECIFIC' ? t('admin.notifications.specificUser') : n.targetRole || 'Specific'} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
