import { useTranslation } from 'react-i18next'
import { NRC_DATA, NRC_CITIZEN_TYPES, getTownships, resolveToCode, findTownship } from '../data/nrcData'

/**
 * Myanmar NRC input component — language-aware.
 *
 * EN  mode → English-only labels, English preview (10/MADANA(N)241890)
 * မြန်မာ mode → Myanmar-only labels, Myanmar preview (၁၀/မဒန(နိုင်)၂၄၁၈၉၀)
 *
 * Stored format (language-independent): "10/မဒန(နိုင်)241890"
 *
 * Props
 *   value    : NRC string (controlled)
 *   onChange : (nrcString) => void
 *   required : bool
 *   readOnly : bool
 */
export default function NrcInput({ value, onChange, required, readOnly }) {
  const { t, i18n } = useTranslation()
  const isEn = i18n.language === 'en'

  const parsed = parseNrc(value || '')

  const resolvedCode = parsed.state
    ? resolveToCode(parsed.state, parsed.township)
    : parsed.township

  const handleChange = (part, val) => {
    const next = { ...parsed, township: resolvedCode, [part]: val }
    if (part === 'state') next.township = ''
    onChange(formatNrc(next))
  }

  const townships   = getTownships(parsed.state)
  const townshipObj = findTownship(parsed.state, resolvedCode)
  const citizenObj  = NRC_CITIZEN_TYPES.find(ct => ct.value === parsed.type)

  const inputStyle = readOnly
    ? { background: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' }
    : {}

  // Convert Arabic ↔ Myanmar digits
  const toMM = str => (str || '').replace(/[0-9]/g, d => '၀၁၂၃၄၅၆၇၈၉'[d])
  const toAR = str => (str || '').replace(/[၀-၉]/g, d => String('၀၁၂၃၄၅၆၇၈၉'.indexOf(d)))

  // ── Build preview string for the active language ──────────────────
  const preview = (() => {
    if (!parsed.state && !resolvedCode && !parsed.type && !parsed.digits) return ''
    if (isEn) {
      let s = ''
      if (parsed.state)         s += parsed.state + '/'
      if (townshipObj?.engCode) s += townshipObj.engCode
      else if (resolvedCode)    s += resolvedCode
      if (citizenObj?.engValue) s += `(${citizenObj.engValue})`
      else if (parsed.type)     s += `(${parsed.type})`
      if (parsed.digits)        s += toAR(parsed.digits)
      return s
    } else {
      let s = ''
      if (parsed.state)  s += toMM(parsed.state) + '/'
      if (resolvedCode)  s += resolvedCode
      if (parsed.type)   s += `(${parsed.type})`
      if (parsed.digits) s += toMM(parsed.digits)
      return s
    }
  })()

  return (
    <div>
      <div className="d-flex gap-1 align-items-center flex-wrap">

        {/* ── State number ── */}
        <select
          className="form-select-custom"
          style={{ width: 155, flexShrink: 0, ...inputStyle }}
          value={parsed.state}
          disabled={readOnly}
          required={required && !readOnly}
          onChange={e => handleChange('state', e.target.value)}
        >
          <option value="">{t('nrc.statePlaceholder')}</option>
          {Object.entries(NRC_DATA).map(([k, v]) => (
            <option key={k} value={k}>
              {isEn ? `${k}/ — ${v.engState}` : `${toMM(k)}/ — ${v.stateName}`}
            </option>
          ))}
        </select>

        {/* ── Township ── */}
        <select
          className="form-select-custom"
          style={{ flex: '1 1 200px', minWidth: 180, ...inputStyle }}
          value={resolvedCode}
          disabled={readOnly || !parsed.state}
          required={required && !readOnly}
          onChange={e => handleChange('township', e.target.value)}
        >
          <option value="">{t('nrc.townshipPlaceholder')}</option>
          {townships.map(tp => (
            <option key={tp.code} value={tp.code}>
              {isEn
                ? `${tp.engCode} — ${tp.engName}`
                : `${tp.code} — ${tp.name}`}
            </option>
          ))}
        </select>

        {/* ── Citizen type ── */}
        <select
          className="form-select-custom"
          style={{ width: 110, flexShrink: 0, ...inputStyle }}
          value={parsed.type}
          disabled={readOnly}
          required={required && !readOnly}
          onChange={e => handleChange('type', e.target.value)}
        >
          <option value="">{t('nrc.typePlaceholder')}</option>
          {NRC_CITIZEN_TYPES.map(ct => (
            <option key={ct.value} value={ct.value}>
              {isEn ? ct.engValue : ct.value}
            </option>
          ))}
        </select>

        {/* ── Serial digits ── */}
        <input
          className="form-control-custom"
          style={{ width: 110, flexShrink: 0, ...inputStyle }}
          placeholder={t('nrc.digitsPlaceholder')}
          maxLength={6}
          value={parsed.digits}
          readOnly={readOnly}
          required={required && !readOnly}
          onChange={e => handleChange('digits', e.target.value.replace(/[^0-9၀-၉]/g, ''))}
        />
      </div>

      {/* ── Live preview ── */}
      {preview && (
        <div style={{ marginTop: 6, fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
          <span style={{ marginRight: 4 }}>
            {isEn ? 'NRC:' : 'မှတ်ပုံတင်:'}
          </span>
          <strong style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            {preview}
          </strong>
        </div>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────

function parseNrc(str) {
  if (!str) return { state: '', township: '', type: '', digits: '' }
  const full = str.match(/^(\d+)\/([^(]*)\(([^)]+)\)(.*)$/)
  if (full) return { state: full[1], township: full[2], type: full[3], digits: full[4] }
  const partial2 = str.match(/^(\d+)\/([^(]+)$/)
  if (partial2) return { state: partial2[1], township: partial2[2], type: '', digits: '' }
  const partial1 = str.match(/^(\d+)\/$/)
  if (partial1) return { state: partial1[1], township: '', type: '', digits: '' }
  return { state: '', township: '', type: '', digits: '' }
}

function formatNrc({ state, township, type, digits }) {
  if (!state && !township && !type && !digits) return ''
  let s = ''
  if (state)    s += state + '/'
  if (township) s += township
  if (type)     s += `(${type})`
  if (digits)   s += digits
  return s
}
