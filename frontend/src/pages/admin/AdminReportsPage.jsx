import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { downloadPdf } from '../../utils/pdfDownload'

// ── Colour palette by insurance type ────────────────────────────────────────
const TYPE_COLORS = {
  LIFE:      '#1d4ed8', HEALTH:   '#16a34a', TRAVEL:    '#0891b2',
  MOTOR:     '#d97706', VEHICLE:  '#7c3aed', EDUCATION: '#db2777',
  PROPERTY:  '#ca8a04', OTHER:    '#64748b',
}
const typeColor = t => TYPE_COLORS[t] || TYPE_COLORS.OTHER
const MMK = n => (n == null ? '—' : Number(n).toLocaleString() + ' MMK')
const Pct = n => (n == null ? '—' : Number(n).toFixed(1) + '%')
const shortMonth = key => key?.split(' ')[0] || key

// ── SVG Chart Primitives ──────────────────────────────────────────────────────
function BarChart({ data, color = 'var(--primary)', height = 180 }) {
  const entries = Object.entries(data || {})
  if (!entries.length) return <Empty />
  const vals = entries.map(([, v]) => Number(v))
  if (vals.every(v => v === 0)) return <Empty />
  const maxV = Math.max(...vals, 1)
  const W = 600, H = height, PAD_L = 60, PAD_B = 28, PAD_T = 16, PAD_R = 8
  const bw = Math.floor((W - PAD_L - PAD_R) / entries.length)
  const barW = Math.max(bw - 6, 4)
  const barX = i => PAD_L + i * bw + (bw - barW) / 2
  const barH = v => Math.max(((v / maxV) * (H - PAD_T - PAD_B)), 2)
  const barY = v => H - PAD_B - barH(v)
  const yTicks = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const yv = (maxV * i) / yTicks
        const y  = H - PAD_B - (i / yTicks) * (H - PAD_T - PAD_B)
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.8} />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
              {yv >= 1000000 ? (yv/1000000).toFixed(1)+'M' : yv >= 1000 ? (yv/1000).toFixed(0)+'K' : Math.round(yv)}
            </text>
          </g>
        )
      })}
      {entries.map(([k, v], i) => (
        <g key={k}>
          <rect x={barX(i)} y={barY(Number(v))} width={barW} height={barH(Number(v))}
            fill={Array.isArray(color) ? color[i % color.length] : color} rx={3} opacity={0.9} />
          <text x={barX(i) + barW / 2} y={barY(Number(v)) - 3} textAnchor="middle" fontSize={8.5} fill="var(--text-muted)" fontWeight={600}>
            {Number(v) >= 1000000 ? (Number(v)/1000000).toFixed(1)+'M' : Number(v) >= 1000 ? (Number(v)/1000).toFixed(0)+'K' : Math.round(Number(v))}
          </text>
          <text x={barX(i) + barW / 2} y={H - PAD_B + 12} textAnchor="middle" fontSize={8} fill="var(--text-muted)">
            {shortMonth(k)}
          </text>
        </g>
      ))}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="var(--border)" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--border)" strokeWidth={1} />
    </svg>
  )
}

function GroupedBarChart({ data1, data2, label1, label2, height = 200 }) {
  const keys = Object.keys(data1 || {})
  if (!keys.length) return <Empty />
  const allVals = [...Object.values(data1 || {}).map(Number), ...Object.values(data2 || {}).map(Number)]
  const maxV = Math.max(...allVals, 1)
  const W = 620, H = height, PAD_L = 64, PAD_B = 30, PAD_T = 16, PAD_R = 8
  const gw = Math.floor((W - PAD_L - PAD_R) / keys.length)
  const bw = Math.max(Math.floor(gw / 2) - 3, 3)
  const barH = v => Math.max(((Number(v) / maxV) * (H - PAD_T - PAD_B)), 2)
  const barY = v => H - PAD_B - barH(v)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const yv = (maxV * i) / 4
        const y  = H - PAD_B - (i / 4) * (H - PAD_T - PAD_B)
        return (
          <g key={i}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke="var(--border)" strokeWidth={0.6} />
            <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={8.5} fill="var(--text-muted)">
              {yv >= 1e6 ? (yv/1e6).toFixed(1)+'M' : yv >= 1e3 ? (yv/1e3).toFixed(0)+'K' : Math.round(yv)}
            </text>
          </g>
        )
      })}
      {keys.map((k, i) => {
        const v1 = Number(data1[k] || 0), v2 = Number(data2[k] || 0)
        const x1 = PAD_L + i * gw + 2
        const x2 = x1 + bw + 2
        return (
          <g key={k}>
            <rect x={x1} y={barY(v1)} width={bw} height={barH(v1)} fill="#16a34a" rx={2} opacity={0.85} />
            <rect x={x2} y={barY(v2)} width={bw} height={barH(v2)} fill="#dc2626" rx={2} opacity={0.85} />
            <text x={x1 + gw / 2} y={H - PAD_B + 12} textAnchor="middle" fontSize={8} fill="var(--text-muted)">{shortMonth(k)}</text>
          </g>
        )
      })}
      <line x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={H - PAD_B} stroke="var(--border)" strokeWidth={1} />
      <line x1={PAD_L} x2={W - PAD_R} y1={H - PAD_B} y2={H - PAD_B} stroke="var(--border)" strokeWidth={1} />
      <rect x={PAD_L} y={4} width={10} height={10} fill="#16a34a" rx={2} />
      <text x={PAD_L + 13} y={13} fontSize={9} fill="var(--text-secondary)">{label1}</text>
      <rect x={PAD_L + 70} y={4} width={10} height={10} fill="#dc2626" rx={2} />
      <text x={PAD_L + 83} y={13} fontSize={9} fill="var(--text-secondary)">{label2}</text>
    </svg>
  )
}

function PieChart({ data, colors, size = 180 }) {
  const entries = Object.entries(data || {}).filter(([, v]) => Number(v) > 0)
  if (!entries.length) return <Empty />
  const total = entries.reduce((s, [, v]) => s + Number(v), 0)
  const cx = size / 2, cy = size / 2, r = size * 0.38, ri = r * 0.54
  let angle = -Math.PI / 2
  const slices = entries.map(([k, v], i) => {
    const pct   = Number(v) / total
    const start = angle
    const end   = angle + pct * 2 * Math.PI
    angle = end
    const x1s = cx + r * Math.cos(start), y1s = cy + r * Math.sin(start)
    const x1e = cx + r * Math.cos(end),   y1e = cy + r * Math.sin(end)
    const x2s = cx + ri * Math.cos(end),  y2s = cy + ri * Math.sin(end)
    const x2e = cx + ri * Math.cos(start),y2e = cy + ri * Math.sin(start)
    const large = pct > 0.5 ? 1 : 0
    const d = `M${x1s},${y1s} A${r},${r} 0 ${large} 1 ${x1e},${y1e} L${x2s},${y2s} A${ri},${ri} 0 ${large} 0 ${x2e},${y2e} Z`
    const clr = colors ? (colors[k] || '#64748b') : `hsl(${(i * 47) % 360}, 65%, 52%)`
    return { k, v, pct, d, clr }
  })
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ overflow: 'visible' }}>
      {slices.map(s => (
        <g key={s.k}>
          <path d={s.d} fill={s.clr} stroke="var(--bg-primary)" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  )
}

function DonutGauge({ value, max = 100, color = '#16a34a', size = 120, label }) {
  const pct = Math.min(Math.max(value / max, 0), 1)
  const r = 44, cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const dash  = pct * circ
  const gap   = circ - dash
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fontWeight={800} fill={color}>{Math.round(value)}%</text>
      {label && <text x={cx} y={cy + 13} textAnchor="middle" fontSize={8.5} fill="var(--text-muted)">{label}</text>}
    </svg>
  )
}

function Empty({ text = 'admin.reports.noData' }) {
  const { t } = useTranslation()
  return (
    <div className="text-center py-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      <i className="bi bi-bar-chart-line" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 6 }}></i>
      {t(text)}
    </div>
  )
}

function StatCard({ label, value, icon, color, bg, sub }) {
  return (
    <div className="card-custom" style={{ padding: '1rem' }}>
      <div className="d-flex align-items-center gap-3">
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`bi ${icon}`} style={{ color, fontSize: '1.2rem' }}></i>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value ?? '—'}</div>
          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
const TABS = [
  { key: 'overview',  labelKey: 'tabOverviewLabel', icon: 'bi-graph-up-arrow' },
  { key: 'bytype',    labelKey: 'tabByTypeLabel', icon: 'bi-pie-chart' },
  { key: 'wallet',    labelKey: 'tabWallet', icon: 'bi-wallet2' },
  { key: 'claims',    labelKey: 'tabPayouts', icon: 'bi-cash-stack' },
  { key: 'agents',    labelKey: 'tabAgents', icon: 'bi-person-badge' },
  { key: 'packages',  labelKey: 'tabPackages', icon: 'bi-star' },
  { key: 'analytics', labelKey: 'tabAnalytics', icon: 'bi-bar-chart-line' },
  { key: 'monthly',   labelKey: 'tabMonthly', icon: 'bi-file-earmark-pdf' },
]

export default function AdminReportsPage() {
  const { t } = useTranslation()
  const [reports, setReports]   = useState(null)
  const [wallet,  setWallet]    = useState(null)
  const [loading, setLoading]   = useState(true)
  const [tab,     setTab]       = useState('overview')
  const [walletLoaded, setWalletLoaded] = useState(false)
  const [detailsLoaded, setDetailsLoaded] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)

  // Monthly report state
  const [pdfBusy,       setPdfBusy]       = useState(false)
  const [resetBusy,     setResetBusy]     = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [snapshots,     setSnapshots]     = useState([])
  const [snapsLoading,  setSnapsLoading]  = useState(false)
  const [snapsLoaded,   setSnapsLoaded]   = useState(false)
  const [toast,         setToast]         = useState(null)
  // Last reset info — determines the "current analytics period" start date
  const [lastReset,     setLastReset]     = useState(undefined) // undefined = not yet loaded

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    Promise.all([
      api.get('/admin/reports/summary'),
      api.get('/admin/reports/last-reset'),
    ]).then(([reportsRes, resetRes]) => {
      setReports(reportsRes.data)
      setLastReset(resetRes.data || null)
    }).catch(() => setReports(null))
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (['claims', 'agents', 'packages'].includes(tab) && !detailsLoaded && !detailsLoading) {
      setDetailsLoading(true)
      api.get('/admin/reports')
        .then(r => { setReports(prev => ({ ...(prev || {}), ...(r.data || {}), summaryOnly: false })); setDetailsLoaded(true) })
        .catch(() => {})
        .finally(() => setDetailsLoading(false))
    }
  }, [tab, detailsLoaded, detailsLoading])

  useEffect(() => {
    if (tab === 'wallet' && !walletLoaded) {
      setWalletLoaded(true)
      api.get('/admin/wallet')
        .then(r => setWallet(r.data))
        .catch(() => setWallet(null))
    }
    if (tab === 'monthly' && !snapsLoaded) {
      setSnapsLoaded(true)
      setSnapsLoading(true)
      api.get('/admin/reports/monthly-snapshots')
        .then(r => setSnapshots(r.data || []))
        .catch(() => setSnapshots([]))
        .finally(() => setSnapsLoading(false))
    }
  }, [tab])

  // Download current-month PDF without resetting
  const handleDownloadPdf = async () => {
    setPdfBusy(true)
    try {
      const now = new Date()
      const res = await api.get('/admin/reports/monthly-pdf', {
        params: { year: now.getFullYear(), month: now.getMonth() + 1 },
      })
      const filename = `monthly-report-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}.pdf`
      await downloadPdf(res.data, filename)
    } catch {
      showToast(t('admin.reports.downloadError'), false)
    } finally {
      setPdfBusy(false)
    }
  }

  // Monthly reset — exports full-period PDF, then resets all analytics to zero
  const handleReset = async () => {
    setShowResetModal(false)
    setResetBusy(true)
    try {
      const now = new Date()
      const res = await api.post('/admin/reports/monthly-reset')
      const filename = `period-report-${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}.pdf`
      await downloadPdf(res.data, filename)
      showToast(t('admin.reports.monthlyResetSuccess'))
      // Reload everything — analytics now shows zero, snapshots table updated
      const [snaps, newReports, newReset] = await Promise.all([
        api.get('/admin/reports/monthly-snapshots'),
        api.get('/admin/reports/summary'),
        api.get('/admin/reports/last-reset'),
      ])
      setSnapshots(snaps.data || [])
      setReports(newReports.data)
      setLastReset(newReset.data || null)
    } catch {
      showToast(t('admin.reports.monthlyResetError'), false)
    } finally {
      setResetBusy(false)
    }
  }

  // Re-download an archived snapshot PDF
  const handleSnapshotDownload = async (id, year, month) => {
    try {
      const res = await api.get(`/admin/reports/monthly-snapshots/${id}/pdf`)
      const filename = `monthly-report-${year}-${String(month).padStart(2,'0')}.pdf`
      await downloadPdf(res.data, filename)
    } catch {
      showToast(t('admin.reports.downloadError'), false)
    }
  }

  if (loading) return <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
  if (!reports) return <div className="card-custom text-center py-5"><p style={{ color: 'var(--text-muted)' }}>{t('admin.reports.loadFailed')}</p></div>

  const now = new Date()
  const currentMonthName = now.toLocaleString('en', { month: 'long' })
  const currentYear = now.getFullYear()

  const byType    = reports.policiesByType    || {}
  const revByType = reports.revenueByType     || {}
  const monRev    = reports.monthlyRevenue    || {}
  const monClaims = reports.monthlyClaims     || {}
  const monApps   = reports.applicationsByMonth || {}

  const totalRevenue    = Number(reports.totalRevenue    || 0)
  const totalClaimsPaid = Number(reports.totalClaimsPaid || 0)
  const netProfit       = Number(reports.netProfit       || 0)
  const lossRatio       = Number(reports.lossRatioPct    || 0)
  const profitMargin    = Number(reports.profitMarginPct || 0)
  const profitByType      = reports.profitByType      || {}
  const claimsTotalByType = reports.claimsTotalByType || {}

  const thisMonthKey = Object.keys(monRev).at(-1)
  const thisMonthRev = Number(monRev[thisMonthKey] || 0)
  const prevMonthRev = Number(Object.values(monRev).at(-2) || 0)
  const revGrowth = prevMonthRev > 0 ? ((thisMonthRev - prevMonthRev) / prevMonthRev * 100).toFixed(1) : null

  const agentPerformance       = reports.agentPerformance       || []
  const packagePopularity      = reports.packagePopularity      || []
  const claimsPayoutByCustomer = reports.claimsPayoutByCustomer || []
  const claimsByType           = reports.claimsByType           || {}

  return (
    <div className="fade-in">
      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '0.7rem 1.2rem', borderRadius: 10, fontWeight: 600, fontSize: '0.85rem',
          background: toast.ok ? '#f0fdf4' : '#fef2f2',
          color: toast.ok ? '#16a34a' : '#dc2626',
          border: `1px solid ${toast.ok ? '#bbf7d0' : '#fecaca'}`,
          boxShadow: '0 4px 16px rgba(0,0,0,.12)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <i className={`bi ${toast.ok ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
          {toast.msg}
        </div>
      )}

      {/* ── Reset confirmation modal ── */}
      {showResetModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={() => setShowResetModal(false)}>
          <div style={{ background: 'var(--bg-primary)', borderRadius: 16, padding: '2rem', maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}
            onClick={e => e.stopPropagation()}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-arrow-counterclockwise" style={{ color: '#d97706', fontSize: '1.2rem' }}></i>
              </div>
              <h5 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>{t('admin.reports.monthlyResetConfirmTitle')}</h5>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
              {t('admin.reports.monthlyResetConfirmBody')}
            </p>
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 9, padding: '0.6rem 0.9rem', marginBottom: '1.5rem', fontSize: '0.83rem', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7 }}>
              <i className="bi bi-calendar2-range"></i>
              Report period: <span style={{ fontWeight: 800 }}>
                {lastReset ? new Date(lastReset.resetAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Inception'}
              </span> → <span style={{ fontWeight: 800 }}>{currentMonthName} {currentYear}</span>
            </div>
            <div className="d-flex gap-2 justify-content-end flex-wrap">
              <button type="button" onClick={() => setShowResetModal(false)}
                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
                {t('admin.reports.monthlyResetCancel')}
              </button>
              <button type="button" onClick={handleReset}
                style={{ padding: '0.55rem 1.25rem', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="bi bi-file-earmark-pdf-fill"></i>
                {t('admin.reports.monthlyResetConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.reports.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('admin.reports.subtitle')}</p>
        {lastReset !== undefined && (
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 20, padding: '0.25rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, color: '#1d4ed8' }}>
            <i className="bi bi-calendar2-range"></i>
            {lastReset
              ? <>Current period: {new Date(lastReset.resetAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })} → Today</>
              : <>Current period: Inception → Today</>
            }
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="d-flex gap-1 mb-4 flex-wrap" style={{ background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 12, width: 'fit-content', maxWidth: '100%' }}>
        {TABS.map(tabItem => (
          <button key={tabItem.key} type="button" onClick={() => setTab(tabItem.key)}
            style={{
              padding: '0.45rem 0.9rem', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.78rem', transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 5,
              background: tab === tabItem.key ? 'var(--bg-primary)' : 'transparent',
              color: tab === tabItem.key ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === tabItem.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            }}>
            <i className={`bi ${tabItem.icon}`}></i>
            <span className="d-none d-sm-inline">{t(`admin.reports.${tabItem.labelKey}`)}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: Financial Overview ── */}
      {detailsLoading && ['claims', 'agents', 'packages'].includes(tab) && (
        <div className="alert alert-info d-flex align-items-center gap-2">
          <span className="spinner-border spinner-border-sm"></span> Loading detailed report data…
        </div>
      )}

      {tab === 'overview' && (
        <div className="fade-in d-flex flex-column gap-4">
          {/* Income vs Expenses — two clearly separate hero cards */}
          <div className="row g-3">
            {/* Income card */}
            <div className="col-12 col-md-6">
              <div className="card-custom" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 60%, #047857 100%)', border: 'none', padding: '1.5rem', height: '100%' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-arrow-down-circle-fill" style={{ color: '#6ee7b7', fontSize: '1.1rem' }}></i>
                  </div>
                  <div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.reports.totalIncome')}</div>
                    <div style={{ color: '#6ee7b7', fontSize: '0.78rem', fontWeight: 700 }}>{t('admin.reports.premiumOnly')}</div>
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{totalRevenue.toLocaleString()}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: 4 }}>MMK · {t('admin.reports.verifiedPayments')}</div>
                {revGrowth != null && (
                  <div style={{ marginTop: 10, fontSize: '0.78rem', color: Number(revGrowth) >= 0 ? '#4ade80' : '#f87171', fontWeight: 600 }}>
                    <i className={`bi bi-arrow-${Number(revGrowth) >= 0 ? 'up' : 'down'} me-1`}></i>
                    {Math.abs(revGrowth)}% {t('admin.reports.vsPreviousMonth')}
                  </div>
                )}
                <div style={{ marginTop: 12, padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                  <i className="bi bi-info-circle me-1"></i>{t('admin.reports.incomeNote')}
                </div>
              </div>
            </div>
            {/* Expenses card */}
            <div className="col-12 col-md-6">
              <div className="card-custom" style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 60%, #b91c1c 100%)', border: 'none', padding: '1.5rem', height: '100%' }}>
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="bi bi-arrow-up-circle-fill" style={{ color: '#fca5a5', fontSize: '1.1rem' }}></i>
                  </div>
                  <div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('admin.reports.totalExpenses')}</div>
                    <div style={{ color: '#fca5a5', fontSize: '0.78rem', fontWeight: 700 }}>{t('admin.reports.claimPayoutOnly')}</div>
                  </div>
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{totalClaimsPaid.toLocaleString()}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: 4 }}>MMK · {t('admin.reports.approvedClaimPayouts')}</div>
                <div style={{ marginTop: 10, fontSize: '0.78rem', color: totalClaimsPaid > 0 ? '#f87171' : '#86efac', fontWeight: 600 }}>
                  {totalClaimsPaid > 0
                    ? <><i className="bi bi-dash-circle me-1"></i>{t('admin.reports.approvedClaimsPaid', { count: reports.approvedClaims })}</>
                    : <><i className="bi bi-check-circle me-1"></i>{t('admin.reports.noClaimPayouts')}</>}
                </div>
                <div style={{ marginTop: 12, padding: '0.6rem 0.85rem', background: 'rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)' }}>
                  <i className="bi bi-info-circle me-1"></i>{t('admin.reports.expenseNote')}
                </div>
              </div>
            </div>
          </div>

          {/* Net result card */}
          <div className="card-custom" style={{ background: netProfit >= 0 ? 'linear-gradient(135deg, #0f172a, #1e3a8a)' : 'linear-gradient(135deg, #1c1917, #44403c)', border: 'none', padding: '1.25rem' }}>
            <div className="row align-items-center g-3">
              <div className="col-12 col-md-5">
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t('admin.reports.netProfitFormula')}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: netProfit >= 0 ? '#86efac' : '#fca5a5', lineHeight: 1 }}>
                  {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', marginTop: 4 }}>MMK</div>
              </div>
              <div className="col-12 col-md-7">
                <div className="row g-2">
                  {[
                    { label: t('admin.reports.thisMonthRevenue'), value: thisMonthRev.toLocaleString() + ' MMK', color: '#93c5fd' },
                    { label: t('admin.reports.profitMargin'), value: Pct(profitMargin), color: profitMargin >= 20 ? '#86efac' : profitMargin >= 0 ? '#fde68a' : '#fca5a5' },
                  ].map(c => (
                    <div key={c.label} className="col-6">
                      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.65rem 0.75rem' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: c.color }}>{c.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{c.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card-custom">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <i className="bi bi-speedometer2 me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.kpiTitle')}
            </h6>
            <div className="row g-3 align-items-center">
              {[
                { label: t('admin.reports.lossRatio'), desc: t('admin.reports.claimsOverPremium'), value: lossRatio, max: 100, color: lossRatio < 60 ? '#16a34a' : lossRatio < 80 ? '#d97706' : '#dc2626', note: lossRatio < 60 ? t('admin.reports.good') : lossRatio < 80 ? t('admin.reports.caution') : t('admin.reports.risk') },
                { label: t('admin.reports.profitMargin'), desc: t('admin.reports.profitOverPremium'), value: Math.max(0, Math.min(profitMargin, 100)), max: 100, color: profitMargin >= 20 ? '#16a34a' : profitMargin >= 0 ? '#d97706' : '#dc2626', note: profitMargin >= 20 ? t('admin.reports.good') : profitMargin >= 0 ? t('admin.reports.low') : t('admin.reports.loss') },
              ].map(g => (
                <div key={g.label} className="col-6 text-center">
                  <DonutGauge value={g.value} max={g.max} color={g.color} size={130} label={g.label} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{g.desc}</div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, marginTop: 3, color: g.color }}>{g.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="row g-3">
            {[
              { label: t('admin.reports.totalPremiumIncome'), value: MMK(totalRevenue), icon: 'bi-arrow-down-circle-fill', color: '#16a34a', bg: '#dcfce7' },
              { label: t('admin.reports.totalClaimPayout'), value: MMK(totalClaimsPaid), icon: 'bi-arrow-up-circle-fill', color: '#dc2626', bg: '#fee2e2' },
              { label: t('admin.reports.netProfitPremiumClaim'), value: MMK(netProfit), icon: 'bi-graph-up', color: netProfit >= 0 ? '#16a34a' : '#dc2626', bg: netProfit >= 0 ? '#dcfce7' : '#fee2e2' },
            ].map(c => (
              <div key={c.label} className="col-12 col-md-4">
                <StatCard {...c} />
              </div>
            ))}
          </div>

          <div className="card-custom">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.monthlyPremiumVsClaims')}
            </h6>
             <GroupedBarChart data1={monRev} data2={monClaims} label1={t('admin.reports.premiumRevenue')} label2={t('admin.reports.claimPayout')} height={200} />
          </div>

          {/* Insurance Type financial summary */}
          {Object.keys(profitByType).length > 0 && (
            <div className="card-custom p-0">
              <div style={{ padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  <i className="bi bi-table me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.financialByType')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('admin.reports.financialByTypeDesc')}
                </div>
              </div>
              <div className="table-custom">
                <table className="w-100">
                  <thead>
                    <tr>
                      {[t('admin.reports.insuranceType'), t('admin.reports.incomePremium'), t('admin.reports.outflowClaims'), t('admin.reports.profitLoss'), t('admin.reports.lossRatio')].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(profitByType).sort((a, b) => Number(b[1].income) - Number(a[1].income)).map(([type, d]) => {
                      const income  = Number(d.income  || 0)
                      const outflow = Number(d.outflow || 0)
                      const profit  = Number(d.profit  || 0)
                      const lr      = income > 0 ? (outflow / income * 100).toFixed(1) : '—'
                      return (
                        <tr key={type}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: typeColor(type), flexShrink: 0 }}></div>
                              <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{type}</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>{income.toLocaleString()} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>MMK</span></td>
                          <td style={{ fontWeight: 700, color: outflow > 0 ? '#dc2626' : 'var(--text-muted)' }}>{outflow > 0 ? outflow.toLocaleString() + ' MMK' : '—'}</td>
                          <td>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {profit >= 0 ? '+' : ''}{profit.toLocaleString()} MMK
                            </span>
                            <div style={{ fontSize: '0.68rem', color: profit >= 0 ? '#16a34a' : '#dc2626', marginTop: 1 }}>
                              {profit >= 0 ? `✅ ${t('admin.reports.profit_positive')}` : `🔴 ${t('admin.reports.profit_negative')}`}
                            </div>
                          </td>
                          <td>
                            {lr === '—' ? <span style={{ color: 'var(--text-muted)' }}>—</span> : (
                              <div className="d-flex align-items-center gap-2">
                                <div style={{ flex: 1, height: 7, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                                  <div style={{ height: '100%', width: `${Math.min(Number(lr), 100)}%`, background: Number(lr) < 60 ? '#16a34a' : Number(lr) < 90 ? '#d97706' : '#dc2626', borderRadius: 99 }}></div>
                                </div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: Number(lr) < 60 ? '#16a34a' : Number(lr) < 90 ? '#d97706' : '#dc2626', minWidth: 40 }}>{lr}%</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    <tr style={{ background: 'var(--bg-secondary)', fontWeight: 800 }}>
                      <td style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        <i className="bi bi-calculator me-1" style={{ color: 'var(--primary)' }}></i>{t('admin.reports.totalRow')}
                      </td>
                      <td style={{ fontWeight: 800, color: '#16a34a' }}>{totalRevenue.toLocaleString()} MMK</td>
                      <td style={{ fontWeight: 800, color: totalClaimsPaid > 0 ? '#dc2626' : 'var(--text-muted)' }}>{totalClaimsPaid > 0 ? totalClaimsPaid.toLocaleString() + ' MMK' : '—'}</td>
                      <td>
                        <span style={{ fontWeight: 900, fontSize: '0.95rem', color: netProfit >= 0 ? '#16a34a' : '#dc2626' }}>
                          {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} MMK
                        </span>
                      </td>
                      <td style={{ fontWeight: 800, color: lossRatio < 60 ? '#16a34a' : lossRatio < 90 ? '#d97706' : '#dc2626' }}>{Pct(lossRatio)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: By Type ── */}
      {tab === 'bytype' && (
        <div className="fade-in d-flex flex-column gap-4">
          <div className="row g-4">
            <div className="col-12 col-lg-5">
              <div className="card-custom h-100">
                <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  <i className="bi bi-pie-chart me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.policyTypeShare')}
                </h6>
                <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap">
                  <PieChart data={byType} colors={TYPE_COLORS} size={200} />
                  <div className="d-flex flex-column gap-2">
                    {Object.entries(byType).map(([type, count]) => {
                      const total = Object.values(byType).reduce((s, v) => s + Number(v), 0)
                      const pct = total > 0 ? ((Number(count) / total) * 100).toFixed(1) : 0
                      return (
                        <div key={type} className="d-flex align-items-center gap-2">
                          <div style={{ width: 12, height: 12, borderRadius: 3, background: typeColor(type), flexShrink: 0 }}></div>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{type}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{count} ({pct}%)</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-7">
              <div className="card-custom h-100">
                <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.revenueByType')}
                </h6>
                <BarChart data={revByType} color={Object.keys(revByType).map(typeColor)} height={200} />
              </div>
            </div>
          </div>

          {/* Profit/Loss by type */}
          <div className="card-custom">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <i className="bi bi-bar-chart-steps me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.claimsByTypeLast12Months')}
            </h6>
            {Object.keys(claimsByType).length === 0 ? <Empty /> : (
              <div className="d-flex flex-column gap-3">
                {Object.entries(claimsByType).map(([type, monthData]) => {
                  const typeTotal = Object.values(monthData).reduce((s, v) => s + Number(v), 0)
                  return (
                    <div key={type}>
                      <div className="d-flex justify-content-between mb-1">
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: typeColor(type) }}></div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{type}</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#dc2626' }}>{typeTotal.toLocaleString()} MMK</span>
                      </div>
                      <BarChart data={monthData} color={typeColor(type)} height={100} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card-custom p-0">
            <div style={{ padding: '1rem 1.25rem 0.75rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>
              <i className="bi bi-table me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.typeDetails')}
            </div>
            <div className="table-custom">
              <table className="w-100">
                <thead>
                  <tr>
                    {[t('admin.reports.insuranceType'), t('admin.reports.activePolicies'), t('admin.reports.premiumRevenueMmk'), t('admin.reports.claimPayoutMmk'), t('admin.reports.profitLossMmk'), t('admin.reports.incomeShare')].map(h => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byType).sort((a, b) => Number(revByType[b[0]] || 0) - Number(revByType[a[0]] || 0)).map(([type, count]) => {
                    const rev = Number(revByType[type] || 0)
                    const claimsPaid = Number(claimsTotalByType[type] || 0)
                    const profit = rev - claimsPaid
                    const totalRev = Object.values(revByType).reduce((s, v) => s + Number(v), 0)
                    const pct = totalRev > 0 ? (rev / totalRev * 100).toFixed(1) : 0
                    return (
                      <tr key={type}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: typeColor(type) }}></div>
                            <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{type}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{count}</td>
                        <td style={{ fontWeight: 700, color: '#16a34a' }}>{rev.toLocaleString()}</td>
                        <td style={{ fontWeight: 700, color: '#dc2626' }}>{claimsPaid.toLocaleString()}</td>
                        <td style={{ fontWeight: 800, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: typeColor(type), borderRadius: 99 }}></div>
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: typeColor(type), minWidth: 36 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Wallet ── */}
      {tab === 'wallet' && <WalletTab wallet={wallet} walletLoaded={walletLoaded} />}

      {/* ── TAB: Claims Payout ── */}
      {tab === 'claims' && (
        <ClaimsPayoutTab
          claimsPayoutByCustomer={claimsPayoutByCustomer}
          totalClaimsPaid={totalClaimsPaid}
          monthlyClaims={monClaims}
          claimsByType={claimsByType}
          reports={reports}
        />
      )}

      {/* ── TAB: Agent Performance ── */}
      {tab === 'agents' && <AgentPerformanceTab agents={agentPerformance} />}

      {/* ── TAB: Package Popularity ── */}
      {tab === 'packages' && <PackagePopularityTab packages={packagePopularity} />}

      {/* ── TAB: Application Analytics ── */}
      {tab === 'analytics' && (
        <div className="fade-in d-flex flex-column gap-4">
          <div className="row g-3">
            {[
              { label: t('admin.reports.customers'), value: reports.totalCustomers, icon: 'bi-people-fill', color: '#1d4ed8', bg: '#eff6ff' },
              { label: t('admin.reports.activePolicies'), value: reports.activePolicies, icon: 'bi-shield-check', color: '#16a34a', bg: '#f0fdf4' },
              { label: t('admin.reports.totalApplications'), value: reports.totalApplications, icon: 'bi-file-earmark-text', color: '#7c3aed', bg: '#f5f3ff' },
              { label: t('admin.reports.pending'), value: reports.pendingApplications, icon: 'bi-hourglass-split', color: '#d97706', bg: '#fffbeb' },
              { label: t('admin.reports.rejected'), value: reports.rejectedApplications, icon: 'bi-x-circle', color: '#dc2626', bg: '#fef2f2' },
              { label: t('admin.reports.approvedClaims'), value: reports.approvedClaims, icon: 'bi-check-circle', color: '#0891b2', bg: '#ecfeff' },
            ].map(c => (
              <div key={c.label} className="col-6 col-md-4 col-xl-2">
                <StatCard {...c} />
              </div>
            ))}
          </div>
          <div className="card-custom">
            <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.monthlyApplications')}
            </h6>
            <BarChart data={monApps} height={190} />
          </div>
          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="card-custom h-100">
                <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  <i className="bi bi-pie-chart me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.applicationStatusBreakdown')}
                </h6>
                <PieChart
                  data={{ Approved: reports.activePolicies, Pending: reports.pendingApplications, Rejected: reports.rejectedApplications }}
                  colors={{ Approved: '#16a34a', Pending: '#d97706', Rejected: '#dc2626' }}
                  size={200}
                />
                <div className="d-flex justify-content-center gap-4 mt-3 flex-wrap">
                  {[[t('admin.reports.approved'), '#16a34a', reports.activePolicies], [t('admin.reports.pending'), '#d97706', reports.pendingApplications], [t('admin.reports.rejected'), '#dc2626', reports.rejectedApplications]].map(([l, c, v]) => (
                    <div key={l} className="text-center">
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: c, margin: '0 auto 4px' }}></div>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: c }}>{v}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className="card-custom h-100">
                <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  <i className="bi bi-file-earmark-medical me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.claimsSummary')}
                </h6>
                <div className="d-flex flex-column gap-3">
                  {[
                    { label: t('admin.reports.totalClaims'), value: reports.totalClaims, color: '#2563eb', w: 100 },
                    { label: t('admin.reports.approved'), value: reports.approvedClaims, color: '#16a34a', w: reports.totalClaims > 0 ? Math.round(reports.approvedClaims / reports.totalClaims * 100) : 0 },
                    { label: t('admin.reports.pending'), value: reports.pendingClaims, color: '#d97706', w: reports.totalClaims > 0 ? Math.round(reports.pendingClaims / reports.totalClaims * 100) : 0 },
                    { label: t('admin.reports.rejected'), value: reports.rejectedClaims, color: '#dc2626', w: reports.totalClaims > 0 ? Math.round(reports.rejectedClaims / reports.totalClaims * 100) : 0 },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="d-flex justify-content-between mb-1">
                        <span style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</span>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: item.color }}>{item.value ?? 0}</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${item.w}%`, background: item.color, borderRadius: 99 }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Monthly Report & Reset ── */}
      {tab === 'monthly' && (
        <div className="fade-in d-flex flex-column gap-4">
          {/* Hero action card */}
          <div className="card-custom" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', border: 'none', padding: '1.75rem' }}>
            <div className="row align-items-center g-4">
              <div className="col-12 col-md-7">
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                  {t('admin.reports.monthlyReportTitle')}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1.25, marginBottom: 8 }}>
                  {lastReset
                    ? new Date(lastReset.resetAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'Inception'
                  }
                  <span style={{ color: 'rgba(255,255,255,0.5)', margin: '0 8px', fontWeight: 400 }}>→</span>
                  {currentMonthName} {currentYear}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                  {t('admin.reports.monthlyReportSubtitle')}
                </p>
              </div>
              <div className="col-12 col-md-5">
                <div className="d-flex flex-column gap-2">
                  {/* Download PDF (current month, no reset) */}
                  <button type="button" onClick={handleDownloadPdf} disabled={pdfBusy}
                    style={{
                      padding: '0.7rem 1.25rem', borderRadius: 10, border: 'none', cursor: pdfBusy ? 'not-allowed' : 'pointer',
                      background: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                      display: 'flex', alignItems: 'center', gap: 8, opacity: pdfBusy ? 0.7 : 1,
                      backdropFilter: 'blur(4px)', transition: 'all .15s',
                    }}>
                    {pdfBusy
                      ? <><div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16, borderWidth: 2 }}></div>{t('admin.reports.generatingPdf')}</>
                      : <><i className="bi bi-file-earmark-pdf-fill" style={{ fontSize: '1rem' }}></i>{t('admin.reports.downloadMonthlyPdf')}</>
                    }
                  </button>
                  {/* Monthly Reset — archives PDF and records period end */}
                  <button type="button" onClick={() => setShowResetModal(true)} disabled={resetBusy}
                    style={{
                      padding: '0.7rem 1.25rem', borderRadius: 10, border: 'none', cursor: resetBusy ? 'not-allowed' : 'pointer',
                      background: resetBusy ? 'rgba(217,119,6,0.5)' : 'linear-gradient(135deg, #d97706, #b45309)', color: '#fff',
                      fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, opacity: resetBusy ? 0.7 : 1, transition: 'all .15s',
                    }}>
                    {resetBusy
                      ? <><div className="spinner-border spinner-border-sm" style={{ width: 16, height: 16, borderWidth: 2 }}></div>{t('admin.reports.resetting')}</>
                      : <><i className="bi bi-arrow-counterclockwise" style={{ fontSize: '1rem' }}></i>{t('admin.reports.monthlyReset')}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* What the reset does — info panel */}
          <div className="card-custom" style={{ borderLeft: '4px solid #d97706', background: 'var(--bg-secondary)' }}>
            <div className="d-flex gap-3 align-items-start">
              <i className="bi bi-info-circle-fill" style={{ color: '#d97706', fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }}></i>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: '0.9rem' }}>
                  Monthly Reset — How it works
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 1.1rem', color: 'var(--text-secondary)', fontSize: '0.83rem', lineHeight: 1.7 }}>
                  <li>Exports <strong>all data from {lastReset ? new Date(lastReset.resetAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Inception'} → today</strong> as a comprehensive PDF covering: Overview, By Type, Premium Wallet, Agents, Plan Popularity, Monthly Breakdown</li>
                  <li><strong>Resets all analytics to zero</strong> — the dashboard will only count data created from this moment forward</li>
                  <li>Saves the PDF to the archive below for re-download at any time</li>
                  <li><strong>Does NOT delete</strong> any business data (payments, claims, applications remain intact)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Snapshots archive table */}
          <div className="card-custom p-0">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  <i className="bi bi-archive me-2" style={{ color: 'var(--primary)' }}></i>
                  {t('admin.reports.snapshotsTitle')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('admin.reports.snapshotsSubtitle')}</div>
              </div>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.7rem', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700 }}>
                {snapshots.length} {snapshots.length === 1 ? 'report' : 'reports'}
              </span>
            </div>

            {snapsLoading ? (
              <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
            ) : snapshots.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-archive" style={{ fontSize: '2.5rem', color: 'var(--border)', display: 'block', marginBottom: 8 }}></i>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>{t('admin.reports.snapshotsEmpty')}</p>
              </div>
            ) : (
              <div className="table-custom">
                <table className="w-100">
                  <thead>
                    <tr>
                      {[
                        t('admin.reports.snapshotMonth'),
                        t('admin.reports.snapshotRevenue'),
                        t('admin.reports.snapshotClaims'),
                        t('admin.reports.snapshotProfit'),
                        t('admin.reports.snapshotApplications'),
                        t('admin.reports.snapshotPolicies'),
                        t('admin.reports.snapshotDate'),
                        t('admin.reports.snapshotDownload'),
                      ].map(h => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map(s => {
                      const profit = Number(s.netProfit || 0)
                      const rev    = Number(s.totalRevenue || 0)
                      const claims = Number(s.totalClaimsPaid || 0)
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                              {s.monthName} {s.year}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {s.totalCustomers} customers
                            </div>
                          </td>
                          <td style={{ fontWeight: 700, color: '#16a34a' }}>{rev.toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: claims > 0 ? '#dc2626' : 'var(--text-muted)' }}>
                            {claims > 0 ? claims.toLocaleString() : '—'}
                          </td>
                          <td>
                            <span style={{ fontWeight: 800, color: profit >= 0 ? '#16a34a' : '#dc2626' }}>
                              {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{s.totalApplications}</td>
                          <td style={{ fontWeight: 600, color: '#16a34a' }}>{s.newPolicies}</td>
                          <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {s.createdAt ? new Date(s.createdAt).toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </td>
                          <td>
                            <button type="button"
                              onClick={() => handleSnapshotDownload(s.id, s.year, s.month)}
                              style={{ padding: '0.3rem 0.75rem', borderRadius: 7, border: 'none', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <i className="bi bi-download"></i> PDF
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Claims Payout Tab ────────────────────────────────────────────────────────
function ClaimsPayoutTab({ claimsPayoutByCustomer, totalClaimsPaid, monthlyClaims, claimsByType, reports }) {
  const { t } = useTranslation()
  const [expand, setExpand] = useState(null)

  const totalClaims = reports?.totalClaims || 0
  const approvedClaims = reports?.approvedClaims || 0

  return (
    <div className="fade-in d-flex flex-column gap-4">
      {/* Hero */}
      <div className="card-custom" style={{ background: 'linear-gradient(135deg, #7f1d1d, #991b1b, #b91c1c)', border: 'none', padding: '1.5rem' }}>
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-5">
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {t('admin.reports.totalClaimPayouts')}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {Number(totalClaimsPaid).toLocaleString()}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: 4 }}>MMK</div>
          </div>
          <div className="col-12 col-md-7">
            <div className="row g-2">
              {[
                { l: t('admin.reports.customersWithClaims'), v: claimsPayoutByCustomer.length + ' ' + t('admin.reports.people'), c: '#fca5a5' },
                { l: t('admin.reports.approvedClaims'), v: approvedClaims + ' ' + t('admin.reports.items'), c: '#fde68a' },
                { l: t('admin.reports.averagePerCustomer'), v: claimsPayoutByCustomer.length > 0 ? Math.round(Number(totalClaimsPaid) / claimsPayoutByCustomer.length).toLocaleString() + ' MMK' : '—', c: '#6ee7b7' },
                { l: t('admin.reports.totalClaims'), v: totalClaims + ' ' + t('admin.reports.items'), c: '#c4b5fd' },
              ].map(x => (
                <div key={x.l} className="col-6">
                  <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{x.l}</div>
                    <div style={{ fontWeight: 800, color: x.c, fontSize: '0.95rem' }}>{x.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Monthly claims chart */}
      <div className="card-custom">
        <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <i className="bi bi-bar-chart me-2" style={{ color: '#dc2626' }}></i>
          {t('admin.reports.monthlyClaimPayouts')}
        </h6>
        <BarChart data={monthlyClaims} color="#dc2626" height={180} />
      </div>

      {/* Claims by type pie */}
      {Object.keys(claimsByType).length > 0 && (
        <div className="card-custom">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            <i className="bi bi-pie-chart me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.reports.claimsByType')}
          </h6>
          <div className="d-flex align-items-center justify-content-center gap-4 flex-wrap">
            <PieChart
              data={Object.fromEntries(Object.entries(claimsByType).map(([claimType, monthData]) => [claimType, Object.values(monthData).reduce((s, v) => s + Number(v), 0)]))}
              colors={TYPE_COLORS} size={200}
            />
            <div className="d-flex flex-column gap-2">
              {Object.entries(claimsByType).map(([type, monthData]) => {
                const total = Object.values(monthData).reduce((s, v) => s + Number(v), 0)
                return (
                  <div key={type} className="d-flex align-items-center gap-2">
                    <div style={{ width: 12, height: 12, borderRadius: 3, background: typeColor(type), flexShrink: 0 }}></div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{type}</span>
                    <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 700 }}>{total.toLocaleString()} MMK</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Per-customer claim payout list */}
      <div className="card-custom p-0">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <i className="bi bi-people me-2" style={{ color: '#dc2626' }}></i>
            {t('admin.reports.claimsByCustomer')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            {t('admin.reports.customersPaidClaims', { count: claimsPayoutByCustomer.length })}
          </div>
        </div>
        {claimsPayoutByCustomer.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <i className="bi bi-cash-stack" style={{ fontSize: '2rem', opacity: 0.3, display: 'block', marginBottom: 6 }}></i>
            {t('admin.reports.noClaimPayouts')}
          </div>
        ) : (
          <div>
            {claimsPayoutByCustomer.map((c, idx) => {
              const isOpen = expand === idx
              return (
                <div key={c.customerId} style={{ borderBottom: idx < claimsPayoutByCustomer.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div
                    className="d-flex align-items-center justify-content-between flex-wrap gap-2"
                    style={{ padding: '0.85rem 1.25rem', cursor: 'pointer', background: isOpen ? 'var(--bg-secondary)' : 'transparent', transition: 'background .12s' }}
                    onClick={() => setExpand(isOpen ? null : idx)}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #b91c1c, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                        {c.customerName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.customerName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{c.customerEmail}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#dc2626' }}>{Number(c.totalPayout).toLocaleString()} <span style={{ fontSize: '0.72rem' }}>MMK</span></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.claimCount} {t('admin.reports.claims')}</div>
                      </div>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                    </div>
                  </div>
                  {isOpen && c.claims?.length > 0 && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1.25rem 0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('admin.reports.claimHistory')}</div>
                      <div className="d-flex flex-column gap-2">
                        {c.claims.map(claim => (
                          <div key={claim.claimId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, background: 'var(--bg-primary)', borderRadius: 8, padding: '0.55rem 0.85rem', border: '1px solid var(--border)' }}>
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-shield-check" style={{ color: '#16a34a', fontSize: '0.9rem' }}></i>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  #{claim.claimId} — {claim.claimType || '—'}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {claim.insuranceType && <span className="type-badge-pill" style={{ padding: '0.05rem 0.35rem', borderRadius: 3, marginRight: 4 }}>{claim.insuranceType}</span>}
                                  {claim.approvedAt ? new Date(claim.approvedAt).toLocaleDateString() : '—'}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#dc2626' }}>{Number(claim.amount).toLocaleString()} MMK</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent Performance Tab ────────────────────────────────────────────────────
function AgentPerformanceTab({ agents }) {
  const { t } = useTranslation()
  const maxApps = Math.max(...agents.map(a => a.applicationsHandled || 0), 1)

  return (
    <div className="fade-in d-flex flex-column gap-4">
      {/* Summary stats */}
      <div className="row g-3">
        {[
          { label: t('admin.reports.totalAgents'), value: agents.length, icon: 'bi-person-badge', color: '#1d4ed8', bg: '#eff6ff' },
          { label: t('admin.reports.totalApplicationsHandled'), value: agents.reduce((s, a) => s + (a.applicationsHandled || 0), 0), icon: 'bi-file-earmark', color: '#7c3aed', bg: '#f5f3ff' },
          { label: t('admin.reports.approvedApplications'), value: agents.reduce((s, a) => s + (a.applicationsApproved || 0), 0), icon: 'bi-shield-check', color: '#16a34a', bg: '#f0fdf4' },
          { label: t('admin.reports.claimsHandled'), value: agents.reduce((s, a) => s + (a.claimsHandled || 0), 0), icon: 'bi-clipboard2', color: '#d97706', bg: '#fffbeb' },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <StatCard {...c} />
          </div>
        ))}
      </div>

      {/* Bar chart of applications per agent */}
      {agents.length > 0 && (
        <div className="card-custom">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.reports.applicationsPerAgent')}
          </h6>
          <BarChart
            data={Object.fromEntries(agents.map(a => [a.agentName?.split(' ')[0] || 'Agent', a.applicationsHandled || 0]))}
            color="#1d4ed8"
            height={180}
          />
        </div>
      )}

      {/* Agent performance table */}
      {agents.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-person-badge" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('admin.reports.noAgents')}</h5>
        </div>
      ) : (
        <div className="card-custom p-0">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <i className="bi bi-table me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.reports.agentPerformanceDetails')}
          </div>
          <div className="table-custom">
            <table className="w-100">
              <thead>
                <tr>
                  {[t('admin.reports.agent'), t('admin.reports.insuranceType'), t('admin.reports.applications'), t('admin.reports.approved'), t('admin.reports.claims'), t('admin.reports.approvalRate'), t('admin.reports.performance')].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, i) => {
                  const rate = agent.approvalRate || 0
                  const rateColor = rate >= 70 ? '#16a34a' : rate >= 40 ? '#d97706' : '#dc2626'
                  const barW = maxApps > 0 ? ((agent.applicationsHandled || 0) / maxApps * 100) : 0
                  return (
                    <tr key={agent.agentId}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${(i * 67) % 360}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                            {agent.agentName?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{agent.agentName}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{agent.agentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {agent.insuranceType ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: typeColor(agent.insuranceType), background: typeColor(agent.insuranceType) + '20', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                            {agent.insuranceType}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ALL</span>}
                      </td>
                      <td><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{agent.applicationsHandled || 0}</span></td>
                      <td><span style={{ fontWeight: 700, color: '#16a34a' }}>{agent.applicationsApproved || 0}</span></td>
                      <td><span style={{ fontWeight: 600, color: '#d97706' }}>{agent.claimsHandled || 0}</span></td>
                      <td>
                        <span style={{ fontWeight: 800, color: rateColor, fontSize: '0.88rem' }}>{rate.toFixed(1)}%</span>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: 'var(--primary)', borderRadius: 99 }}></div>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {agent.applicationsHandled || 0} / {maxApps} cases
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Package Popularity Tab ───────────────────────────────────────────────────
function PackagePopularityTab({ packages }) {
  const { t } = useTranslation()
  const maxApps = Math.max(...packages.map(p => p.applicationCount || 0), 1)

  return (
    <div className="fade-in d-flex flex-column gap-4">
      <div className="row g-3">
        {[
          { label: t('admin.reports.totalPlans'), value: packages.length, icon: 'bi-box-seam', color: '#7c3aed', bg: '#f5f3ff' },
          { label: t('admin.reports.activePlans'), value: packages.filter(p => p.active).length, icon: 'bi-check-circle', color: '#16a34a', bg: '#f0fdf4' },
          { label: t('admin.reports.totalApplications'), value: packages.reduce((s, p) => s + (p.applicationCount || 0), 0), icon: 'bi-file-earmark', color: '#1d4ed8', bg: '#eff6ff' },
          { label: t('admin.reports.totalPlanRevenue'), value: packages.reduce((s, p) => s + Number(p.revenue || 0), 0).toLocaleString() + ' MMK', icon: 'bi-cash-stack', color: '#d97706', bg: '#fffbeb' },
        ].map(c => (
          <div key={c.label} className="col-6 col-md-3">
            <StatCard {...c} />
          </div>
        ))}
      </div>

      {/* Popularity bar chart */}
      {packages.length > 0 && (
        <div className="card-custom">
          <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
            <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.reports.applicationsPerPlan')}
          </h6>
          <BarChart
            data={Object.fromEntries(packages.slice(0, 15).map(p => [p.packageName?.substring(0, 10) || 'Plan', p.applicationCount || 0]))}
            color={packages.map(p => typeColor(p.packageType))}
            height={180}
          />
        </div>
      )}

      {/* Package table */}
      {packages.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-box-seam" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('admin.reports.noPackages')}</h5>
        </div>
      ) : (
        <div className="card-custom p-0">
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            <i className="bi bi-table me-2" style={{ color: 'var(--primary)' }}></i>
            {t('admin.reports.planDetails')}
          </div>
          <div className="table-custom">
            <table className="w-100">
              <thead>
                <tr>
                  {[t('admin.reports.plan'), t('admin.reports.type'), t('admin.reports.status'), t('admin.reports.applications'), t('admin.reports.approved'), t('admin.reports.approvalPercent'), t('admin.reports.revenueMmk'), t('admin.reports.popularity')].map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => {
                  const approvalPct = pkg.applicationCount > 0 ? Math.round(pkg.approvedCount / pkg.applicationCount * 100) : 0
                  const barW = maxApps > 0 ? (pkg.applicationCount / maxApps * 100) : 0
                  return (
                    <tr key={pkg.packageId}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{pkg.packageName}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: typeColor(pkg.packageType), background: typeColor(pkg.packageType) + '20', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                          {pkg.packageType}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${pkg.active ? 'badge-active' : 'badge-cancelled'}`}>
                          {pkg.active ? t('admin.reports.active') : t('admin.reports.inactive')}
                        </span>
                      </td>
                      <td><span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{pkg.applicationCount || 0}</span></td>
                      <td><span style={{ fontWeight: 700, color: '#16a34a' }}>{pkg.approvedCount || 0}</span></td>
                      <td>
                        <span style={{ fontWeight: 700, color: approvalPct >= 60 ? '#16a34a' : approvalPct >= 30 ? '#d97706' : '#dc2626' }}>
                          {approvalPct}%
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{Number(pkg.revenue || 0).toLocaleString()}</td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ height: 8, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${barW}%`, background: typeColor(pkg.packageType), borderRadius: 99 }}></div>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {pkg.applicationCount || 0} {t('admin.reports.applications').toLowerCase()}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Wallet Tab ────────────────────────────────────────────────────────────────
function WalletTab({ wallet, walletLoaded }) {
  const { t } = useTranslation()
  const [expand, setExpand] = useState(null)

  if (!walletLoaded) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" style={{ color: 'var(--primary)' }}></div>
        <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('admin.reports.walletLoading')}</p>
      </div>
    )
  }
  if (!wallet) {
    return (
      <div className="card-custom text-center py-5">
        <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem', color: '#d97706', display: 'block', marginBottom: 8 }}></i>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>{t('admin.reports.walletLoadFailed')}</p>
      </div>
    )
  }

  const balance   = Number(wallet.walletBalance   || 0)
  const inflow    = Number(wallet.totalInflow     || 0)
  const claims    = Number(wallet.totalClaimsPaid || 0)
  const customers = wallet.customers || []
  const monIn     = wallet.monthlyInflow  || {}
  const monOut    = wallet.monthlyOutflow || {}

  return (
    <div className="fade-in d-flex flex-column gap-4">
      <div className="card-custom" style={{ background: balance >= 0 ? 'linear-gradient(135deg, #064e3b, #065f46, #047857)' : 'linear-gradient(135deg, #7f1d1d, #991b1b)', border: 'none', padding: '1.5rem' }}>
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-5">
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{t('admin.reports.walletBalance')}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{balance.toLocaleString()}</div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: 4 }}>MMK</div>
            <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.3rem 0.7rem' }}>
              <i className={`bi bi-${balance >= 0 ? 'check-circle-fill' : 'exclamation-triangle-fill'}`} style={{ color: balance >= 0 ? '#6ee7b7' : '#fca5a5', fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{balance >= 0 ? t('admin.reports.profitable') : t('admin.reports.lossMaking')}</span>
            </div>
          </div>
          <div className="col-12 col-md-7">
            <div className="row g-2">
              {[
                { l: t('admin.reports.customerPremiumIncome'), v: inflow, icon: 'bi-arrow-down-circle', c: '#6ee7b7' },
                { l: t('admin.reports.claimPayout'), v: claims, icon: 'bi-arrow-up-circle', c: '#fca5a5' },
                { l: t('admin.reports.walletBalanceChange'), v: balance, icon: 'bi-wallet2', c: balance >= 0 ? '#86efac' : '#fca5a5' },
              ].map(x => (
                <div key={x.l} className="col-6">
                  <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.65rem 0.75rem' }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>{x.l}</div>
                    <div style={{ fontWeight: 800, color: x.c, fontSize: '0.95rem' }}>{x.v.toLocaleString()} MMK</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card-custom">
        <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <i className="bi bi-bar-chart me-2" style={{ color: 'var(--primary)' }}></i>
          {t('admin.reports.monthlyPremiumVsClaims')}
        </h6>
        <GroupedBarChart data1={monIn} data2={monOut} label1={t('admin.reports.premiumRevenue')} label2={t('admin.reports.claimPayout')} height={200} />
      </div>

      <div className="card-custom p-0">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              <i className="bi bi-list-check me-2" style={{ color: 'var(--primary)' }}></i>
              {t('admin.reports.customerPremiumPayments')}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{t('admin.reports.customersPaidPremium', { count: customers.length })}</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '0.3rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, color: '#16a34a' }}>
            <i className="bi bi-wallet2 me-1"></i>{t('admin.reports.total')}: {inflow.toLocaleString()} MMK
          </div>
        </div>
        {customers.length === 0 ? (
          <div className="text-center py-5" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{t('admin.reports.noPremiumPayments')}</div>
        ) : (
          <div>
            {customers.map((c, idx) => {
              const isOpen = expand === idx
              return (
                <div key={c.customerId} style={{ borderBottom: idx < customers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div
                    className="d-flex align-items-center justify-content-between flex-wrap gap-2"
                    style={{ padding: '0.85rem 1.25rem', cursor: 'pointer', background: isOpen ? 'var(--bg-secondary)' : 'transparent', transition: 'background .12s' }}
                    onClick={() => setExpand(isOpen ? null : idx)}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                        {c.customerName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{c.customerName}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{c.customerEmail}</div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#16a34a' }}>{Number(c.totalPaid).toLocaleString()} <span style={{ fontSize: '0.72rem' }}>MMK</span></div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.paymentCount} {t('admin.reports.payments')}</div>
                      </div>
                      <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}></i>
                    </div>
                  </div>
                  {isOpen && c.transactions?.length > 0 && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '0.5rem 1.25rem 0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('admin.reports.transactionHistory')}</div>
                      <div className="d-flex flex-column gap-2">
                        {c.transactions.map(tx => (
                          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, background: 'var(--bg-primary)', borderRadius: 8, padding: '0.55rem 0.85rem', border: '1px solid var(--border)' }}>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(tx.insuranceType), flexShrink: 0 }}></div>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tx.policyName || '—'}</div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {tx.insuranceType && <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '0.05rem 0.35rem', borderRadius: 3, marginRight: 4, fontWeight: 700 }}>{tx.insuranceType}</span>}
                                  {tx.periodLabel || ''} · {tx.method || '—'}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#16a34a' }}>{Number(tx.amount).toLocaleString()} MMK</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : '—'}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
