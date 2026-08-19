import NrcInput from './NrcInput'

/**
 * Shared dynamic form rendering used by ApplyPolicyPage, SubmitClaimPage, and RevisionFormModal.
 *
 * Props:
 *   fields          — array of form field definitions from the template
 *   fieldValues     — { [fieldId]: value }
 *   fieldFiles      — { [fieldId]: File }
 *   onValue         — (fieldId, value) => void
 *   onFile          — (fieldId, File|null) => void
 *   onCheckboxOption— (fieldId, option, checked) => void
 *   user            — current user object (for NAME/EMAIL auto-fill)
 *   autoFilledLabel — label string shown on auto-filled fields
 */
export default function DynamicFormFields({ fields, fieldValues, fieldFiles, onValue, onFile, onCheckboxOption, user, autoFilledLabel }) {
  if (!fields || fields.length === 0) return null
  return (
    <div className="d-flex flex-column gap-3 mb-3">
      {fields.map(field => (
        <DynamicField
          key={field.id}
          field={field}
          value={fieldValues[String(field.id)]}
          file={fieldFiles[String(field.id)]}
          onValue={v => onValue(field.id, v)}
          onFile={f => onFile(field.id, f)}
          onCheckboxOption={(opt, checked) => onCheckboxOption(field.id, opt, checked)}
          user={user}
          autoFilledLabel={autoFilledLabel}
        />
      ))}
    </div>
  )
}

function DynamicField({ field, value, file, onValue, onFile, onCheckboxOption, user, autoFilledLabel }) {
  if (field.fieldType === 'LABEL') {
    return (
      <div style={{
        padding: '0.6rem 0.9rem', borderRadius: 8,
        background: 'var(--bg-secondary)', borderLeft: '3px solid var(--primary)',
        fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem',
      }}>
        {field.fieldLabel}
      </div>
    )
  }

  const isAutoFilled = field.fieldType === 'NAME' || field.fieldType === 'EMAIL'

  let options = []
  if (field.fieldType === 'CHECKBOX' && field.fieldOptions) {
    try { options = JSON.parse(field.fieldOptions) } catch { options = ['Yes', 'No'] }
  }
  const selectedOptions = Array.isArray(value) ? value : []

  return (
    <div>
      <label className="form-label-custom">
        {field.fieldLabel}
        {field.required && !isAutoFilled && <span style={{ color: '#dc2626' }}> *</span>}
        {isAutoFilled && autoFilledLabel && (
          <span style={{ fontSize: '0.7rem', color: '#16a34a', marginLeft: 6, fontWeight: 400 }}>
            <i className="bi bi-lock-fill me-1"></i>{autoFilledLabel}
          </span>
        )}
      </label>

      {isAutoFilled && (
        <input className="form-control-custom w-100" value={value || ''} readOnly
          style={{ background: '#f0fdf4', borderColor: '#86efac', color: 'var(--text-primary)', cursor: 'not-allowed' }} />
      )}
      {field.fieldType === 'TEXT' && (
        <input className="form-control-custom w-100" value={value || ''} required={field.required}
          onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'PHONE' && (
        <input type="tel" className="form-control-custom w-100" value={value || ''}
          placeholder="+95 9xxxxxxxx" required={field.required}
          onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'TEXTAREA' && (
        <textarea rows={3} className="form-control-custom w-100" style={{ resize: 'vertical' }}
          value={value || ''} required={field.required}
          onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'CHECKBOX' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 4 }}>
          {options.map(opt => (
            <label key={opt} style={{
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              padding: '0.35rem 0.75rem', borderRadius: 8,
              border: selectedOptions.includes(opt) ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: selectedOptions.includes(opt) ? 'var(--bg-secondary)' : 'transparent',
              fontSize: '0.88rem', color: 'var(--text-primary)',
            }}>
              <input type="checkbox"
                checked={selectedOptions.includes(opt)}
                onChange={e => onCheckboxOption(opt, e.target.checked)} />
              {opt}
            </label>
          ))}
        </div>
      )}
      {field.fieldType === 'DATE' && (
        <input type="date" className="form-control-custom w-100"
          value={value || ''} required={field.required}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => onValue(e.target.value)} />
      )}
      {field.fieldType === 'NRC' && (
        <NrcInput value={value || ''} required={field.required} onChange={onValue} />
      )}
      {field.fieldType === 'IMAGE_UPLOAD' && (
        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="form-control-custom w-100"
          required={field.required}
          onChange={e => onFile(e.target.files[0] || null)} />
      )}
      {field.fieldType === 'PDF_UPLOAD' && (
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="form-control-custom w-100"
          required={field.required}
          onChange={e => onFile(e.target.files[0] || null)} />
      )}
      {file && (
        <small style={{ color: '#16a34a', fontSize: '0.78rem', marginTop: 2, display: 'block' }}>
          ✓ {file.name}
        </small>
      )}
    </div>
  )
}
