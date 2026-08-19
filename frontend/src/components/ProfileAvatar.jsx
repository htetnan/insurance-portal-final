import { useEffect, useRef, useState } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'

/**
 * Displays a user's profile picture (fetched via blob + object URL, since the
 * image endpoints are JWT-protected) with initials as a fallback. Optionally
 * editable — shows a camera button that uploads a new picture.
 */
export default function ProfileAvatar({
  fetchUrl, uploadUrl, hasPicture, name, size = 96, editable = false, onUploaded,
  deferUpload = false, onFileSelected, previewOverrideUrl,
}) {
  const [objectUrl, setObjectUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    let currentUrl = null
    let cancelled = false
    if (hasPicture && fetchUrl) {
      api.get(fetchUrl, { responseType: 'blob' }).then(res => {
        if (cancelled) return
        currentUrl = URL.createObjectURL(res.data)
        setObjectUrl(currentUrl)
      }).catch(() => { if (!cancelled) setObjectUrl(null) })
    } else {
      setObjectUrl(null)
    }
    return () => { cancelled = true; if (currentUrl) URL.revokeObjectURL(currentUrl) }
  }, [fetchUrl, hasPicture])

  const handleFileChange = async e => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please choose an image file'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }

    if (deferUpload) {
      // Just hand the file back to the parent — it decides when (e.g. on "Save Changes") to actually upload it.
      onFileSelected?.(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    try {
      const { data } = await api.post(uploadUrl, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Profile picture updated')
      onUploaded?.(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload picture')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const initials = name?.charAt(0)?.toUpperCase() || '?'
  const displaySrc = previewOverrideUrl || objectUrl

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        background: 'var(--primary)', color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontWeight: 700,
        fontSize: size * 0.4, border: '2px solid var(--border)',
      }}>
        {displaySrc ? (
          <img src={displaySrc} alt={name || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : initials}
      </div>
      {editable && (
        <>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
            title="Change photo"
            style={{
              position: 'absolute', bottom: 0, right: 0, width: Math.max(size * 0.32, 22), height: Math.max(size * 0.32, 22),
              borderRadius: '50%', background: 'var(--primary)', color: '#fff', border: '2px solid var(--bg-card)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
            }}>
            {uploading
              ? <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10, borderWidth: 1.5 }}></span>
              : <i className="bi bi-camera-fill" style={{ fontSize: Math.max(size * 0.14, 10) }}></i>}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
        </>
      )}
    </div>
  )
}
