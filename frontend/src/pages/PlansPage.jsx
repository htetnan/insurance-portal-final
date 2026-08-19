import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Navbar from '../components/Navbar'
import api from '../services/api'
import { getTypeMeta } from '../utils/typeMeta'

const OCCUPATIONS = ['Employee', 'Business Owner', 'Driver', 'Student', 'Teacher', 'Engineer', 'Doctor', 'Freelancer', 'Other']

function fmt(n) {
  const num = parseFloat(n)
  if (!num || isNaN(num)) return '—'
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function calcPremium(coverage, rate, intervalMonths) {
  if (!coverage || !rate) return null
  const annual = parseFloat(coverage) * parseFloat(rate)
  const perPayment = annual / (12 / (intervalMonths || 1))
  return { annual, perPayment }
}

// Returns reasonKey instead of hardcoded text so JSX can call t()
function recommendPlans(age, occupation, income) {
  const a = parseInt(age) || 0, inc = parseInt(income) || 0
  const occ = (occupation || '').toLowerCase()
  const rec = []
  if (a >= 18) rec.push({ type: 'LIFE',      reasonKey: 'recLife' })
  if (a >= 16) rec.push({ type: 'HEALTH',    reasonKey: 'recHealth' })
  if (occ.includes('driver') || occ.includes('vehicle')) rec.push({ type: 'VEHICLE', reasonKey: 'recVehicle' })
  if (occ.includes('student')) rec.push({ type: 'EDUCATION', reasonKey: 'recEducation' })
  if (inc > 500000) rec.push({ type: 'PROPERTY', reasonKey: 'recProperty' })
  rec.push({ type: 'TRAVEL', reasonKey: 'recTravel' })
  const seen = new Set()
  return rec.filter(r => { if (seen.has(r.type)) return false; seen.add(r.type); return true }).slice(0, 3)
}

export default function PlansPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plans, setPlans] = useState(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem('publicPlans') || 'null')
      return Array.isArray(c?.data) ? c.data : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(() => {
    try {
      const c = JSON.parse(sessionStorage.getItem('publicPlans') || 'null')
      return !Array.isArray(c?.data) || c.data.length === 0
    } catch { return true }
  })
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [detailPlan, setDetailPlan] = useState(null)
  const [recAge, setRecAge] = useState('')
  const [recOcc, setRecOcc] = useState('')
  const [recIncome, setRecIncome] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [showRec, setShowRec] = useState(false)

  useEffect(() => {
    api.get('/packages/public')
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : []
        setPlans(data)
        try { sessionStorage.setItem('publicPlans', JSON.stringify({ at: Date.now(), data })) } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = plans.filter(p => {
    const typeOk = typeFilter === 'ALL' || p.type === typeFilter
    const recOk = recommendations.length === 0 || !showRec || recommendations.some(r => r.type === p.type)
    return typeOk && recOk
  })

  const handleRecommend = () => {
    setRecommendations(recommendPlans(recAge, recOcc, recIncome))
    setShowRec(true)
    setTypeFilter('ALL')
  }

  const handleApply = plan => {
    if (!user) { navigate('/login'); return }
    navigate('/customer/apply', { state: { planId: plan.id } })
  }

  const freqLabel = freq => t(`plans.freq${freq}`, freq || '—')

  return (
    <div>
      <Navbar />

      {/* Plan Detail Modal */}
      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onApply={() => { setDetailPlan(null); handleApply(detailPlan) }}
          user={user}
          t={t}
          freqLabel={freqLabel}
        />
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div className="text-center mb-5">
          <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {t('plans.header')}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            {t('plans.headerSub')}
          </p>
        </div>

        {/* Recommendation Widget */}
        <div className="card-custom mb-5" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%)', border: 'none' }}>
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-3">
              <div style={{ color: '#fff' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 4 }}>
                  {t('plans.recommenderLabel')}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3 }}>
                  {t('plans.recommenderTitle')}
                </div>
                <div style={{ fontSize: '0.82rem', opacity: 0.8, marginTop: 4 }}>
                  {t('plans.recommenderSub')}
                </div>
              </div>
            </div>
            <div className="col-12 col-md-7">
              <div className="row g-2">
                <div className="col-4">
                  <input type="number"
                    className="form-control-custom w-100"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                    placeholder={t('plans.agePlaceholder')}
                    value={recAge} onChange={e => setRecAge(e.target.value)} min={0} max={100} />
                </div>
                <div className="col-4">
                  <select
                    className="form-select-custom w-100"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                    value={recOcc} onChange={e => setRecOcc(e.target.value)}>
                    <option value="">{t('plans.occupationPlaceholder')}</option>
                    {OCCUPATIONS.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                  </select>
                </div>
                <div className="col-4">
                  <input type="number"
                    className="form-control-custom w-100"
                    style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}
                    placeholder={t('plans.incomePlaceholder')}
                    value={recIncome} onChange={e => setRecIncome(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="col-12 col-md-2">
              <button onClick={handleRecommend} className="btn-primary-custom w-100"
                style={{ justifyContent: 'center', background: '#fff', color: '#1d4ed8', border: 'none' }}>
                <i className="bi bi-magic me-2"></i>{t('plans.findBtn')}
              </button>
            </div>
          </div>

          {showRec && recommendations.length > 0 && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
                {t('plans.recommendedFor')}
              </div>
              <div className="d-flex gap-2 flex-wrap">
                {recommendations.map(rec => (
                  <button key={rec.type} onClick={() => setTypeFilter(rec.type)} style={{
                    padding: '0.35rem 0.85rem', borderRadius: 99,
                    border: '1.5px solid rgba(255,255,255,0.5)',
                    background: typeFilter === rec.type ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
                    color: typeFilter === rec.type ? '#1d4ed8' : '#fff',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                  }}>
                    <i className={`bi ${getTypeMeta(rec.type).icon} me-1`}></i>
                    {getTypeMeta(rec.type).label}
                    <span style={{ opacity: 0.7, fontSize: '0.72rem', marginLeft: 4 }}>
                      — {t(`plans.${rec.reasonKey}`)}
                    </span>
                  </button>
                ))}
                <button onClick={() => { setShowRec(false); setRecommendations([]); setTypeFilter('ALL') }} style={{
                  padding: '0.35rem 0.75rem', borderRadius: 99,
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  background: 'transparent', color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer', fontSize: '0.78rem',
                }}>
                  {t('plans.clearFilter')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="d-flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          {['ALL', ...[...new Set(plans.map(p => p.type))]].map(type => {
            const meta = type === 'ALL' ? null : getTypeMeta(type)
            return (
              <button key={type} onClick={() => setTypeFilter(type)} style={{
                padding: '0.4rem 1rem', borderRadius: 99,
                border: `2px solid ${typeFilter === type ? (meta?.color || 'var(--primary)') : 'var(--border)'}`,
                cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                background: typeFilter === type ? (meta?.bg || 'var(--bg-secondary)') : 'transparent',
                color: typeFilter === type ? (meta?.color || 'var(--primary)') : 'var(--text-secondary)',
              }}>
                {meta && <i className={`bi ${meta.icon} me-1`}></i>}
                {type === 'ALL' ? t('plans.allPlansBtn') : meta?.label || type}
              </button>
            )
          })}
        </div>

        {/* Plan Cards */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border" style={{ color: 'var(--primary)' }}></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-custom text-center py-5">
            <i className="bi bi-search" style={{ fontSize: '2.5rem', color: 'var(--border)' }}></i>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>{t('plans.notFound')}</p>
          </div>
        ) : (
          <div className="row g-4">
            {filtered.map(plan => {
              const meta = getTypeMeta(plan.type)
              const tiers = Array.isArray(plan.durationTiers) && plan.durationTiers.length > 0 ? plan.durationTiers : []
              const minRate = tiers.length > 0 ? Math.min(...tiers.map(tier => tier.premiumRate)) : 0
              return (
                <div key={plan.id} className="col-12 col-md-6 col-xl-4">
                  <div className="card-custom h-100"
                    style={{ display: 'flex', flexDirection: 'column', border: `2px solid var(--border)`, transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.boxShadow = `0 8px 24px ${meta.color}22` }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '' }}>

                    {/* Card Header */}
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '1.4rem' }}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', lineHeight: 1.3 }}>{plan.name}</div>
                      </div>
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '0.85rem' }}>{plan.description}</p>

                    {/* Key Stats */}
                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div style={{ background: meta.bg, borderRadius: 8, padding: '0.5rem 0.65rem' }}>
                          <div style={{ fontSize: '0.67rem', color: meta.color, textTransform: 'uppercase', fontWeight: 700 }}>
                            {t('plans.premiumRate')}
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                            {minRate ? `${(minRate * 100).toFixed(1)}%` : '—'}/year{tiers.length > 1 ? '+' : ''}
                          </div>
                        </div>
                      </div>
                      <div className="col-6">
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.5rem 0.65rem' }}>
                          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {t('plans.payment')}
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem' }}>
                            {freqLabel(plan.paymentFrequency)}
                          </div>
                        </div>
                      </div>
                      <div className="col-12">
                        <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.5rem 0.65rem' }}>
                          <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                            {t('plans.coverageRange')}
                          </div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            {fmt(plan.coverageMin)} – {fmt(plan.coverageMax)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duration Tags */}
                    {tiers.length > 0 && (
                      <div className="mb-3">
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 5, textTransform: 'uppercase' }}>
                          {t('plans.availDurations')}
                        </div>
                        <div className="d-flex gap-1 flex-wrap">
                          {tiers.map(tier => (
                            <span key={tier.years} style={{ padding: '0.2rem 0.55rem', borderRadius: 6, background: meta.bg, color: meta.color, fontSize: '0.75rem', fontWeight: 700 }}>
                              {tier.years} {t('plans.yearsUnit')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Benefits preview */}
                    {(plan.benefits || []).length > 0 && (
                      <div className="mb-2">
                        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                          {t('plans.benefitsLabel')}
                        </div>
                        {(plan.benefits || []).slice(0, 3).map((b, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 3 }}>
                            <i className="bi bi-check-circle-fill" style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }}></i>{b}
                          </div>
                        ))}
                        {(plan.benefits || []).length > 3 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            +{(plan.benefits || []).length - 3} {t('plans.moreOtherBenefits')}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-auto pt-3 d-flex gap-2">
                      <button onClick={() => setDetailPlan(plan)} style={{
                        padding: '0.5rem 0.85rem', borderRadius: 8,
                        border: `1.5px solid ${meta.color}`, background: 'transparent',
                        color: meta.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                        flex: user?.role === 'ADMIN' ? '1 1 auto' : '0 0 auto',
                      }}>
                        <i className="bi bi-eye me-1"></i>{t('plans.detailBtn')}
                      </button>
                      {user?.role !== 'ADMIN' && (
                        <button onClick={() => handleApply(plan)} className="btn-primary-custom flex-grow-1"
                          style={{ justifyContent: 'center', background: meta.color, borderColor: meta.color }}>
                          <i className="bi bi-check-circle me-2"></i>{t('plans.applyBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!user && (
          <div className="card-custom text-center mt-5 py-4">
            <i className="bi bi-person-lock" style={{ fontSize: '2rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}></i>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {t('plans.loginPrompt')}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              {t('plans.loginPromptSub')}
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <Link to="/register" className="btn-primary-custom">{t('plans.createAccountBtn')}</Link>
              <Link to="/login" className="btn-outline-custom">{t('plans.logInBtn')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Plan Detail Modal ──────────────────────────────────────────────────────────
function PlanDetailModal({ plan, onClose, onApply, user, t, freqLabel }) {
  const meta = getTypeMeta(plan.type)
  const tiers = Array.isArray(plan.durationTiers) && plan.durationTiers.length > 0 ? plan.durationTiers : []
  const [calcCoverage, setCalcCoverage] = useState('')
  const [calcDuration, setCalcDuration] = useState(tiers[0]?.years || '')
  const [activeTab, setActiveTab] = useState('overview')

  const selectedTier = tiers.find(tier => String(tier.years) === String(calcDuration)) || tiers[0]
  const calcResult = calcCoverage && selectedTier?.premiumRate
    ? calcPremium(calcCoverage, selectedTier.premiumRate, plan.paymentIntervalMonths || 1) : null

  const freq = freqLabel(plan.paymentFrequency)
  const thS = {
    padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 700, fontSize: '0.72rem',
    color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em',
    background: meta.color, borderBottom: 'none',
  }
  const tdS = { padding: '0.65rem 1rem', verticalAlign: 'middle', fontSize: '0.85rem', borderBottom: '1px solid var(--border)' }

  const TABS = [
    { id: 'overview',  label: t('plans.tabOverview'),  icon: 'bi-grid' },
    { id: 'tiers',     label: t('plans.tabTiers'),     icon: 'bi-calendar3' },
    { id: 'benefits',  label: t('plans.tabBenefits'),  icon: 'bi-check-circle' },
    { id: 'docs',      label: t('plans.tabDocs'),      icon: 'bi-file-earmark' },
    { id: 'rules',     label: t('plans.tabRules'),     icon: 'bi-file-text' },
  ]

  const quickStats = [
    { label: t('plans.coverageMinLabel'), value: `MMK ${fmt(plan.coverageMin)}`,  icon: 'bi-shield',            bg: '#eff6ff', border: '#bfdbfe', iconColor: '#1d4ed8', textColor: '#1e3a8a' },
    { label: t('plans.coverageMaxLabel'), value: `MMK ${fmt(plan.coverageMax)}`,  icon: 'bi-shield-fill-check', bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#16a34a', textColor: '#14532d' },
    { label: t('plans.maxClaimLabel'),    value: plan.maxClaimAmount ? `MMK ${fmt(plan.maxClaimAmount)}` : t('plans.onCoverage'), icon: 'bi-cash-stack', bg: '#fffbeb', border: '#fde68a', iconColor: '#d97706', textColor: '#92400e' },
    { label: t('plans.paymentModeLabel'), value: freq || '—',                     icon: 'bi-credit-card',       bg: '#faf5ff', border: '#e9d5ff', iconColor: '#7c3aed', textColor: '#4c1d95' },
  ]

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg-card)', borderRadius: 18, width: '100%', maxWidth: 860, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

        {/* Solid colour header */}
        <div style={{ background: meta.color, padding: '1.4rem 1.6rem 1.1rem', flexShrink: 0 }}>
          <div className="d-flex align-items-start gap-3">
            <div style={{ width: 54, height: 54, borderRadius: 14, background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`bi ${meta.icon}`} style={{ color: '#fff', fontSize: '1.55rem' }}></i>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{meta.label}</div>
              <div style={{ fontWeight: 800, color: '#fff', fontSize: '1.2rem', lineHeight: 1.2 }}>{plan.name}</div>
              {plan.description && (
                <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.84rem', marginTop: 5, marginBottom: 0, lineHeight: 1.5 }}>{plan.description}</p>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, cursor: 'pointer', color: '#fff', fontSize: '1rem', flexShrink: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Quick stats strip — white bar below the header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {quickStats.map((s, i) => (
            <div key={i} style={{
              padding: '0.85rem 1rem',
              background: s.bg,
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#fff', border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`bi ${s.icon}`} style={{ color: s.iconColor, fontSize: '0.78rem' }}></i>
                </div>
                <span style={{ fontSize: '0.62rem', color: s.iconColor, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{s.label}</span>
              </div>
              <div style={{ fontWeight: 700, color: s.textColor, fontSize: '0.85rem', lineHeight: 1.2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', flexShrink: 0, background: 'var(--bg-card)' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              padding: '0.8rem 1.15rem', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.82rem',
              color: activeTab === tab.id ? meta.color : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? `3px solid ${meta.color}` : '3px solid transparent',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s',
            }}>
              <i className={`bi ${tab.icon}`}></i>{tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ overflowY: 'auto', padding: '1.4rem 1.6rem', flex: 1, background: 'var(--bg-secondary)' }}>

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="d-flex flex-column gap-3">
              {plan.eligibility && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px rgba(29,78,216,0.07)' }}>
                  <div style={{ background: '#1d4ed8', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-person-check" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.eligibility')}</span>
                  </div>
                  <div style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{plan.eligibility}</div>
                </div>
              )}
              {plan.exclusions && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid #fecaca', boxShadow: '0 2px 8px rgba(220,38,38,0.07)' }}>
                  <div style={{ background: '#dc2626', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-x-circle" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.exclusions')}</span>
                  </div>
                  <div style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{plan.exclusions}</div>
                </div>
              )}
              {plan.beneficiaryInfo && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid #e9d5ff', boxShadow: '0 2px 8px rgba(124,58,237,0.07)' }}>
                  <div style={{ background: '#7c3aed', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-people" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.beneficiary')}</span>
                  </div>
                  <div style={{ padding: '0.9rem 1rem', fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>{plan.beneficiaryInfo}</div>
                </div>
              )}
              {!plan.eligibility && !plan.exclusions && !plan.beneficiaryInfo && (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <i className="bi bi-info-circle" style={{ fontSize: '2.2rem', display: 'block', marginBottom: 10, opacity: 0.5 }}></i>
                  {t('plans.overviewEmpty')}
                </div>
              )}
            </div>
          )}

          {/* TIERS TAB */}
          {activeTab === 'tiers' && (
            <div className="d-flex flex-column gap-4">
              {tiers.length > 0 ? (
                <>
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: meta.color, padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="bi bi-table" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.durationTiers')}</span>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={thS}>{t('plans.durationCol')}</th>
                            <th style={thS}>{t('plans.premiumRateCol')}</th>
                            <th style={thS}>{t('plans.annualSampleCol')}</th>
                            <th style={thS}>{freq || t('plans.payment')} {t('plans.perPaymentCol')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tiers.map((tier, i) => {
                            const sample = calcPremium(10000000, tier.premiumRate, plan.paymentIntervalMonths || 1)
                            return (
                              <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)' }}>
                                <td style={tdS}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, color: meta.color, background: meta.bg, padding: '0.25rem 0.7rem', borderRadius: 20, fontSize: '0.82rem', border: `1px solid ${meta.color}30` }}>
                                    <i className="bi bi-calendar2-check"></i>{tier.years} {t('plans.yearsUnit')}
                                  </span>
                                </td>
                                <td style={tdS}>
                                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.05rem' }}>{(tier.premiumRate * 100).toFixed(2)}%</span>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 2 }}>/year</span>
                                </td>
                                <td style={{ ...tdS, color: 'var(--text-secondary)' }}>{sample ? `MMK ${fmt(sample.annual)}` : '—'}</td>
                                <td style={tdS}>
                                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: '0.98rem' }}>{sample ? `MMK ${fmt(sample.perPayment)}` : '—'}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                        <i className="bi bi-info-circle me-1"></i>{t('plans.sampleNote')}
                      </p>
                    </div>
                  </div>

                  {/* Premium Calculator */}
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                    <div style={{ background: '#16a34a', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="bi bi-calculator" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.calcTitle2')}</span>
                    </div>
                    <div style={{ padding: '1.25rem' }}>
                      <div className="row g-3">
                        <div className="col-12 col-md-5">
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                            {t('plans.coverageAmountLabel')}
                          </label>
                          <input type="number" className="form-control-custom w-100"
                            placeholder={`${fmt(plan.coverageMin)} – ${fmt(plan.coverageMax)}`}
                            min={plan.coverageMin} max={plan.coverageMax}
                            value={calcCoverage} onChange={e => setCalcCoverage(e.target.value)} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                            {t('plans.selectDurationLabel')}
                          </label>
                          <select className="form-select-custom w-100" value={calcDuration} onChange={e => setCalcDuration(e.target.value)}>
                            {tiers.map(tier => (
                              <option key={tier.years} value={tier.years}>
                                {tier.years} {t('plans.yearsUnit')} — {(tier.premiumRate * 100).toFixed(2)}%/year
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-3">
                          {calcResult ? (
                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '0.75rem 1rem', border: '1.5px solid #bbf7d0' }}>
                              <div style={{ fontSize: '0.65rem', color: '#16a34a', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>
                                {freq || t('plans.payment')} {t('plans.payPer')}
                              </div>
                              <div style={{ fontWeight: 800, color: '#15803d', fontSize: '1.15rem', lineHeight: 1.2 }}>
                                MMK {fmt(calcResult.perPayment)}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: 4 }}>
                                {t('plans.annualTotal')}: MMK {fmt(calcResult.annual)}
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.75rem 1rem', border: '1.5px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4, minHeight: 72 }}>
                              <i className="bi bi-calculator" style={{ fontSize: '1.2rem' }}></i>
                              {t('plans.enterCoverage')}
                            </div>
                          )}
                        </div>
                      </div>
                      {calcResult && (
                        <div className="row g-2 mt-3">
                          {[
                            { l: t('plans.calcCoverageRow'), v: `MMK ${fmt(calcCoverage)}`, c: '#1d4ed8' },
                            { l: t('plans.calcDurationRow'), v: `${calcDuration} ${t('plans.yearsUnit')}`, c: meta.color },
                            { l: t('plans.calcRateRow'),     v: `${((selectedTier?.premiumRate || 0) * 100).toFixed(2)}%/year`, c: '#d97706' },
                            { l: t('plans.calcTotalRow'),    v: `MMK ${fmt(calcResult.annual * calcDuration)}`, c: '#16a34a' },
                          ].map((s, i) => (
                            <div key={i} className="col-6 col-md-3">
                              <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3 }}>{s.l}</div>
                                <div style={{ fontWeight: 700, color: s.c, fontSize: '0.85rem' }}>{s.v}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {t('plans.noTiers')}
                </div>
              )}
            </div>
          )}

          {/* BENEFITS TAB */}
          {activeTab === 'benefits' && (
            <div>
              {(plan.benefits || []).length > 0 ? (
                <div className="row g-3">
                  {(plan.benefits || []).map((b, i) => (
                    <div key={i} className="col-12 col-md-6">
                      <div style={{ display: 'flex', gap: 12, padding: '0.85rem 1rem', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid #bbf7d0', alignItems: 'flex-start', boxShadow: '0 1px 4px rgba(22,163,74,0.08)' }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <i className="bi bi-check-lg" style={{ color: '#16a34a', fontSize: '0.95rem', fontWeight: 900 }}></i>
                        </div>
                        <div style={{ fontSize: '0.87rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5 }}>{b}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {t('plans.benefitsEmpty')}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'docs' && (
            <div>
              {(plan.requiredDocuments || []).length > 0 ? (
                <div>
                  <div style={{ background: '#eff6ff', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', border: '1px solid #bfdbfe', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <i className="bi bi-info-circle-fill" style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }}></i>
                    <span style={{ fontSize: '0.84rem', color: '#1e40af', fontWeight: 500 }}>{t('plans.docsNote')}</span>
                  </div>
                  <div className="d-flex flex-column gap-2">
                    {(plan.requiredDocuments || []).map((d, i) => (
                      <div key={i} style={{ display: 'flex', gap: 14, padding: '0.85rem 1.1rem', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid #fde68a', alignItems: 'center', boxShadow: '0 1px 4px rgba(217,119,6,0.08)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontWeight: 800, color: '#d97706', fontSize: '0.82rem' }}>{i + 1}</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{d}</div>
                          <div style={{ fontSize: '0.72rem', color: '#b45309', marginTop: 2 }}>{t('plans.documentLabel')} #{i + 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {t('plans.docsEmpty')}
                </div>
              )}
            </div>
          )}

          {/* RULES & TERMS TAB */}
          {activeTab === 'rules' && (
            <div>
              {plan.termsAndConditions ? (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: 'var(--primary)', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <i className="bi bi-file-earmark-text" style={{ color: '#fff', fontSize: '0.9rem' }}></i>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('plans.termsTitle')}</span>
                  </div>
                  <div style={{ padding: '1.25rem 1.4rem', fontSize: '0.87rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', lineHeight: 2, letterSpacing: '0.01em' }}>
                    {plan.termsAndConditions}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '2.5rem', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  {t('plans.termsEmpty')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '1rem 1.6rem', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, justifyContent: 'flex-end', background: 'var(--bg-card)', flexShrink: 0 }}>
          <button onClick={onClose} className="btn-outline-custom" style={{ fontSize: '0.88rem' }}>
            {t('plans.closeBtn')}
          </button>
          <button onClick={onApply} className="btn-primary-custom"
            style={{ justifyContent: 'center', background: meta.color, borderColor: meta.color, minWidth: 150 }}>
            <i className="bi bi-check-circle me-2"></i>
            {user ? t('plans.applyBtn') : t('plans.loginToApply')}
          </button>
        </div>
      </div>
    </div>
  )
}
