import { useEffect, useState } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'

/**
 * Modal for customer to edit and resubmit a REVISION_REQUESTED application or claim.
 * Pre-populates form fields with the currently submitted values.
 * On submit → PUT /customer/applications/{id}/revise (or /claims/{id}/revise)
 */
export default function RevisionFormModal({ show, onClose, type, item, onRevised }) {
  const [template, setTemplate] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [fieldValues, setFieldValues] = useState({})
  const [fieldFiles, setFieldFiles] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Load template and pre-populate from item.formData
  useEffect(() => {
    if (!show || !item) return
    const pkgId = item.packageId
    if (!pkgId) { setTemplate(null); return }
    const formType = type === 'application' ? 'APPLICATION' : 'CLAIM'
    setTemplateLoading(true)
    api.get(`/forms/public?packageId=${pkgId}&formType=${formType}`)
      .then(res => {
        setTemplate(res.data)
        // Pre-populate values from existing formData
        let existing = {}
        try { if (item.formData) existing = JSON.parse(item.formData) } catch {}
        const initialValues = {}
        if (res.data?.fields) {
          res.data.fields.forEach(field => {
            const val = existing[String(field.id)]
            if (val !== undefined && val !== null) {
              // For checkbox fields, parse JSON array if needed
              if (field.fieldType === 'CHECKBOX') {
                if (Array.isArray(val)) initialValues[String(field.id)] = val
                else { try { const p = JSON.parse(val); initialValues[String(field.id)] = Array.isArray(p) ? p : []; } catch { initialValues[String(field.id)] = [] } }
              } else if (field.fieldType !== 'IMAGE_UPLOAD' && field.fieldType !== 'PDF_UPLOAD') {
                initialValues[String(field.id)] = val
              }
              // File fields: keep existing path as-is (shown as "existing file")
            }
          })
        }
        setFieldValues(initialValues)
        setFieldFiles({})
      })
      .catch(() => setTemplate(null))
      .finally(() => setTemplateLoading(false))
  }, [show, item?.id, type])

  if (!show || !item) return null

  // Parse existing formData for file field display
  let existingFormData = {}
  try { if (item.formData) existingFormData = JSON.parse(item.formData) } catch {}

  const handleFieldValue = (fieldId, value) => setFieldValues(v => ({ ...v, [String(fieldId)]: value }))
  const handleFieldFile = (fieldId, file) => setFieldFiles(v => ({ ...v, [String(fieldId)]: file }))
  const handleCheckboxOption = (fieldId, option, checked) => {
    setFieldValues(prev => {
      const current = Array.isArray(prev[String(fieldId)]) ? prev[String(fieldId)] : []
      const next = checked ? [...current, option] : current.filter(o => o !== option)
      return { ...prev, [String(fieldId)]: next }
    })
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (template?.fields) {
      for (const field of template.fields) {
        if (field.fieldType === 'LABEL' || !field.required) continue
        const val = fieldValues[String(field.id)]
        const file = fieldFiles[String(field.id)]
        const existingFile = existingFormData[String(field.id)]
        if ((field.fieldType === 'IMAGE_UPLOAD' || field.fieldType === 'PDF_UPLOAD') && !file && !existingFile) {
          toast.error(`"${field.fieldLabel}" is required`); return
        }
        if (field.fieldType !== 'IMAGE_UPLOAD' && field.fieldType !== 'PDF_UPLOAD') {
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            toast.error(`"${field.fieldLabel}" is required`); return
          }
        }
      }
    }

    setSubmitting(true)
    try {
      const formDataObj = {}
      Object.entries(fieldValues).forEach(([k, v]) => {
        formDataObj[k] = Array.isArray(v) ? JSON.stringify(v) : v
      })

      const fd = new FormData()
      fd.append('formData', JSON.stringify(formDataObj))
      Object.entries(fieldFiles).forEach(([fieldId, file]) => {
        if (file) fd.append(`file_${fieldId}`, file)
      })

      const endpoint = type === 'application'
        ? `/customer/applications/${item.id}/revise`
        : `/customer/claims/${item.id}/revise`

      await api.put(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Resubmitted successfully! Your application is under review again.')
      onRevised()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resubmit')
    } finally {
      setSubmitting(false)
    }
  }

  const typeColor = type === 'application' ? '#1d4ed8' : '#d97706'
  const typeColorDark = type === 'application' ? '#1e3a8a' : '#92400e'
  const typeLabel = type === 'application' ? 'Application' : 'Claim'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1070,
      background: 'linear-gradient(135deg, rgba(15,23,42,0.78), rgba(30,64,175,0.48))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg-card, #ffffff)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        width: '100%', maxWidth: 680, maxHeight: '92vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(15,23,42,0.38)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          background: `linear-gradient(135deg, ${typeColorDark} 0%, ${typeColor} 58%, ${type === 'application' ? '#60a5fa' : '#f59e0b'} 100%)`
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', display: 'inline-block', boxShadow: '0 0 0 4px rgba(255,255,255,0.2)' }}></span>
              <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                Edit & Resubmit {typeLabel}
              </span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.78)' }}>#{item.id}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.84)', marginTop: 2 }}>
              Update the required fields and resubmit for review
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.38)',
            color: '#fff', cursor: 'pointer', fontSize: '1.3rem', lineHeight: 1, padding: 0
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{
          overflowY: 'auto', padding: '1.5rem', flex: 1,
          background: 'linear-gradient(180deg, var(--bg-card, #ffffff) 0%, var(--bg, #f5f8ff) 100%)'
        }}>
          {/* Notes from admin/agent */}
          {(item.adminNote || item.agentNote) && (
            <div style={{
              padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.25rem',
              background: '#fefce8', border: '1px solid #fcd34d'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#92400e', marginBottom: '0.35rem' }}>
                <i className="bi bi-exclamation-triangle me-1"></i>Revision Notes
              </div>
              {item.adminNote && (
                <div style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: item.agentNote ? '0.3rem' : 0 }}>
                  <span style={{ fontWeight: 700 }}>Admin: </span>{item.adminNote}
                </div>
              )}
              {item.agentNote && (
                <div style={{ fontSize: '0.85rem', color: '#78350f' }}>
                  <span style={{ fontWeight: 700 }}>Agent: </span>{item.agentNote}
                </div>
              )}
            </div>
          )}

          {templateLoading ? (
            <div className="text-center py-4">
              <span className="spinner-border" style={{ color: typeColor }}></span>
            </div>
          ) : !template ? (
            <div style={{
              padding: '1rem', borderRadius: 10, background: 'var(--bg-secondary)',
              border: '1px dashed var(--border)', textAlign: 'center',
              color: 'var(--text-muted)', fontSize: '0.85rem'
            }}>
              <i className="bi bi-info-circle me-2"></i>
              No form template found. Contact your agent for assistance.
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                {template.name}
              </div>
              <div className="d-flex flex-column gap-3">
                {template.fields?.map(field => (
                  <RevisionField
                    key={field.id}
                    field={field}
                    value={fieldValues[String(field.id)]}
                    file={fieldFiles[String(field.id)]}
                    existingFilePath={existingFormData[String(field.id)]}
                    onValue={v => handleFieldValue(field.id, v)}
                    onFile={f => handleFieldFile(field.id, f)}
                    onCheckboxOption={(opt, checked) => handleCheckboxOption(field.id, opt, checked)}
                    role="customer"
                    type={type}
                    itemId={item.id}
                    fieldId={field.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 8, flexShrink: 0,
          background: 'var(--bg-card, #ffffff)'
        }}>
          <button onClick={handleSubmit} disabled={submitting || templateLoading || !template}
            className="btn-primary-custom flex-grow-1" style={{ justifyContent: 'center' }}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Resubmitting...</>
              : <><i className="bi bi-send me-2"></i>Resubmit for Review</>}
          </button>
          <button onClick={onClose} disabled={submitting} className="btn-outline-custom" style={{ justifyContent: 'center' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function RevisionField({ field, value, file, existingFilePath, onValue, onFile, onCheckboxOption, role, type, itemId, fieldId }) {
  const [viewingExisting, setViewingExisting] = useState(false)

  if (field.fieldType === 'LABEL') {
    return (
      <div style={{
        padding: '0.6rem 0.9rem', borderRadius: 8,
        background: 'var(--bg-secondary)', borderLeft: '3px solid var(--primary)',
        fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem'
      }}>
        {field.fieldLabel}
      </div>
    )
  }

  let options = []
  if (field.fieldType === 'CHECKBOX' && field.fieldOptions) {
    try { options = JSON.parse(field.fieldOptions) } catch { options = ['Yes', 'No'] }
  }
  const selectedOptions = Array.isArray(value) ? value : []
  const isFileField = field.fieldType === 'IMAGE_UPLOAD' || field.fieldType === 'PDF_UPLOAD'
  const hasExistingFile = isFileField && existingFilePath && typeof existingFilePath === 'string' && !existingFilePath.startsWith('{')

  const handleViewExisting = async () => {
    setViewingExisting(true)
    try {
      const endpoint = `/${role}/${type === 'application' ? 'applications' : 'claims'}/${itemId}/form-file/${fieldId}`
      const res = await api.get(endpoint, { responseType: 'blob' })
      const url = window.URL.createObjectURL(res.data)
      window.open(url, '_blank')
    } catch { toast.error('Could not load existing file') }
    finally { setViewingExisting(false) }
  }

  return (
    <div>
      <label className="form-label-custom">
        {field.fieldLabel}{field.required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>

      {field.fieldType === 'TEXT' && (
        <input className="form-control-custom w-100" value={value || ''}
          onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'TEXTAREA' && (
        <textarea rows={3} className="form-control-custom w-100" style={{ resize: 'vertical' }}
          value={value || ''} onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'CHECKBOX' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 4 }}>
          {options.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.88rem',
              color: 'var(--text-primary)',
              border: selectedOptions.includes(opt) ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: selectedOptions.includes(opt) ? 'var(--bg-secondary)' : 'transparent',
            }}>
              <input type="checkbox"
                checked={selectedOptions.includes(opt)}
                onChange={e => onCheckboxOption(opt, e.target.checked)} />
              {opt}
            </label>
          ))}
        </div>
      )}
      {isFileField && (
        <div>
          {hasExistingFile && !file && (
            <div style={{
              padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: '0.4rem',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem'
            }}>
              <i className="bi bi-check-circle-fill" style={{ color: '#16a34a' }}></i>
              <span style={{ color: '#15803d', flex: 1 }}>Existing file on record</span>
              <button onClick={handleViewExisting} disabled={viewingExisting} style={{
                background: 'none', border: '1px solid #16a34a', color: '#16a34a',
                borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600
              }}>
                {viewingExisting ? 'Loading...' : 'View'}
              </button>
            </div>
          )}
          <input type="file"
            accept={field.fieldType === 'IMAGE_UPLOAD' ? '.jpg,.jpeg,.png,.webp' : '.pdf,.jpg,.jpeg,.png'}
            className="form-control-custom w-100"
            onChange={e => onFile(e.target.files[0] || null)} />
          {file
            ? <small style={{ color: '#16a34a', fontSize: '0.78rem', marginTop: 2, display: 'block' }}>✓ New file selected: {file.name}</small>
            : hasExistingFile && <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2, display: 'block' }}>Leave empty to keep existing file</small>
          }
        </div>
      )}
    </div>
  )
}
