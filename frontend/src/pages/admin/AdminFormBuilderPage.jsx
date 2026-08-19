import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { getTypeMeta } from '../../utils/typeMeta'
import DeleteConfirmModal from '../../components/DeleteConfirmModal'

const FIELD_TYPE_VALUES = [
  'LABEL', 'NAME', 'EMAIL', 'PHONE', 'TEXT',
  'TEXTAREA', 'DATE', 'NRC', 'CHECKBOX', 'IMAGE_UPLOAD', 'PDF_UPLOAD',
]

const FIELD_ICONS = {
  LABEL:        'bi-type-h2',
  NAME:         'bi-person-fill',
  EMAIL:        'bi-envelope-fill',
  PHONE:        'bi-telephone-fill',
  TEXT:         'bi-input-cursor-text',
  TEXTAREA:     'bi-textarea-t',
  DATE:         'bi-calendar-date',
  NRC:          'bi-person-vcard',
  CHECKBOX:     'bi-check2-square',
  IMAGE_UPLOAD: 'bi-image',
  PDF_UPLOAD:   'bi-file-earmark-pdf',
}

const getFieldTypes = (t) => FIELD_TYPE_VALUES.map(v => ({
  value: v,
  label: t(`admin.formBuilder.fieldType_${v}_label`),
  icon:  FIELD_ICONS[v],
  desc:  t(`admin.formBuilder.fieldType_${v}_desc`),
}))

const getSystemFields = (t) => [
  { icon: 'bi-person-fill',    label: t('admin.formBuilder.sysField_name_label'),  note: t('admin.formBuilder.sysField_name_note') },
  { icon: 'bi-envelope-fill',  label: t('admin.formBuilder.sysField_email_label'), note: t('admin.formBuilder.sysField_email_note') },
  { icon: 'bi-calendar-heart', label: t('admin.formBuilder.sysField_dob_label'),   note: t('admin.formBuilder.sysField_dob_note') },
  { icon: 'bi-person-vcard',   label: t('admin.formBuilder.sysField_nrc_label'),   note: t('admin.formBuilder.sysField_nrc_note') },
]

const FORM_TYPES = ['APPLICATION', 'CLAIM']

const emptyField = () => ({ fieldLabel: '', fieldType: 'TEXT', required: false, fieldOptions: '["Yes","No"]' })
const emptyForm  = (pkgId, formType) => ({
  name: '', formType: formType || 'APPLICATION', description: '', active: true, fields: [emptyField()],
})

export default function AdminFormBuilderPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const [packages, setPackages] = useState([])
  const [pkgLoading, setPkgLoading] = useState(true)
  const [selectedPkg, setSelectedPkg] = useState(null)
  const [forms, setForms] = useState([])
  const [formsLoading, setFormsLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editFormType, setEditFormType] = useState('APPLICATION')
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)

  const formTypeMeta = {
    APPLICATION: { bg: '#dbeafe', color: '#1d4ed8', label: t('admin.formBuilder.applicationForm') },
    CLAIM:       { bg: '#fef3c7', color: '#d97706', label: t('admin.formBuilder.claimForm') },
  }

  useEffect(() => {
    api.get('/admin/packages')
      .then(res => {
        const pkgs = Array.isArray(res.data) ? res.data : []
        setPackages(pkgs)
        const wantedId = location.state?.packageId
        if (wantedId) {
          const wanted = pkgs.find(p => p.id === wantedId)
          if (wanted) loadForms(wanted)
        }
      })
      .catch(() => toast.error(t('admin.formBuilder.loadFailed')))
      .finally(() => setPkgLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadForms = (pkg) => {
    setSelectedPkg(pkg)
    setEditing(null)
    setFormsLoading(true)
    api.get(`/admin/packages/${pkg.id}/forms`)
      .then(res => setForms(Array.isArray(res.data) ? res.data : []))
      .catch(() => { toast.error(t('admin.formBuilder.loadFormsFailed')); setForms([]) })
      .finally(() => setFormsLoading(false))
  }

  const openNew = (formType) => {
    setEditFormType(formType)
    setEditing(`new-${formType}`)
    setForm(emptyForm(selectedPkg?.id, formType))
  }

  const openEdit = (tmpl) => {
    setEditFormType(tmpl.formType)
    setEditing(tmpl.id)
    setForm({ ...tmpl, fields: (tmpl.fields || []).map(f => ({ ...f })) })
  }

  const closePanel = () => { setEditing(null); setForm(null) }

  const addField    = () => setForm(f => ({ ...f, fields: [...f.fields, emptyField()] }))
  const removeField = i  => setForm(f => ({ ...f, fields: f.fields.filter((_, idx) => idx !== i) }))
  const updateField = (i, key, val) => setForm(f => {
    const fields = [...f.fields]; fields[i] = { ...fields[i], [key]: val }; return { ...f, fields }
  })
  const moveField = (i, dir) => setForm(f => {
    const fields = [...f.fields], j = i + dir
    if (j < 0 || j >= fields.length) return f
    ;[fields[i], fields[j]] = [fields[j], fields[i]]
    return { ...f, fields }
  })

  const handleSave = async e => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error(t('admin.formBuilder.templateRequired')); return }
    if (form.fields.some(f => !f.fieldLabel.trim())) { toast.error(t('admin.formBuilder.fieldLabelRequired')); return }
    setSaving(true)
    const payload = {
      ...form,
      formType: editFormType,
      fields: form.fields.map((f, i) => ({ ...f, sortOrder: i }))
    }
    try {
      if (typeof editing === 'string' && editing.startsWith('new-')) {
        await api.post(`/admin/packages/${selectedPkg.id}/forms`, payload)
        toast.success(t('admin.formBuilder.formCreated'))
      } else {
        await api.put(`/admin/forms/${editing}`, payload)
        toast.success(t('admin.formBuilder.formUpdated'))
      }
      loadForms(selectedPkg)
      closePanel()
    } catch (err) { toast.error(err.response?.data?.message || t('admin.formBuilder.saveFailed')) }
    finally { setSaving(false) }
  }

  const [deleteModal, setDeleteModal] = useState({ open: false, loading: false })

  const handleDelete = () => {
    setDeleteModal({ open: true, loading: false })
  }

  const confirmDelete = async () => {
    setDeleteModal(m => ({ ...m, loading: true }))
    try {
      await api.delete(`/admin/forms/${editing}`)
      toast.success(t('admin.formBuilder.formDeleted'))
      setDeleteModal({ open: false, loading: false })
      loadForms(selectedPkg)
      closePanel()
    } catch {
      toast.error(t('admin.formBuilder.deleteFailed'))
      setDeleteModal(m => ({ ...m, loading: false }))
    }
  }

  return (
    <div className="fade-in">
      <div className="d-flex align-items-center justify-content-between mb-4" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{t('admin.formBuilder.title')}</h4>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
            {t('admin.formBuilder.pageSubtitle')}
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* ── Package list ── */}
        <div className={editing ? 'col-12 col-lg-4' : 'col-12 col-lg-5'}>
          <div className="card-custom p-0">
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{t('admin.formBuilder.plansHeader')}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>{packages.length} {t('admin.formBuilder.plansCount')}</span>
            </div>
            {pkgLoading ? (
              <div className="text-center py-4"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
            ) : packages.length === 0 ? (
              <div className="text-center py-4" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {t('admin.formBuilder.noPackagesCreate')}
              </div>
            ) : (
              packages.map(pkg => {
                const meta = getTypeMeta(pkg.type)
                const isSelected = selectedPkg?.id === pkg.id
                return (
                  <div key={pkg.id} onClick={() => loadForms(pkg)} style={{
                    padding: '0.85rem 1.25rem', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? `${meta.color}10` : 'transparent',
                    borderLeft: isSelected ? `3px solid ${meta.color}` : '3px solid transparent',
                    transition: 'all 0.1s',
                  }}>
                    <div className="d-flex align-items-center gap-3">
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <i className={`bi ${meta.icon}`} style={{ color: meta.color, fontSize: '1rem' }}></i>
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pkg.name}</div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{pkg.type}</span>
                      </div>
                      <span style={{ padding: '0.15rem 0.45rem', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, flexShrink: 0,
                        background: pkg.active ? '#dcfce7' : '#fee2e2', color: pkg.active ? '#16a34a' : '#dc2626' }}>
                        {pkg.active ? t('admin.formBuilder.active') : t('admin.formBuilder.pkgOffStatus')}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Form management for selected package ── */}
        {!editing && selectedPkg && (
          <div className="col-12 col-lg-7">
            <div className="card-custom">
              <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
                {t('admin.formBuilder.formsForLabel')}: <span style={{ color: 'var(--primary)' }}>{selectedPkg.name}</span>
              </h6>
              {formsLoading ? (
                <div className="text-center py-4"><div className="spinner-border" style={{ color: 'var(--primary)' }}></div></div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {FORM_TYPES.map(ft => {
                    const existingForm = forms.find(f => f.formType === ft)
                    const meta = formTypeMeta[ft]
                    return (
                      <div key={ft} style={{
                        padding: '1.1rem 1.25rem', borderRadius: 12,
                        border: `1.5px solid ${existingForm ? meta.color + '55' : 'var(--border)'}`,
                        background: existingForm ? meta.bg + '55' : 'var(--bg-secondary)',
                      }}>
                        <div className="d-flex align-items-start justify-content-between gap-3">
                          <div className="flex-grow-1">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ padding: '0.18rem 0.6rem', borderRadius: 99, fontSize: '0.75rem', fontWeight: 700, background: meta.bg, color: meta.color }}>
                                {meta.label}
                              </span>
                              {existingForm && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {t('admin.formBuilder.fieldCountLabel', { count: existingForm.fields?.length || 0 })}
                                </span>
                              )}
                            </div>
                            {existingForm ? (
                              <>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{existingForm.name}</div>
                                {existingForm.description && (
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{existingForm.description}</div>
                                )}
                              </>
                            ) : (
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {t('admin.formBuilder.noFormTypeYet', { label: meta.label })}
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-2 flex-shrink-0">
                            {existingForm ? (
                              <button onClick={() => openEdit(existingForm)} style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: `1.5px solid ${meta.color}`,
                                background: 'transparent', color: meta.color, cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem'
                              }}>
                                <i className="bi bi-pencil me-1"></i>{t('admin.formBuilder.editBtnLabel')}
                              </button>
                            ) : (
                              <button onClick={() => openNew(ft)} style={{
                                padding: '0.4rem 0.9rem', borderRadius: 8, border: 'none',
                                background: meta.color, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem'
                              }}>
                                <i className="bi bi-plus me-1"></i>{t('admin.formBuilder.buildBtn')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedPkg && !editing && (
          <div className="col-12 col-lg-7">
            <div className="card-custom text-center py-5">
              <i className="bi bi-arrow-left-circle" style={{ fontSize: '2.5rem', color: 'var(--text-muted)' }}></i>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                {t('admin.formBuilder.selectPlanPrompt')}
              </p>
            </div>
          </div>
        )}

        {/* ── Editor panel ── */}
        {editing && form && (
          <div className="col-12 col-lg-8">
            <div className="card-custom">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h6 style={{ fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    {typeof editing === 'string' && editing.startsWith('new-')
                      ? t('admin.formBuilder.editorNewTitle', { label: formTypeMeta[editFormType]?.label })
                      : t('admin.formBuilder.editorEditTitle', { label: formTypeMeta[editFormType]?.label })}
                  </h6>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {t('admin.formBuilder.editorPlanLabel')} {selectedPkg?.name}
                  </div>
                </div>
                <button onClick={closePanel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="row g-3 mb-3">
                  <div className="col-12">
                    <label className="form-label-custom">{t('admin.formBuilder.formNameLabel')}</label>
                    <input required className="form-control-custom w-100"
                      placeholder={`e.g. ${selectedPkg?.name} ${formTypeMeta[editFormType]?.label}`}
                      value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label-custom">{t('admin.formBuilder.description')}</label>
                    <textarea rows={2} className="form-control-custom w-100" style={{ resize: 'vertical' }}
                      value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                      {t('admin.formBuilder.activeVisible')}
                    </label>
                  </div>
                </div>

                {/* Fields */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {t('admin.formBuilder.formFields')} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>({form.fields.length})</span>
                    </span>
                    <button type="button" onClick={addField} style={{
                      padding: '0.3rem 0.9rem', borderRadius: 8,
                      border: '1.5px dashed var(--primary)', background: 'transparent',
                      color: 'var(--primary)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600
                    }}>
                      {t('admin.formBuilder.addField')}
                    </button>
                  </div>

                  {form.fields.length === 0 ? (
                    <div style={{ padding: '1.5rem', border: '1.5px dashed var(--border)', borderRadius: 10, textAlign: 'center' }}>
                      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>{t('admin.formBuilder.emptyHint')}</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      {form.fields.map((field, i) => (
                        <FieldEditor key={i} field={field} index={i}
                          onUpdate={(key, val) => updateField(i, key, val)}
                          onRemove={() => removeField(i)}
                          onMoveUp={() => moveField(i, -1)}
                          onMoveDown={() => moveField(i, 1)}
                          isFirst={i === 0} isLast={i === form.fields.length - 1} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="d-flex gap-2 mt-4">
                  <button type="submit" disabled={saving} className="btn-primary-custom flex-grow-1" style={{ justifyContent: 'center' }}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('admin.formBuilder.saving')}</>
                      : <><i className="bi bi-floppy me-2"></i>{t('admin.formBuilder.saveForm')}</>}
                  </button>
                  {typeof editing !== 'string' && (
                    <button type="button" onClick={handleDelete} title={t('admin.formBuilder.deleteFormTooltip')} style={{
                      padding: '0.65rem 1rem', borderRadius: 10, border: '1.5px solid #dc2626',
                      background: 'transparent', color: '#dc2626', cursor: 'pointer', fontWeight: 600
                    }}>
                      <i className="bi bi-trash3"></i>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        open={deleteModal.open}
        title={t('admin.formBuilder.deleteConfirm')}
        message={t('admin.formBuilder.deleteFormMessage')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModal({ open: false, loading: false })}
        loading={deleteModal.loading}
      />
    </div>
  )
}

function FieldEditor({ field, index, onUpdate, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const { t } = useTranslation()
  const fieldTypes = getFieldTypes(t)
  const meta = fieldTypes.find(ft => ft.value === field.fieldType) || fieldTypes[0]
  const isLabel = field.fieldType === 'LABEL'
  const isCheckbox = field.fieldType === 'CHECKBOX'

  let checkboxOptions = ['Yes', 'No']
  if (isCheckbox && field.fieldOptions) {
    try { checkboxOptions = JSON.parse(field.fieldOptions) } catch {}
  }

  const updateCheckboxOptions = (options) => {
    onUpdate('fieldOptions', JSON.stringify(options))
  }

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: '0.75rem 0.9rem', border: '1px solid var(--border)' }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
          <button type="button" disabled={isFirst} onClick={onMoveUp} style={{ background: 'none', border: 'none', padding: '0 3px', cursor: isFirst ? 'default' : 'pointer', color: isFirst ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: '0.62rem', lineHeight: 1 }}>▲</button>
          <button type="button" disabled={isLast}  onClick={onMoveDown} style={{ background: 'none', border: 'none', padding: '0 3px', cursor: isLast ? 'default' : 'pointer', color: isLast ? 'var(--text-muted)' : 'var(--text-secondary)', fontSize: '0.62rem', lineHeight: 1 }}>▼</button>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, minWidth: 20 }}>{index + 1}.</span>
        <input required className="form-control-custom flex-grow-1"
          style={{ fontSize: '0.85rem', padding: '0.38rem 0.6rem' }}
          placeholder={isLabel ? t('admin.formBuilder.fieldLabelHint') : t('admin.formBuilder.fieldLabelHint2')}
          value={field.fieldLabel}
          onChange={e => onUpdate('fieldLabel', e.target.value)} />
        <select className="form-select-custom"
          style={{ fontSize: '0.82rem', padding: '0.38rem 0.5rem', width: 'auto', flexShrink: 0 }}
          value={field.fieldType}
          onChange={e => onUpdate('fieldType', e.target.value)}>
          {fieldTypes.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
        </select>
      </div>

      {/* Checkbox options editor */}
      {isCheckbox && (
        <div style={{ paddingLeft: 42, marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
            {t('admin.formBuilder.checkboxOptions')}
          </div>
          <textarea rows={2} className="form-control-custom w-100"
            style={{ fontSize: '0.82rem', resize: 'vertical', padding: '0.35rem 0.5rem' }}
            placeholder="Yes&#10;No"
            value={checkboxOptions.join('\n')}
            onChange={e => {
              const opts = e.target.value.split('\n').filter(o => o.trim())
              updateCheckboxOptions(opts.length ? opts : ['Yes', 'No'])
            }} />
        </div>
      )}

      <div className="d-flex align-items-center justify-content-between" style={{ paddingLeft: 42 }}>
        {!isLabel ? (
          <label style={{ fontSize: '0.79rem', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
            <input type="checkbox" checked={field.required} onChange={e => onUpdate('required', e.target.checked)} />
            {t('admin.formBuilder.required')}
          </label>
        ) : <span />}
        <div className="d-flex align-items-center gap-3">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <i className={`bi ${meta.icon} me-1`}></i>{meta.label}
          </span>
          <button type="button" onClick={onRemove} title={t('admin.formBuilder.removeFieldTooltip')} style={{
            background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0.1rem 0.25rem', fontSize: '0.85rem'
          }}>
            <i className="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </div>
  )
}
