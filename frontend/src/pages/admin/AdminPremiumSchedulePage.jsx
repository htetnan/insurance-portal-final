import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { downloadPdf } from '../../utils/pdfDownload'

const STATUS_COLORS = {
  OVERDUE:              { color: '#dc2626', bg: '#fee2e2', icon: 'bi-exclamation-triangle-fill' },
  DUE:                  { color: '#d97706', bg: '#fef3c7', icon: 'bi-clock-fill' },
  PENDING_VERIFICATION: { color: '#7c3aed', bg: '#ede9fe', icon: 'bi-hourglass-split' },
  UPCOMING:             { color: '#64748b', bg: '#f1f5f9', icon: 'bi-calendar-event' },
  PAID:                 { color: '#16a34a', bg: '#dcfce7', icon: 'bi-check-circle-fill' },
}

export default function AdminPremiumSchedulePage() {
  const { t } = useTranslation()

  // Derived from translations — defined inside component so t() is available
  const FREQ_LABEL = {
    MONTHLY:     t('admin.premiumSchedule.freqMonthly'),
    QUARTERLY:   t('admin.premiumSchedule.freqQuarterly'),
    HALF_YEARLY: t('admin.premiumSchedule.freqHalfYearly'),
    YEARLY:      t('admin.premiumSchedule.freqYearly'),
  }

  const STATUS_META = {
    OVERDUE:              { label: t('admin.premiumSchedule.statusOverdue'),            ...STATUS_COLORS.OVERDUE },
    DUE:                  { label: t('admin.premiumSchedule.statusDue'),                ...STATUS_COLORS.DUE },
    PENDING_VERIFICATION: { label: t('admin.premiumSchedule.statusPendingVerification'), ...STATUS_COLORS.PENDING_VERIFICATION },
    UPCOMING:             { label: t('admin.premiumSchedule.statusUpcoming'),           ...STATUS_COLORS.UPCOMING },
    PAID:                 { label: t('admin.premiumSchedule.statusPaid'),               ...STATUS_COLORS.PAID },
  }

  const TABS = [
    { key: 'ALL',                  label: t('admin.premiumSchedule.tabAll'),     icon: 'bi-list-ul'              },
    { key: 'OVERDUE',              label: t('admin.premiumSchedule.tabOverdue'), icon: 'bi-exclamation-triangle' },
    { key: 'DUE',                  label: t('admin.premiumSchedule.tabDue'),     icon: 'bi-clock'                },
    { key: 'PENDING_VERIFICATION', label: t('admin.premiumSchedule.tabPending'), icon: 'bi-hourglass-split'      },
    { key: 'PAID',                 label: t('admin.premiumSchedule.tabPaid'),    icon: 'bi-check-circle'         },
  ]

  const SUMMARY_CARDS = [
    { key: 'OVERDUE',              label: t('admin.premiumSchedule.statusOverdue'),            icon: 'bi-exclamation-triangle-fill', color: '#dc2626', bg: '#fee2e2' },
    { key: 'DUE',                  label: t('admin.premiumSchedule.statusDue'),                icon: 'bi-clock-fill',               color: '#d97706', bg: '#fef3c7' },
    { key: 'PENDING_VERIFICATION', label: t('admin.premiumSchedule.statusPendingVerification'), icon: 'bi-hourglass-split',          color: '#7c3aed', bg: '#ede9fe' },
    { key: 'PAID',                 label: t('admin.premiumSchedule.statusPaid'),               icon: 'bi-check-circle-fill',        color: '#16a34a', bg: '#dcfce7' },
  ]

  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [search, setSearch]       = useState('')
  const [expanded, setExpanded]   = useState({})
  const [loadingSchedule, setLoadingSchedule] = useState({})
  const [actionLoading, setActionLoading] = useState({})
  const [cancelConfirm, setCancelConfirm] = useState(null)

  const fetchData = () => {
    setLoading(true)
    api.get('/admin/premium-schedule')
      .then(res => setEntries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchData() }, [])

  const filtered = entries.filter(e => {
    const matchTab = activeTab === 'ALL' || e.scheduleStatus === activeTab
    const q = search.toLowerCase()
    const matchSearch = !q || [e.customerName, e.customerEmail, e.policyNumber, e.packageName]
      .some(f => f?.toLowerCase().includes(q))
    return matchTab && matchSearch
  })

  const counts = entries.reduce((acc, e) => {
    acc[e.scheduleStatus] = (acc[e.scheduleStatus] || 0) + 1
    return acc
  }, {})

  const sendOverdueWarning = async (appId) => {
    setActionLoading(prev => ({ ...prev, [appId]: 'warn' }))
    try {
      await api.post(`/admin/applications/${appId}/overdue-warning`)
      toast.success(t('admin.premiumSchedule.warningSent'))
    } catch {
      toast.error(t('admin.premiumSchedule.warningFailed'))
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }))
    }
  }

  const confirmCancelOverdue = async (appId) => {
    setActionLoading(prev => ({ ...prev, [appId]: 'cancel' }))
    setCancelConfirm(null)
    try {
      await api.post(`/admin/applications/${appId}/cancel-overdue`, {
        note: 'Premium payment overdue — policy cancelled due to non-payment'
      })
      toast.success(t('admin.premiumSchedule.cancelSuccess'))
      fetchData()
    } catch (err) {
      toast.error(err?.response?.data?.message || t('admin.premiumSchedule.cancelFailed'))
    } finally {
      setActionLoading(prev => ({ ...prev, [appId]: null }))
    }
  }

  const toggleSchedule = async (appId) => {
    if (expanded[appId]) {
      setExpanded(prev => { const n = { ...prev }; delete n[appId]; return n })
      return
    }
    setLoadingSchedule(prev => ({ ...prev, [appId]: true }))
    try {
      const res = await api.get(`/admin/applications/${appId}/schedule`)
      setExpanded(prev => ({ ...prev, [appId]: res.data }))
    } catch {
      toast.error(t('admin.premiumSchedule.cancelFailed'))
    } finally {
      setLoadingSchedule(prev => ({ ...prev, [appId]: false }))
    }
  }

  const downloadPolicy = async (appId, policyNumber) => {
    try {
      const res = await api.get(`/admin/applications/${appId}/policy-contract`)
      await downloadPdf(res.data, `policy_contract_${policyNumber || appId}.pdf`)
    } catch {
      toast.error(t('admin.premiumSchedule.pdfFailed'))
    }
  }

  // Summary stats
  const totalInstallments = entries.reduce((s, e) => s + (e.totalInstallments || 0), 0)
  const totalPaid         = entries.reduce((s, e) => s + (e.paidInstallments || 0), 0)
  const totalOverdue      = counts['OVERDUE'] || 0
  const totalDue          = counts['DUE'] || 0

  return (
    <div className="fade-in">

      {/* Cancel Confirm Modal */}
      {cancelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-custom" style={{ maxWidth: 420, width: '100%', padding: '1.5rem' }}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ color: '#dc2626', fontSize: '1.2rem' }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {t('admin.premiumSchedule.cancelConfirmModalTitle')}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {t('admin.premiumSchedule.cancelConfirmModalIrreversible')}
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              {t('admin.premiumSchedule.cancelConfirmModalBody')}
            </p>
            <div className="d-flex gap-2 justify-content-end">
              <button type="button" className="btn-outline-custom" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                onClick={() => setCancelConfirm(null)}>{t('admin.premiumSchedule.cancelConfirmNo')}</button>
              <button type="button"
                style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', fontWeight: 700, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => confirmCancelOverdue(cancelConfirm)}>
                <i className="bi bi-x-circle me-1"></i>{t('admin.premiumSchedule.cancelConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.premiumSchedule.title')}</h4>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
          {t('admin.premiumSchedule.subtitle')}
        </p>
      </div>

      {/* Summary cards */}
      {!loading && (
        <div className="row g-3 mb-4">
          {SUMMARY_CARDS.map(c => (
            <div key={c.key} className="col-6 col-md-3">
              <div className="card-custom" style={{ padding: '1rem', cursor: 'pointer', border: activeTab === c.key ? `2px solid ${c.color}` : '1px solid var(--border)' }}
                onClick={() => setActiveTab(c.key === activeTab ? 'ALL' : c.key)}>
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`bi ${c.icon}`} style={{ color: c.color, fontSize: '1.1rem' }}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: c.color, lineHeight: 1 }}>{counts[c.key] || 0}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{c.label}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {!loading && totalInstallments > 0 && (
        <div className="card-custom mb-4" style={{ padding: '0.85rem 1rem' }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              <i className="bi bi-graph-up me-1" style={{ color: '#16a34a' }}></i>
              {t('admin.premiumSchedule.overallProgress')}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#16a34a' }}>
              {totalPaid} / {totalInstallments} ({Math.round(totalPaid / totalInstallments * 100)}%)
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--bg-secondary)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(totalPaid / totalInstallments * 100)}%`, background: 'linear-gradient(90deg, #16a34a, #22c55e)', borderRadius: 99, transition: 'width 0.5s' }}></div>
          </div>
          <div className="d-flex gap-4 mt-2" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span><i className="bi bi-check-circle-fill me-1" style={{ color: '#16a34a' }}></i>{t('admin.premiumSchedule.paidLabel')}: {totalPaid}</span>
            <span><i className="bi bi-exclamation-triangle-fill me-1" style={{ color: '#dc2626' }}></i>{t('admin.premiumSchedule.overdueLabel')}: {totalOverdue}</span>
            <span><i className="bi bi-clock-fill me-1" style={{ color: '#d97706' }}></i>{t('admin.premiumSchedule.dueLabel')}: {totalDue}</span>
            <span><i className="bi bi-calendar me-1" style={{ color: '#64748b' }}></i>{t('admin.premiumSchedule.totalLabel')}: {totalInstallments}</span>
          </div>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3">
        <div className="d-flex gap-1 flex-wrap" style={{ background: 'var(--bg-secondary)', padding: '0.3rem', borderRadius: 12 }}>
          {TABS.map(tab => (
            <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '0.4rem 0.9rem', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.8rem', transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 5,
                background: activeTab === tab.key ? 'var(--bg-primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
              }}>
              <i className={`bi ${tab.icon}`}></i>
              <span className="d-none d-sm-inline">{tab.label}</span>
              {tab.key !== 'ALL' && counts[tab.key] > 0 && (
                <span style={{
                  background: STATUS_META[tab.key]?.bg, color: STATUS_META[tab.key]?.color,
                  borderRadius: 99, fontSize: '0.65rem', fontWeight: 800, padding: '0.05rem 0.4rem',
                }}>{counts[tab.key]}</span>
              )}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={t('admin.premiumSchedule.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="form-control-custom"
          style={{ maxWidth: 260, padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : filtered.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('admin.premiumSchedule.emptyTitle')}</h5>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {t('admin.premiumSchedule.emptyDesc')}
          </p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {filtered.map((e, i) => {
            const meta = STATUS_META[e.scheduleStatus] || STATUS_META.UPCOMING
            const isExpanded = !!expanded[e.applicationId]
            const isLoadingSched = !!loadingSchedule[e.applicationId]
            const schedule = expanded[e.applicationId]

            return (
              <div key={`${e.applicationId}-${i}`} className="card-custom p-0" style={{ overflow: 'hidden' }}>
                {/* Main row */}
                <div className="d-flex align-items-center flex-wrap gap-3" style={{ padding: '0.85rem 1rem' }}>
                  {/* Customer */}
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customerName}</div>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.customerEmail}</div>
                  </div>

                  {/* Policy */}
                  <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.packageName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{e.policyNumber}</div>
                  </div>

                  {/* Frequency */}
                  <div style={{ flex: '0 0 auto' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-secondary)', padding: '0.2rem 0.55rem', borderRadius: 99, color: 'var(--text-secondary)' }}>
                      {FREQ_LABEL[e.paymentFrequency] || e.paymentFrequency || '—'}
                    </span>
                  </div>

                  {/* Period */}
                  <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {e.periodLabel || `${t('admin.premiumSchedule.periodColumn')} ${e.currentPeriodNumber}`}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{t('admin.premiumSchedule.periodColumn')}</div>
                  </div>

                  {/* Amount */}
                  <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                      {e.installmentAmount != null ? Number(e.installmentAmount).toLocaleString() : '—'}
                      <span style={{ fontSize: '0.7rem', fontWeight: 500, marginLeft: 2 }}>MMK</span>
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {e.dueDate ? new Date(e.dueDate + 'T00:00:00').toLocaleDateString() : '—'}
                    </div>
                  </div>

                  {/* Paid progress */}
                  <div style={{ flex: '0 0 80px' }}>
                    <div className="d-flex align-items-center gap-1 mb-1">
                      <span style={{ fontWeight: 700, color: e.paidInstallments === e.totalInstallments ? '#16a34a' : 'var(--text-primary)', fontSize: '0.85rem' }}>
                        {e.paidInstallments}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>/ {e.totalInstallments}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 99, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: '#16a34a', width: `${e.totalInstallments > 0 ? (e.paidInstallments / e.totalInstallments) * 100 : 0}%` }}></div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={{ flex: '0 0 auto' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                      borderRadius: 99, background: meta.bg, color: meta.color,
                    }}>
                      <i className={`bi ${meta.icon}`}></i>{meta.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-1 flex-wrap" style={{ flex: '0 0 auto' }}>
                    <button
                      className="btn-outline-custom"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => toggleSchedule(e.applicationId)}
                      disabled={isLoadingSched}>
                      {isLoadingSched
                        ? <span className="spinner-border spinner-border-sm"></span>
                        : <><i className={`bi bi-${isExpanded ? 'chevron-up' : 'calendar3'} me-1`}></i>{isExpanded ? t('admin.premiumSchedule.hideScheduleBtn') : t('admin.premiumSchedule.viewScheduleBtn')}</>}
                    </button>
                    <button
                      className="btn-outline-custom"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      title={t('admin.premiumSchedule.pdfBtnTitle')}
                      onClick={() => downloadPolicy(e.applicationId, e.policyNumber)}>
                      <i className="bi bi-file-earmark-pdf me-1" style={{ color: '#dc2626' }}></i>PDF
                    </button>
                    {e.scheduleStatus === 'OVERDUE' && (
                      <>
                        <button
                          type="button"
                          title={t('admin.premiumSchedule.warnBtnTitle')}
                          disabled={actionLoading[e.applicationId] === 'warn'}
                          onClick={() => sendOverdueWarning(e.applicationId)}
                          style={{
                            padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                            background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a',
                            borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          {actionLoading[e.applicationId] === 'warn'
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <><i className="bi bi-envelope-exclamation-fill"></i><span className="d-none d-md-inline"> {t('admin.premiumSchedule.warnBtnLabel')}</span></>}
                        </button>
                        <button
                          type="button"
                          title={t('admin.premiumSchedule.cancelBtnTitle')}
                          disabled={actionLoading[e.applicationId] === 'cancel'}
                          onClick={() => setCancelConfirm(e.applicationId)}
                          style={{
                            padding: '0.3rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca',
                            borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                          {actionLoading[e.applicationId] === 'cancel'
                            ? <span className="spinner-border spinner-border-sm"></span>
                            : <><i className="bi bi-x-circle-fill"></i><span className="d-none d-md-inline"> {t('admin.premiumSchedule.cancelBtnLabel')}</span></>}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Expanded: full installment schedule */}
                {isExpanded && schedule && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                    {/* Schedule header */}
                    <div style={{ padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <i className="bi bi-calendar-check me-1" style={{ color: 'var(--primary)' }}></i>
                        {t('admin.premiumSchedule.scheduleFullTitle')} — {schedule.packageName}
                      </div>
                      <div className="d-flex gap-3" style={{ fontSize: '0.75rem' }}>
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>
                          <i className="bi bi-check-circle-fill me-1"></i>{t('admin.premiumSchedule.paidCount')}: {schedule.paidCount}/{schedule.totalInstallments}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {t('admin.premiumSchedule.perInstallment')}: {schedule.installmentAmount != null ? Number(schedule.installmentAmount).toLocaleString() : '—'} MMK
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {FREQ_LABEL[schedule.paymentFrequency] || schedule.paymentFrequency || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Installment grid */}
                    <div style={{ padding: '0 1rem 1rem', overflowX: 'auto' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, minWidth: 400 }}>
                        {(schedule.schedule || []).map(inst => {
                          const im = STATUS_META[inst.status] || STATUS_META.UPCOMING
                          return (
                            <div key={inst.periodNumber} style={{
                              background: 'var(--bg-primary)',
                              border: `1px solid ${im.color}40`,
                              borderLeft: `3px solid ${im.color}`,
                              borderRadius: 8,
                              padding: '0.6rem 0.75rem',
                            }}>
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                  #{inst.periodNumber}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 800, padding: '0.1rem 0.4rem',
                                  borderRadius: 99, background: im.bg, color: im.color,
                                }}>
                                  <i className={`bi ${im.icon} me-1`}></i>{im.label}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                                {inst.periodLabel || `${t('admin.premiumSchedule.periodColumn')} ${inst.periodNumber}`}
                              </div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: inst.status === 'PAID' ? '#16a34a' : 'var(--primary)' }}>
                                {inst.amount != null ? Number(inst.amount).toLocaleString() : '—'} MMK
                              </div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {inst.dueDate ? new Date(inst.dueDate + 'T00:00:00').toLocaleDateString() : '—'}
                              </div>
                              {inst.paymentId && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                  {t('admin.premiumSchedule.paymentId')} #{inst.paymentId}
                                  {inst.paymentStatus && <span style={{ marginLeft: 4, fontWeight: 700 }}>({inst.paymentStatus})</span>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Legend */}
                      <div className="d-flex gap-3 flex-wrap mt-3" style={{ fontSize: '0.72rem' }}>
                        {Object.entries(STATUS_META).map(([k, v]) => (
                          <div key={k} className="d-flex align-items-center gap-1">
                            <div style={{ width: 10, height: 10, borderRadius: 2, background: v.bg, border: `1px solid ${v.color}` }}></div>
                            <span style={{ color: v.color, fontWeight: 700 }}>{v.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
