import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

/* ── 3-D floating protection scene (inline SVG) ─────────────────── */
function ProtectionScene({ t }) {
  return (
    <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', maxWidth: 300, height: 'auto', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.25))' }}>

      {/* ── Background glow disc ── */}
      <ellipse cx="160" cy="220" rx="110" ry="18" fill="rgba(255,255,255,0.08)" />

      {/* ── Main shield body ── */}
      <path d="M160 20 L232 52 L232 130 C232 172 200 205 160 218 C120 205 88 172 88 130 L88 52 Z"
        fill="url(#shieldGrad)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Shield inner highlight */}
      <path d="M160 34 L218 62 L218 130 C218 165 192 194 160 206 L160 34Z"
        fill="rgba(255,255,255,0.08)" />
      {/* Shine */}
      <path d="M104 58 L104 78 Q104 68 114 63 L160 44 L160 34 L112 55 Q104 58 104 58Z"
        fill="rgba(255,255,255,0.2)" />

      {/* ── Check mark inside shield ── */}
      <path d="M133 122 L150 140 L190 100"
        stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.95" />

      {/* ── Floating doc card – top right ── */}
      <g style={{ animation: 'customerFloat1 4s ease-in-out infinite' }}>
        <rect x="218" y="48" width="76" height="56" rx="10"
          fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        <rect x="228" y="62" width="36" height="4" rx="2" fill="rgba(255,255,255,0.7)" />
        <rect x="228" y="72" width="28" height="3" rx="2" fill="rgba(255,255,255,0.45)" />
        <rect x="228" y="80" width="44" height="3" rx="2" fill="rgba(255,255,255,0.35)" />
        {/* doc icon */}
        <rect x="274" y="54" width="14" height="16" rx="2" fill="rgba(255,255,255,0.25)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
        <path d="M277 59 L285 59 M277 63 L283 63" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" />
      </g>

      {/* ── Floating stat card – bottom left ── */}
      <g style={{ animation: 'customerFloat2 5s ease-in-out infinite 0.7s' }}>
        <rect x="24" y="130" width="80" height="52" rx="10"
          fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
        {/* Pill badge */}
        <rect x="32" y="139" width="34" height="10" rx="5" fill="rgba(255,255,255,0.3)" />
        <text x="49" y="147.5" textAnchor="middle" fontSize="6" fill="white" fontWeight="700" opacity="0.9">{t('dash.activeLabel')}</text>
        <text x="64" y="165" textAnchor="middle" fontSize="16" fill="white" fontWeight="800" opacity="0.95">12</text>
        <text x="64" y="175" textAnchor="middle" fontSize="6.5" fill="rgba(255,255,255,0.65)">{t('dash.policiesLabel')}</text>
      </g>

      {/* ── Floating mini-badge – top left ── */}
      <g style={{ animation: 'customerFloat3 6s ease-in-out infinite 1.2s' }}>
        <rect x="16" y="56" width="60" height="28" rx="8"
          fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        <circle cx="28" cy="70" r="6" fill="rgba(255,255,255,0.3)" />
        <path d="M25 70 L27.5 72.5 L31 68" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="38" y="65" width="28" height="3.5" rx="1.5" fill="rgba(255,255,255,0.65)" />
        <rect x="38" y="71" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.4)" />
      </g>

      {/* ── Sparkle dots ── */}
      <circle cx="240" cy="170" r="4" fill="rgba(255,255,255,0.5)"
        style={{ animation: 'customerPulse 2.5s ease-in-out infinite' }} />
      <circle cx="72" cy="40" r="3" fill="rgba(255,255,255,0.4)"
        style={{ animation: 'customerPulse 3s ease-in-out infinite 0.5s' }} />
      <circle cx="270" cy="140" r="2.5" fill="rgba(255,255,255,0.35)"
        style={{ animation: 'customerPulse 2s ease-in-out infinite 1s' }} />
      <circle cx="40" cy="100" r="2" fill="rgba(255,255,255,0.3)"
        style={{ animation: 'customerPulse 3.5s ease-in-out infinite 1.5s' }} />

      <defs>
        <linearGradient id="shieldGrad" x1="88" y1="20" x2="232" y2="218" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export default function CustomerDashboard() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState({ applications: 0, activePolicies: 0, pendingClaims: 0, notifications: 0 })
  const [recentApps, setRecentApps] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/customer/dashboard/stats').catch(() => ({ data: stats })),
      api.get('/customer/applications?limit=5').catch(() => ({ data: [] })),
    ]).then(([statsRes, appsRes]) => {
      setStats(statsRes.data)
      setRecentApps(Array.isArray(appsRes.data) ? appsRes.data.slice(0, 5) : [])
    }).finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? t('dash.greetingMorning') : hour < 17 ? t('dash.greetingAfternoon') : t('dash.greetingEvening')

  const statCards = [
    { label: t('dash.totalApplications'), value: stats.applications,  icon: 'bi-file-earmark-text-fill',  grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', link: '/customer/applications' },
    { label: t('dash.activePolicies'),    value: stats.activePolicies, icon: 'bi-shield-fill-check',        grad: 'linear-gradient(135deg,#22c55e,#16a34a)', link: '/customer/policies' },
    { label: t('dash.pendingClaims'),     value: stats.pendingClaims,  icon: 'bi-file-earmark-medical-fill',grad: 'linear-gradient(135deg,#f59e0b,#d97706)', link: '/customer/claims' },
    { label: t('dash.notifications'),     value: stats.notifications,  icon: 'bi-bell-fill',                grad: 'linear-gradient(135deg,#a855f7,#7c3aed)', link: '/customer/notifications' },
  ]

  const quickActions = [
    { to: '/customer/apply',        icon: 'bi-plus-circle-fill',     label: t('dash.applyPolicy'),  grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', shadow: 'rgba(29,78,216,0.4)' },
    { to: '/customer/submit-claim', icon: 'bi-file-earmark-plus-fill',label: t('dash.submitClaim'), grad: 'linear-gradient(135deg,#f59e0b,#d97706)', shadow: 'rgba(217,119,6,0.4)' },
    { to: '/customer/payments',     icon: 'bi-credit-card-fill',      label: t('dash.payments'),    grad: 'linear-gradient(135deg,#06b6d4,#0891b2)', shadow: 'rgba(8,145,178,0.4)' },
    { to: '/plans',                 icon: 'bi-search-heart-fill',     label: t('dash.browsePlans'), grad: 'linear-gradient(135deg,#a855f7,#7c3aed)', shadow: 'rgba(124,58,237,0.4)' },
  ]

  return (
    <div className="fade-in">

      {/* ── Dashboard Welcome Banner ── */}
      <div className="dashboard-banner dashboard-banner-customer mb-4">
        <div className="dashboard-banner-orb dashboard-banner-orb-1" />
        <div className="dashboard-banner-orb dashboard-banner-orb-2" />

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ position: 'relative', zIndex: 1 }}>
          {/* Left: greeting + actions */}
          <div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              {greeting} 👋
            </div>
            <h4 style={{ fontWeight: 800, color: '#fff', margin: 0, fontSize: '1.4rem' }}>
              {user?.name}
            </h4>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', marginTop: '0.3rem', marginBottom: '1.1rem' }}>
              {now.toLocaleDateString(i18n.language?.startsWith('my') ? 'my-MM' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/customer/apply" className="banner-action-btn">
                <i className="bi bi-plus-circle me-1"></i>{t('dash.applyPolicy')}
              </Link>
              <Link to="/customer/claims" className="banner-action-btn banner-action-btn-outline">
                <i className="bi bi-file-earmark-medical me-1"></i>{t('dash.submitClaim')}
              </Link>
              <div className="dashboard-banner-badge ms-1">
                <i className="bi bi-person-fill me-1"></i> {t('workspace.roles.customerShort')}
              </div>
            </div>
          </div>

          {/* Right: 3-D illustration */}
          <div className="d-none d-md-block" style={{ flexShrink: 0 }}>
            <ProtectionScene t={t} />
          </div>
        </div>
      </div>

      {/* ── Stat Cards 3D ── */}
      <div className="row g-3 mb-4">
        {statCards.map(card => (
          <div key={card.label} className="col-6 col-lg-3">
            <Link to={card.link} style={{ textDecoration: 'none' }}>
              <div className="stat-card-3d">
                <div className="stat-card-3d-icon-wrap" style={{ background: card.grad }}>
                  <i className={`bi ${card.icon}`} style={{ fontSize: '1.3rem', color: '#fff' }}></i>
                  <div className="stat-card-3d-shine" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    {loading ? <span className="stat-loading-bar" /> : card.value}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem', fontWeight: 500 }}>
                    {card.label}
                  </div>
                </div>
                <i className="bi bi-arrow-right-short stat-card-arrow"></i>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="card-custom mb-4">
        <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="bi bi-lightning-fill" style={{ color: '#f59e0b' }}></i> {t('dash.quickActions')}
        </h6>
        <div className="row g-3">
          {quickActions.map(action => (
            <div key={action.to} className="col-6 col-md-3">
              <Link to={action.to} style={{ textDecoration: 'none' }}>
                <div className="customer-quick-action-card">
                  <div className="customer-quick-action-icon" style={{ background: action.grad, boxShadow: `0 8px 24px ${action.shadow}` }}>
                    <i className={`bi ${action.icon}`} style={{ fontSize: '1.4rem', color: '#fff' }}></i>
                    <div className="stat-card-3d-shine" style={{ borderRadius: '14px 0 6px 0' }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginTop: '0.6rem', lineHeight: 1.3 }}>
                    {action.label}
                  </div>
                  <i className="bi bi-arrow-right customer-quick-action-arrow"></i>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent Applications ── */}
      <div className="card-custom">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="bi bi-clock-history" style={{ color: 'var(--primary)' }}></i>
            {t('dash.recentApplications')}
          </h6>
          <Link to="/customer/applications" style={{ color: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>
            {t('dash.viewAll')} <i className="bi bi-arrow-right"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border" style={{ color: 'var(--primary)', width: 28, height: 28 }}></div>
          </div>
        ) : recentApps.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <i className="bi bi-file-earmark-text" style={{ fontSize: '2rem', color: 'var(--text-muted)' }}></i>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>{t('dash.noApplications')}</p>
            <Link to="/customer/apply" className="btn-primary-custom" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
              <i className="bi bi-plus-circle me-1"></i>{t('dash.applyNow')}
            </Link>
          </div>
        ) : (
          <div className="table-custom">
            <table className="w-100">
              <thead>
                <tr>
                  {[t('dash.planCol'), t('dash.coverageCol'), t('dash.durationCol'), t('dash.statusCol'), t('dash.dateCol')].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentApps.map(app => (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>{app.packageName || app.package?.name}</td>
                    <td>{Number(app.coverageAmount).toLocaleString()} MMK</td>
                    <td>{app.duration} {app.duration > 1 ? t('dash.years') : t('dash.year')}</td>
                    <td><span className={`badge-status badge-${app.status?.toLowerCase()}`}>{t(`status.${app.status}`, { defaultValue: app.status })}</span></td>
                    <td>{app.createdAt ? new Date(app.createdAt).toLocaleDateString(i18n.language?.startsWith('my') ? 'my-MM' : 'en-US') : '—'}</td>
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
