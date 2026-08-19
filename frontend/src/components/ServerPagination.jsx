export default function ServerPagination({ page, totalPages, totalElements, pageSize = 20, onPageChange }) {
  if (!totalPages || totalPages <= 1) return totalElements > 0 ? (
    <div className="server-page-meta mt-3">Showing {totalElements} result{totalElements === 1 ? '' : 's'}</div>
  ) : null

  const current = page + 1
  const pages = []
  for (let n = 1; n <= totalPages; n++) {
    if (n === 1 || n === totalPages || Math.abs(n - current) <= 1) pages.push(n)
  }
  const compact = []
  pages.forEach((n, i) => {
    if (i && n - pages[i - 1] > 1) compact.push(`gap-${n}`)
    compact.push(n)
  })

  const from = page * pageSize + 1
  const to = Math.min((page + 1) * pageSize, totalElements)
  return (
    <div className="server-pagination mt-3">
      <span className="server-page-meta">Showing {from}–{to} of {totalElements.toLocaleString()}</span>
      <div className="server-page-buttons">
        <button disabled={page === 0} onClick={() => onPageChange(page - 1)} aria-label="Previous page"><i className="bi bi-chevron-left" /></button>
        {compact.map((n, i) => typeof n === 'string'
          ? <span className="server-page-gap" key={`${n}-${i}`}>…</span>
          : <button key={n} className={n === current ? 'active' : ''} onClick={() => onPageChange(n - 1)}>{n}</button>
        )}
        <button disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} aria-label="Next page"><i className="bi bi-chevron-right" /></button>
      </div>
    </div>
  )
}
