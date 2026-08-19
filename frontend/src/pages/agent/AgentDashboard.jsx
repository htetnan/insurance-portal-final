import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

export default function AgentDashboard() {
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [stats, setStats] = useState({ pending: 0, verified: 0, pendingClaims: 0, verifiedClaims: 0, unreadNotifications: 0 })
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/agent/dashboard/stats').catch(() => ({ data: stats })),
      api.get('/agent/applications?limit=5').catch(() => ({ data: [] })),
    ]).then(([s, a]) => {
      setStats(s.data)
      setRecentApps(Array.isArray(a.data) ? a.data.slice(0, 5) : [])
    }).finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12
    ? t('agent.dash.morningGreeting')
    : hour < 17
    ? t('agent.dash.afternoonGreeting')
    : t('agent.dash.eveningGreeting')

  const statCards = [
    { label: t('agent.dash.pendingApps'),   value: stats.pending,             icon: 'bi-file-earmark-text-fill',    grad: 'linear-gradient(135deg,#f59e0b,#d97706)', link: '/agent/applications?filter=PENDING' },
    { label: t('agent.dash.verifiedApps'),  value: stats.verified,            icon: 'bi-check-circle-fill',          grad: 'linear-gradient(135deg,#22c55e,#16a34a)', link: '/agent/applications?filter=VERIFIED' },
    { label: t('agent.dash.pendingClaims'), value: stats.pendingClaims,        icon: 'bi-file-earmark-medical-fill', grad: 'linear-gradient(135deg,#ef4444,#dc2626)', link: '/agent/claims?filter=PENDING' },
    { label: t('agent.dash.verifiedClaims'),value: stats.verifiedClaims,       icon: 'bi-shield-fill-check',         grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', link: '/agent/claims?filter=VERIFIED' },
    { label: t('agent.dash.notifications'), value: stats.unreadNotifications,  icon: 'bi-bell-fill',                 grad: 'linear-gradient(135deg,#a855f7,#7c3aed)', link: '/agent/notifications' },
  ]

  return (
    <div className="fade-in">

      {/* Welcome Banner */}
      <div className="dashboard-banner dashboard-banner-agent mb-4">
        <div className="dashboard-banner-orb dashboard-banner-orb-1" />
        <div className="dashboard-banner-orb dashboard-banner-orb-2" />
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              {greeting} 👋
            </div>
            <h4 style={{ fontWeight: 800, color: '#fff', margin: 0, fontSize: '1.4rem' }}>
              {user?.name}
            </h4>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
              {t('agent.dash.subtitle')}
            </div>
          </div>
          <div className="d-flex gap-2">
            <Link to="/agent/applications" className="banner-action-btn">
              <i className="bi bi-file-earmark-text me-1"></i>
              {t('agent.dash.applicationsBtn')}
            </Link>
            <Link to="/agent/claims" className="banner-action-btn banner-action-btn-outline">
              <i className="bi bi-file-earmark-medical me-1"></i>
              {t('agent.dash.claimsBtn')}
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="row g-3 mb-4">
        {statCards.map(card => (
          <div key={card.label} className="col-6 col-lg-4 col-xl-2-4">
            <Link to={card.link} style={{ textDecoration: 'none' }}>
              <div className="stat-card-3d">
                <div className="stat-card-3d-icon-wrap" style={{ background: card.grad }}>
                  <i className={`bi ${card.icon}`} style={{ fontSize: '1.3rem', color: '#fff' }}></i>
                  <div className="stat-card-3d-shine" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    {loading ? <span className="stat-loading-bar" /> : card.value}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 500, lineHeight: 1.4 }}>
                    {card.label}
                  </div>
                </div>
                <i className="bi bi-arrow-right-short stat-card-arrow"></i>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="card-custom">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-clock-history" style={{ color: 'var(--primary)' }}></i>
            {t('agent.dash.recentApps')}
          </h6>
          <Link to="/agent/applications" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
            {t('agent.dash.viewAll')} <i className="bi bi-arrow-right"></i>
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-3"><div className="spinner-border" style={{ color: 'var(--primary)', width: 28, height: 28 }}></div></div>
        ) : recentApps.length === 0 ? (
          <div className="text-center py-3">
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
              {t('agent.dash.noApps')}
            </p>
          </div>
        ) : (
          <div className="table-custom">
            <table className="w-100">
              <thead>
                <tr>
                  {[
                    t('agent.dash.customerCol'),
                    t('agent.dash.planCol'),
                    t('agent.dash.coverageCol'),
                    t('agent.dash.statusCol'),
                    t('agent.dash.dateCol'),
                  ].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {recentApps.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.customerName || a.customer?.name}</td>
                    <td>{a.packageName || a.package?.name}</td>
                    <td>{Number(a.coverageAmount).toLocaleString()} MMK</td>
                    <td><span className={`badge-status badge-${a.status?.toLowerCase()}`}>{t(`status.${a.status}`, { defaultValue: a.status })}</span></td>
                    <td>{a.createdAt ? new Date(a.createdAt).toLocaleDateString(i18n.language?.startsWith('my') ? 'my-MM' : 'en-US') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
