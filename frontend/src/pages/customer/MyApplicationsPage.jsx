import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import FormDetailModal from '../../components/FormDetailModal'
import RevisionFormModal from '../../components/RevisionFormModal'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'

export default function MyApplicationsPage() {
  const { t } = useTranslation()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewItem, setViewItem] = useState(null)
  const [reviseItem, setReviseItem] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, action: null, loading: false })

  const fetchApps = () => {
    api.get('/customer/applications')
      .then(res => setApps(Array.isArray(res.data) ? res.data : []))
      .catch(() => setApps([]))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetchApps() }, [])

  const handleCancel = id => {
    setDeleteModal({ open: true, id, action: 'cancel', loading: false })
  }

  const handleDelete = id => {
    setDeleteModal({ open: true, id, action: 'delete', loading: false })
  }

  const confirmDeleteAction = async () => {
    setDeleteModal(m => ({ ...m, loading: true }))
    try {
      if (deleteModal.action === 'cancel') {
        await api.delete(`/customer/applications/${deleteModal.id}`)
        toast.success(t('myApps.cancelled'))
      } else {
        await api.delete(`/customer/applications/${deleteModal.id}/permanent`)
        toast.success(t('myApps.deletedSuccess'))
      }
      setDeleteModal({ open: false, id: null, action: null, loading: false })
      fetchApps()
    } catch (err) {
      toast.error(err.response?.data?.message || (deleteModal.action === 'cancel' ? t('myApps.cancelFailed') : t('myApps.deleteFailed')))
      setDeleteModal(m => ({ ...m, loading: false }))
    }
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('myApps.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>{t('myApps.subtitle')}</p>
        </div>
        <Link to="/customer/apply" className="btn-primary-custom" style={{ fontSize: '0.88rem', padding: '0.45rem 1rem' }}>
          <i className="bi bi-plus-circle me-1"></i>{t('myApps.newApp')}
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
      ) : apps.length === 0 ? (
        <div className="card-custom text-center py-5">
          <i className="bi bi-file-earmark-text" style={{ fontSize: '3rem', color: 'var(--border)' }}></i>
          <h5 style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{t('myApps.noApps')}</h5>
          <Link to="/customer/apply" className="btn-primary-custom mt-3" style={{ display: 'inline-flex' }}>{t('dash.applyNow')}</Link>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {apps.map(app => {
            const isRevision = app.status === 'REVISION_REQUESTED'
            return (
              <div key={app.id} className="card-custom">
                {/* Revision alert banner */}
                {isRevision && (
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '0.75rem',
                    background: '#fefce8', border: '1px solid #fcd34d'
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '0.3rem' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1"></i>{t('myApps.revisionAlert')}
                    </div>
                    {app.adminNote && (
                      <div style={{ fontSize: '0.82rem', color: '#78350f', marginBottom: app.agentNote ? '0.2rem' : 0 }}>
                        <span style={{ fontWeight: 700 }}>Admin: </span>{app.adminNote}
                      </div>
                    )}
                    {app.agentNote && (
                      <div style={{ fontSize: '0.82rem', color: '#78350f' }}>
                        <span style={{ fontWeight: 700 }}>Agent: </span>{app.agentNote}
                      </div>
                    )}
                  </div>
                )}

                <div className="row align-items-center g-2">
                  <div className="col-12 col-md-7">
                    <div className="d-flex align-items-center gap-3 mb-1">
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {app.packageName || app.package?.name}
                        </div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          #{app.id} · {app.packageType} · Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'}
                        </small>
                      </div>
                      <span className={`badge-status badge-${app.status?.toLowerCase()}`}>{app.status}</span>
                    </div>
                    <div className="d-flex gap-3 flex-wrap" style={{ fontSize: '0.83rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{t('myApps.coverageLabel')}: <strong style={{ color: 'var(--text-primary)' }}>{Number(app.coverageAmount).toLocaleString()} MMK</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>{t('myApps.durationLabel')}: <strong style={{ color: 'var(--text-primary)' }}>{app.duration} {t('myApps.year')}</strong></span>
                      {app.premiumAmount && <span style={{ color: 'var(--text-muted)' }}>{t('myApps.premiumLabel')}: <strong style={{ color: 'var(--primary)' }}>{Number(app.premiumAmount).toLocaleString()} MMK</strong></span>}
                      {app.riskLevel && <span style={{ color: 'var(--text-muted)' }}>{t('myApps.riskLabel')}: <strong style={{ color: app.riskLevel === 'HIGH' ? '#dc2626' : app.riskLevel === 'MEDIUM' ? '#d97706' : '#16a34a' }}>{app.riskLevel}</strong></span>}
                      {app.agentName && <span style={{ color: 'var(--text-muted)' }}><i className="bi bi-person-badge me-1" style={{ color: '#1d4ed8' }}></i>{t('myApps.agentLabel')}: <strong style={{ color: '#1d4ed8' }}>{app.agentName}</strong></span>}
                    </div>
                    {!isRevision && app.adminNote && <p style={{ color: '#16a34a', fontSize: '0.82rem', margin: '0.4rem 0 0' }}><i className="bi bi-check-circle me-1"></i>{app.adminNote}</p>}
                    {!isRevision && app.agentNote && <p style={{ color: '#1d4ed8', fontSize: '0.82rem', margin: '0.25rem 0 0' }}><i className="bi bi-person me-1"></i>Agent: {app.agentNote}</p>}
                  </div>
                  <div className="col-12 col-md-5">
                    <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                      <button onClick={() => setViewItem(app)} style={{
                        padding: '0.4rem 0.9rem', borderRadius: 8, border: '1.5px solid var(--primary)',
                        background: 'transparent', color: 'var(--primary)', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        <i className="bi bi-eye"></i> {t('myApps.viewBtn')}
                      </button>
                      {(app.status === 'PENDING' || app.status === 'REVISION_REQUESTED' || app.status === 'REJECTED') && (
                        <button onClick={() => setReviseItem(app)} style={{
                          padding: '0.4rem 0.9rem', borderRadius: 8, border: '1.5px solid #d97706',
                          background: 'transparent', color: '#d97706', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <i className="bi bi-pencil"></i> {t('myApps.editBtn')}
                        </button>
                      )}
                      {app.status === 'PENDING' && (
                        <button onClick={() => handleCancel(app.id)} style={{
                          padding: '0.4rem 0.9rem', borderRadius: 8, border: '1.5px solid #dc2626',
                          background: 'transparent', color: '#dc2626', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <i className="bi bi-x-circle"></i> {t('myApps.cancelBtn')}
                        </button>
                      )}
                      {app.status === 'CANCELLED' && (
                        <button onClick={() => handleDelete(app.id)} style={{
                          padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                          background: '#dc2626', color: '#fff', cursor: 'pointer',
                          fontWeight: 600, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 4
                        }}>
                          <i className="bi bi-trash"></i> {t('myApps.deleteBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <FormDetailModal
        show={!!viewItem} onClose={() => setViewItem(null)}
        type="application" item={viewItem} role="customer" />

      <RevisionFormModal
        show={!!reviseItem} onClose={() => setReviseItem(null)}
        type="application" item={reviseItem}
        onRevised={fetchApps} />

      <DeleteConfirmModal
        open={deleteModal.open}
        title={deleteModal.action === 'cancel' ? 'Application ကို ပယ်ဖျက်မည်လား?' : 'Application ကို ဖျက်မည်လား?'}
        message={deleteModal.action === 'cancel'
          ? 'ဤ Application ကို ပယ်ဖျက်မည်။ Agent မှ ဆောင်ရွက်မည့် Application ရပ်တန့်သွားမည်။'
          : 'ဤ Application ကို အပြီးအပိုင် ဖျက်မည်။ ဤလုပ်ဆောင်ချက်ကို ပြန်မလုပ်နိုင်ပါ။'}
        onConfirm={confirmDeleteAction}
        onCancel={() => setDeleteModal({ open: false, id: null, action: null, loading: false })}
        loading={deleteModal.loading}
        confirmLabel={deleteModal.action === 'cancel' ? 'ပယ်ဖျက်မည်' : 'Delete'}
      />
    </div>
  )
}
