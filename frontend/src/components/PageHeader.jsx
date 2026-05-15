export default function PageHeader({ title, subtitle, children }) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
      {children}
    </header>
  )
}
