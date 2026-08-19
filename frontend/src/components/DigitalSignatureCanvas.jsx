import { useRef, useState, useImperativeHandle, forwardRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Reusable digital signature canvas.
 *
 * Ref API:
 *   ref.current.getSignatureData()  → base64 PNG string or null if empty
 *   ref.current.isEmpty()           → boolean
 *   ref.current.clear()             → clears the canvas
 *
 * Props:
 *   label       – field label text
 *   required    – show * and block submit if empty
 *   onChange(dataUrl|null) – called whenever the drawing changes
 *   height      – canvas height in px (default 160)
 */
const DigitalSignatureCanvas = forwardRef(function DigitalSignatureCanvas(
  { label, required, onChange, height = 160 },
  ref
) {
  const { t } = useTranslation()
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const lastPos = useRef(null)

  useImperativeHandle(ref, () => ({
    getSignatureData: () => {
      if (isEmpty || !canvasRef.current) return null
      return canvasRef.current.toDataURL('image/png')
    },
    isEmpty: () => isEmpty,
    clear: () => clearCanvas(),
  }))

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * (canvas.width / rect.width),
      y: (src.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const startDrawing = e => {
    e.preventDefault()
    setIsDrawing(true)
    lastPos.current = getPos(e, canvasRef.current)
  }

  const draw = e => {
    e.preventDefault()
    if (!isDrawing || !lastPos.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
    onChange?.(canvas.toDataURL('image/png'))
  }

  const stopDrawing = () => {
    setIsDrawing(false)
    lastPos.current = null
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onChange?.(null)
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <label className="form-label-custom" style={{ margin: 0 }}>
          {label || 'Digital Signature'}
          {required && <span style={{ color: '#dc2626' }}> *</span>}
        </label>
        {!isEmpty && (
          <button
            type="button"
            onClick={clearCanvas}
            style={{
              fontSize: '0.72rem', color: '#dc2626', background: 'none',
              border: '1px solid #dc2626', borderRadius: 6,
              padding: '0.12rem 0.5rem', cursor: 'pointer', fontWeight: 600,
            }}
          >
            <i className="bi bi-eraser me-1"></i>{t('signature.clear')}
          </button>
        )}
      </div>

      {/* Canvas box */}
      <div style={{
        border: `2px ${isEmpty ? 'dashed' : 'solid'} ${isEmpty ? 'var(--border)' : 'var(--primary)'}`,
        borderRadius: 10,
        background: isEmpty ? '#f8fafc' : '#fff',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
        userSelect: 'none',
      }}>
        <canvas
          ref={canvasRef}
          width={900}
          height={height * 2}
          style={{
            width: '100%',
            height,
            display: 'block',
            cursor: 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {/* Placeholder overlay */}
        {isEmpty && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none',
          }}>
            <i className="bi bi-pen" style={{ fontSize: '1.6rem', color: 'var(--text-muted)', opacity: 0.4 }}></i>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t('signature.placeholder')}
            </span>
          </div>
        )}

        {/* Bottom baseline */}
        <div style={{
          position: 'absolute', bottom: 28, left: '10%', right: '10%',
          borderBottom: '1.5px dashed #cbd5e1', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: 8, left: '10%',
          fontSize: '0.65rem', color: '#94a3b8', pointerEvents: 'none',
        }}>
          {t('signature.baseline')}
        </div>
      </div>

      {/* Hint */}
      {isEmpty && required && (
        <small style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
          <i className="bi bi-info-circle me-1"></i>
          {t('signature.requiredHint')}
        </small>
      )}
      {!isEmpty && (
        <small style={{ fontSize: '0.73rem', color: '#16a34a', marginTop: 4, display: 'block' }}>
          <i className="bi bi-check-circle me-1"></i>
          {t('signature.done')}
        </small>
      )}
    </div>
  )
})

export default DigitalSignatureCanvas
