import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const money = value => `${Number(value || 0).toLocaleString()} MMK`

export default function AdminDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalAgents: 0,
    totalPackages: 0,
    pendingApplications: 0,
    pendingClaims: 0,
    pendingPayments: 0,
    unreadFeedback: 0,
    verifiedApplications: 0,
    verifiedClaims: 0,
    monthlyRevenue: 0,
  })
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState({ title: '', message: '', targetRole: 'ALL', type: 'INFO' })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState(null)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([
        api.get('/admin/dashboard/stats').catch(() => ({ data: {} })),
        api.get('/admin/recent-activities').catch(() => ({ data: [] })),
      ])
      setStats(prev => ({ ...prev, ...(s.data || {}) }))
      setRecentActivities(Array.isArray(a.data) ? a.data.slice(0, 8) : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDashboard() }, [])

  const workload = useMemo(() => [
    {
      count: Number(stats.pendingApplications || 0),
      label: t('admin.dashboard.pendingApplicationWork'),
      help: t('admin.dashboard.pendingApplicationWorkHelp'),
      icon: 'bi-file-earmark-person',
      link: '/admin/applications?filter=PENDING',
      tone: 'warning',
    },
    {
      count: Number(stats.pendingClaims || 0),
      label: t('admin.dashboard.pendingClaimWork'),
      help: t('admin.dashboard.pendingClaimWorkHelp'),
      icon: 'bi-shield-exclamation',
      link: '/admin/claims?filter=PENDING',
      tone: 'danger',
    },
    {
      count: Number(stats.pendingPayments || 0),
      label: t('admin.dashboard.pendingPaymentWork'),
      help: t('admin.dashboard.pendingPaymentWorkHelp'),
      icon: 'bi-credit-card-2-front',
      link: '/admin/payments?filter=PENDING',
      tone: 'primary',
    },
    {
      count: Number(stats.unreadFeedback || 0),
      label: t('admin.dashboard.unreadFeedbackWork'),
      help: t('admin.dashboard.unreadFeedbackWorkHelp'),
      icon: 'bi-chat-heart',
      link: '/admin/feedback?status=UNREAD',
      tone: 'info',
    },
  ].sort((a, b) => b.count - a.count), [stats, t])

  const totalWaiting = workload.reduce((sum, item) => sum + item.count, 0)
  const appHandled = Number(stats.verifiedApplications || 0)
  const appWaiting = Number(stats.pendingApplications || 0)
  const claimHandled = Number(stats.verifiedClaims || 0)
  const claimWaiting = Number(stats.pendingClaims || 0)
  const appProgress = appHandled + appWaiting > 0 ? Math.round((appHandled / (appHandled + appWaiting)) * 100) : 100
  const claimProgress = claimHandled + claimWaiting > 0 ? Math.round((claimHandled / (claimHandled + claimWaiting)) * 100) : 100

  const urgency = totalWaiting >= 50 ? 'high' : totalWaiting >= 15 ? 'medium' : 'good'

  const sendAnnouncement = async e => {
    e.preventDefault()
    if (!notice.title.trim() || !notice.message.trim()) return
    setSending(true)
    setSendResult(null)
    try {
      const { data } = await api.post('/admin/notifications/send', {
        title: notice.title.trim(),
        message: notice.message.trim(),
        targetRole: notice.targetRole,
        type: notice.type,
      })
      setSendResult({ ok: true, count: Number(data?.sent || 0) })
      setNotice(prev => ({ ...prev, title: '', message: '' }))
      loadDashboard()
    } catch (err) {
      setSendResult({ ok: false, message: err?.response?.data?.message || t('admin.dashboard.broadcastFailed') })
    } finally {
      setSending(false)
    }
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? t('admin.dashboard.greetingMorning') : hour < 17 ? t('admin.dashboard.greetingAfternoon') : t('admin.dashboard.greetingEvening')
  const locale = i18n.language?.startsWith('my') ? 'my-MM' : 'en-US'

  return (
    <div className="fade-in admin-ops-dashboard">
      <section className="admin-welcome-card mb-4">
        <div>
          <div className="admin-welcome-kicker">{greeting}</div>
          <h3>{user?.name || t('admin.dashboard.adminBadge')}</h3>
          <p>{t('admin.dashboard.operationsWelcome')}</p>
        </div>
        <div className="admin-date-chip">
          <i className="bi bi-calendar3 me-2" />
          {now.toLocaleDateString(locale, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </section>

      <div className="row g-3 mb-4">
        <MetricCard icon="bi-hourglass-split" label={t('admin.dashboard.totalWaiting')} value={loading ? '—' : totalWaiting} note={t(`admin.dashboard.workload_${urgency}`)} tone={urgency} />
        <MetricCard icon="bi-wallet2" label={t('admin.dashboard.monthlyRevenue')} value={loading ? '—' : money(stats.monthlyRevenue)} note={t('admin.dashboard.revenueHelp')} />
        <MetricCard icon="bi-people" label={t('admin.dashboard.serviceNetwork')} value={loading ? '—' : `${stats.totalCustomers} / ${stats.totalAgents}`} note={t('admin.dashboard.customerAgentNote')} />
        <MetricCard icon="bi-box-seam" label={t('admin.dashboard.availablePlans')} value={loading ? '—' : stats.totalPackages} note={t('admin.dashboard.availablePlansNote')} />
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-7">
          <section className="card-custom h-100 admin-ops-panel">
            <div className="admin-section-heading">
              <div>
                <h5><i className="bi bi-bell-fill me-2" />{t('admin.dashboard.operationsAlertCenter')}</h5>
                <p>{t('admin.dashboard.operationsAlertHelp')}</p>
              </div>
              <span className={`admin-health-badge ${urgency}`}>{t(`admin.dashboard.workloadLabel_${urgency}`)}</span>
            </div>

            <div className="admin-work-queue">
              {workload.map(item => (
                <Link to={item.link} key={item.label} className={`admin-work-item ${item.tone}`}>
                  <div className="admin-work-icon"><i className={`bi ${item.icon}`} /></div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="admin-work-title">{item.label}</div>
                    <div className="admin-work-help">{item.help}</div>
                  </div>
                  <div className="admin-work-count">{loading ? '—' : item.count}</div>
                  <i className="bi bi-chevron-right" />
                </Link>
              ))}
            </div>

            <div className="admin-queue-advice mt-3">
              <i className="bi bi-lightbulb" />
              <div>
                <strong>{t('admin.dashboard.todayPriority')}</strong>
                <span>{totalWaiting === 0 ? t('admin.dashboard.allCaughtUp') : t('admin.dashboard.priorityAdvice')}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <section className="card-custom h-100 admin-service-progress">
            <div className="admin-section-heading">
              <div>
                <h5><i className="bi bi-activity me-2" />{t('admin.dashboard.serviceProgress')}</h5>
                <p>{t('admin.dashboard.serviceProgressHelp')}</p>
              </div>
            </div>
            <ProgressRow label={t('admin.dashboard.applicationReviewProgress')} value={appProgress} done={appHandled} waiting={appWaiting} t={t} />
            <ProgressRow label={t('admin.dashboard.claimReviewProgress')} value={claimProgress} done={claimHandled} waiting={claimWaiting} t={t} />
            <div className="admin-service-note">
              <i className="bi bi-info-circle" />
              <span>{t('admin.dashboard.progressNote')}</span>
            </div>
          </section>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-6">
          <section className="card-custom h-100 admin-broadcast-card">
            <div className="admin-section-heading">
              <div>
                <h5><i className="bi bi-megaphone me-2" />{t('admin.dashboard.quickBroadcast')}</h5>
                <p>{t('admin.dashboard.quickBroadcastHelp')}</p>
              </div>
            </div>
            <form onSubmit={sendAnnouncement}>
              <div className="row g-2 mb-2">
                <div className="col-7">
                  <label className="form-label small">{t('admin.dashboard.audience')}</label>
                  <select className="form-select" value={notice.targetRole} onChange={e => setNotice({ ...notice, targetRole: e.target.value })}>
                    <option value="ALL">{t('admin.dashboard.audienceAll')}</option>
                    <option value="CUSTOMER">{t('admin.dashboard.audienceCustomers')}</option>
                    <option value="AGENT">{t('admin.dashboard.audienceAgents')}</option>
                  </select>
                </div>
                <div className="col-5">
                  <label className="form-label small">{t('admin.dashboard.noticeType')}</label>
                  <select className="form-select" value={notice.type} onChange={e => setNotice({ ...notice, type: e.target.value })}>
                    <option value="INFO">{t('admin.dashboard.noticeInfo')}</option>
                    <option value="REMINDER">{t('admin.dashboard.noticeReminder')}</option>
                    <option value="PAYMENT">{t('admin.dashboard.noticePayment')}</option>
                  </select>
                </div>
              </div>
              <label className="form-label small">{t('admin.dashboard.noticeTitle')}</label>
              <input className="form-control mb-2" maxLength={120} value={notice.title} onChange={e => setNotice({ ...notice, title: e.target.value })} placeholder={t('admin.dashboard.noticeTitlePlaceholder')} />
              <label className="form-label small">{t('admin.dashboard.noticeMessage')}</label>
              <textarea className="form-control mb-3" rows="4" maxLength={1000} value={notice.message} onChange={e => setNotice({ ...notice, message: e.target.value })} placeholder={t('admin.dashboard.noticeMessagePlaceholder')} />
              <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                <small className="text-muted">{notice.message.length}/1000</small>
                <button className="btn btn-primary" disabled={sending || !notice.title.trim() || !notice.message.trim()}>
                  {sending ? <><span className="spinner-border spinner-border-sm me-2" />{t('admin.dashboard.sending')}</> : <><i className="bi bi-send me-2" />{t('admin.dashboard.sendBroadcast')}</>}
                </button>
              </div>
              {sendResult && <div className={`alert py-2 mt-3 mb-0 ${sendResult.ok ? 'alert-success' : 'alert-danger'}`}>
                {sendResult.ok ? t('admin.dashboard.broadcastSent', { count: sendResult.count }) : sendResult.message}
              </div>}
            </form>
          </section>
        </div>

        <div className="col-12 col-xl-6">
          <section className="card-custom h-100">
            <div className="admin-section-heading">
              <div>
                <h5><i className="bi bi-clipboard2-check me-2" />{t('admin.dashboard.dailyControl')}</h5>
                <p>{t('admin.dashboard.dailyControlHelp')}</p>
              </div>
            </div>
            <div className="admin-daily-checks">
              <DailyCheck done={Number(stats.pendingApplications || 0) === 0} text={t('admin.dashboard.checkApplications')} />
              <DailyCheck done={Number(stats.pendingClaims || 0) === 0} text={t('admin.dashboard.checkClaims')} />
              <DailyCheck done={Number(stats.pendingPayments || 0) === 0} text={t('admin.dashboard.checkPayments')} />
              <DailyCheck done={Number(stats.unreadFeedback || 0) === 0} text={t('admin.dashboard.checkFeedback')} />
            </div>
            <div className="admin-control-footer">
              <span>{t('admin.dashboard.dailyControlNote')}</span>
              <Link to="/admin/reports" className="btn btn-sm btn-outline-primary">{t('admin.dashboard.openReports')}</Link>
            </div>
          </section>
        </div>
      </div>

      <section className="card-custom">
        <div className="admin-section-heading">
          <div>
            <h5><i className="bi bi-clock-history me-2" />{t('admin.dashboard.recentActivity')}</h5>
            <p>{t('admin.dashboard.recentActivityHelp')}</p>
          </div>
          <button className="btn btn-sm btn-outline-secondary" onClick={loadDashboard} disabled={loading}><i className="bi bi-arrow-clockwise me-1" />{t('admin.dashboard.refresh')}</button>
        </div>
        {loading ? (
          <div className="text-center py-3"><div className="spinner-border text-primary" /></div>
        ) : recentActivities.length === 0 ? (
          <div className="admin-empty-info"><i className="bi bi-inbox" /><span>{t('admin.dashboard.noRecentActivity')}</span></div>
        ) : (
          <div className="admin-activity-list">
            {recentActivities.map((act, i) => (
              <div key={`${act.createdAt || ''}-${i}`} className="admin-activity-row">
                <div className="admin-activity-icon"><i className={`bi ${act.icon || 'bi-activity'}`} /></div>
                <div className="flex-grow-1">
                  <div className="admin-activity-text">{act.description}</div>
                  <div className="admin-activity-time">{act.createdAt ? new Date(act.createdAt).toLocaleString(locale) : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({ icon, label, value, note, tone = '' }) {
  return <div className="col-12 col-sm-6 col-xl-3">
    <div className={`admin-ops-metric ${tone}`}>
      <div className="admin-ops-metric-icon"><i className={`bi ${icon}`} /></div>
      <div className="admin-ops-metric-label">{label}</div>
      <div className="admin-ops-metric-value">{value}</div>
      <div className="admin-ops-metric-note">{note}</div>
    </div>
  </div>
}

function ProgressRow({ label, value, done, waiting, t }) {
  return <div className="admin-progress-block">
    <div className="d-flex justify-content-between align-items-end gap-2 mb-2">
      <div><strong>{label}</strong><div className="small text-muted">{done} {t('admin.dashboard.completed')} · {waiting} {t('admin.dashboard.waiting')}</div></div>
      <span className="admin-progress-percent">{value}%</span>
    </div>
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin="0" aria-valuemax="100"><div className="progress-bar" style={{ width: `${value}%` }} /></div>
  </div>
}

function DailyCheck({ done, text }) {
  return <div className={`admin-daily-check ${done ? 'done' : 'pending'}`}>
    <i className={`bi ${done ? 'bi-check-circle-fill' : 'bi-circle'}`} />
    <span>{text}</span>
    <span className="ms-auto small">{done ? '✓' : '•'}</span>
  </div>
}
