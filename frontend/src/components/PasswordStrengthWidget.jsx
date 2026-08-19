import { PWD_RULES } from '../utils/validation'

/**
 * Reusable password-requirements checklist.
 * Shows a tick/circle for each rule, coloured green when satisfied.
 *
 * Props:
 *   password  – the current password string
 *   lang      – 'en' | 'my'  (defaults to 'en')
 *   compact   – boolean: use slightly smaller padding (for modals)
 */
export default function PasswordStrengthWidget({ password, lang = 'en', compact = false }) {
  return (
    <div style={{
      marginTop: '0.5rem',
      padding: compact ? '0.6rem 0.85rem' : '0.75rem 1rem',
      background: 'var(--bg-secondary, #f8fafc)',
      border: '1px solid var(--border)',
      borderRadius: compact ? 9 : 10,
    }}>
      {PWD_RULES.map((r, idx) => {
        const ok = r.test(password)
        return (
          <div key={r.key} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            marginBottom: idx < PWD_RULES.length - 1 ? '0.3rem' : 0,
            fontSize: compact ? '0.8rem' : '0.82rem',
            color: ok ? '#16a34a' : 'var(--text-muted)',
            transition: 'color 0.2s',
          }}>
            <div style={{
              width: compact ? 15 : 16, height: compact ? 15 : 16,
              borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: ok ? '#16a34a' : 'transparent',
              border: `1.5px solid ${ok ? '#16a34a' : 'var(--text-muted)'}`,
              transition: 'all 0.2s',
            }}>
              {ok && (
                <i className="bi bi-check" style={{
                  color: '#fff', fontSize: compact ? '0.55rem' : '0.6rem', lineHeight: 1,
                }} />
              )}
            </div>
            {r.label[lang] ?? r.label.en}
          </div>
        )
      })}
    </div>
  )
}
