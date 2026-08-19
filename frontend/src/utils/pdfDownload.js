const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-

/**
 * Saves PDF bytes that were already fetched through the authenticated API.
 *
 * Keeping the protected HTTP request separate from the browser download avoids
 * download-manager extensions repeating the API request without its JWT.
 */
export async function downloadPdf(data, filename) {
  let source

  // Protected PDF endpoints return Base64 inside JSON. Download managers only
  // see application/json, so they cannot repeat the API URL without the JWT.
  if (data && typeof data === 'object' && typeof data.base64 === 'string') {
    const binary = window.atob(data.base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    source = new Blob([bytes])
    filename = data.filename || filename
  } else {
    // Backward compatibility for an older backend or the browser Blob API.
    source = data instanceof Blob ? data : new Blob([data])
  }
  const header = new Uint8Array(await source.slice(0, PDF_SIGNATURE.length).arrayBuffer())
  const isPdf = PDF_SIGNATURE.every((byte, index) => header[index] === byte)

  if (!isPdf) {
    throw new Error('The server response is not a valid PDF document')
  }

  const pdf = new Blob([source], { type: 'application/pdf' })
  const url = URL.createObjectURL(pdf)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()

  // Revoking immediately can truncate downloads in Chrome/Edge and extensions.
  window.setTimeout(() => {
    anchor.remove()
    URL.revokeObjectURL(url)
  }, 1000)
}
