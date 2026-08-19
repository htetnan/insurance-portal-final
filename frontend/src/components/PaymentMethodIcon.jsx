
// Static fallback methods — used only when the API has no configured methods
export const PAYMENT_METHODS = [
  { id: 'KBZ_PAY',  label: 'KBZPay',    color: '#e2231a' },
  { id: 'WAVE_PAY', label: 'Wave Pay',   color: '#00a651' },
  { id: 'AYA_PAY',  label: 'AYA Pay',   color: '#f7941d' },
]

/**
 * Renders a brand-coloured circular icon for a payment method.
 *
 * Props:
 *   method   – payment method key, e.g. "KBZ_PAY"
 *   size     – diameter in px (default 32)
 *   logoUrl  – optional URL to a logo image; shown instead of the initials badge
 *   color    – hex color override (used when a dynamic method provides its own colour)
 *   label    – display name override
 */
export default function PaymentMethodIcon({ method, size = 32, logoUrl, color, label }) {
  const meta = PAYMENT_METHODS.find(m => m.id === method)
  const bg    = color || meta?.color || '#64748b'
  const name  = label || meta?.label || method || '?'

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0,
          border: `2px solid ${bg}40`,
        }}
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }

  // Fallback: coloured circle with initials / icon
  let inner
  if (method === 'KBZ_PAY') inner = 'K'
  else if (method === 'WAVE_PAY') inner = <i className="bi bi-water" style={{ fontSize: size * 0.48 }}></i>
  else if (method === 'AYA_PAY') inner = 'A'
  else inner = name.charAt(0).toUpperCase()

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.42, flexShrink: 0, letterSpacing: '-0.02em',
    }}>
      {inner}
    </div>
  )
}
