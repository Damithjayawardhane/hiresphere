export default function Loading({ label = 'Loading…' }) {
  return (
    <div className="loading-page">
      <div className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
