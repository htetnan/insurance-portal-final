// Predefined meta for known insurance types.
// Each entry includes: color, bg (solid), gradientBg, icon (Bootstrap class), emoji, label.
export const TYPE_META = {
  LIFE:      { color: '#dc2626', bg: '#fef2f2',  gradientBg: 'linear-gradient(135deg,#fff0f0,#ffe4e4)', icon: 'bi-heart-pulse',   emoji: '❤️',  label: 'Life Insurance' },
  HEALTH:    { color: '#16a34a', bg: '#f0fdf4',  gradientBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: 'bi-hospital',      emoji: '🏥',  label: 'Health Insurance' },
  TRAVEL:    { color: '#7c3aed', bg: '#f5f3ff',  gradientBg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', icon: 'bi-airplane',      emoji: '✈️',  label: 'Travel Insurance' },
  MOTOR:     { color: '#d97706', bg: '#fffbeb',  gradientBg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', icon: 'bi-car-front',     emoji: '🚗',  label: 'Motor Insurance' },
  EDUCATION: { color: '#7c3aed', bg: '#f5f3ff',  gradientBg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', icon: 'bi-mortarboard',   emoji: '🎓',  label: 'Education Insurance' },
  VEHICLE:   { color: '#1d4ed8', bg: '#eff6ff',  gradientBg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: 'bi-truck',         emoji: '🚗',  label: 'Vehicle Insurance' },
  PROPERTY:  { color: '#ca8a04', bg: '#fefce8',  gradientBg: 'linear-gradient(135deg,#fefce8,#fef08a)', icon: 'bi-house-check',   emoji: '🏠',  label: 'Property Insurance' },
  FIRE:      { color: '#ea580c', bg: '#fff7ed',  gradientBg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', icon: 'bi-fire',          emoji: '🔥',  label: 'Fire Insurance' },
  MARINE:    { color: '#0891b2', bg: '#ecfeff',  gradientBg: 'linear-gradient(135deg,#ecfeff,#cffafe)', icon: 'bi-water',         emoji: '⚓',  label: 'Marine Insurance' },
  ACCIDENT:  { color: '#be123c', bg: '#fff1f2',  gradientBg: 'linear-gradient(135deg,#fff1f2,#ffe4e6)', icon: 'bi-hospital',      emoji: '🩺',  label: 'Accident Insurance' },
  BUSINESS:  { color: '#1e40af', bg: '#eff6ff',  gradientBg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: 'bi-briefcase',     emoji: '🏢',  label: 'Business Insurance' },
  CROP:      { color: '#15803d', bg: '#f0fdf4',  gradientBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: 'bi-leaf',          emoji: '🌾',  label: 'Crop Insurance' },
}

// Palette for dynamically created types not in the list above
const DYNAMIC_PALETTE = [
  { color: '#9333ea', bg: '#faf5ff',  gradientBg: 'linear-gradient(135deg,#faf5ff,#f3e8ff)', icon: 'bi-shield-check', emoji: '🛡️' },
  { color: '#0d9488', bg: '#f0fdfa',  gradientBg: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', icon: 'bi-patch-check',  emoji: '✅' },
  { color: '#ea580c', bg: '#fff7ed',  gradientBg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', icon: 'bi-stars',        emoji: '⭐' },
  { color: '#be185d', bg: '#fdf2f8',  gradientBg: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', icon: 'bi-gem',          emoji: '💎' },
  { color: '#4f46e5', bg: '#eef2ff',  gradientBg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', icon: 'bi-award',        emoji: '🏆' },
  { color: '#0369a1', bg: '#f0f9ff',  gradientBg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', icon: 'bi-umbrella',     emoji: '☂️' },
  { color: '#15803d', bg: '#f0fdf4',  gradientBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: 'bi-leaf',         emoji: '🌿' },
  { color: '#b45309', bg: '#fef3c7',  gradientBg: 'linear-gradient(135deg,#fef3c7,#fde68a)', icon: 'bi-briefcase',    emoji: '💼' },
]

const DEFAULT_META = {
  color: '#6b7280', bg: '#f3f4f6', gradientBg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
  icon: 'bi-shield', emoji: '🛡️', label: 'Insurance',
}

function hashType(type) {
  let h = 0
  for (let i = 0; i < type.length; i++) h = (h * 31 + type.charCodeAt(i)) >>> 0
  return h % DYNAMIC_PALETTE.length
}

/** Returns meta for any insurance type — predefined or dynamically generated. */
export function getTypeMeta(type) {
  if (!type) return { ...DEFAULT_META }
  const key = type.toUpperCase()
  if (TYPE_META[key]) return { ...TYPE_META[key] }
  const palette = DYNAMIC_PALETTE[hashType(key)]
  return { ...palette, label: key.charAt(0) + key.slice(1).toLowerCase() + ' Insurance' }
}
