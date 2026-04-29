interface SortCardProps {
  label: string
  category?: string
  categoryColor?: string
  dragging?: boolean
  placeholder?: boolean
}

export default function SortCard({ label, category, categoryColor, dragging, placeholder }: SortCardProps) {
  const cls = `hm-card${dragging ? ' dragging' : ''}${placeholder ? ' dragging-placeholder' : ''}`
  return (
    <div className={cls}>
      <svg className="hm-card-handle" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="5" r="1.5" /><circle cx="11" cy="5" r="1.5" /><circle cx="5" cy="11" r="1.5" /><circle cx="11" cy="11" r="1.5" />
      </svg>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--black)' }}>{label}</div>
        {category && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--gray-400)', marginTop: '2px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: categoryColor || 'var(--gray-300)', display: 'inline-block' }}></span>
            {category}
          </div>
        )}
      </div>
    </div>
  )
}
