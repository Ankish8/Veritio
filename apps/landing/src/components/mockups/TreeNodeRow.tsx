interface TreeNodeRowProps {
  label: string
  indent?: number
  expanded?: boolean
  selected?: boolean
  isFolder?: boolean
  resultIcon?: 'success' | 'fail'
}

export default function TreeNodeRow({ label, indent = 0, expanded, selected, isFolder = true, resultIcon }: TreeNodeRowProps) {
  return (
    <div className={`tt-node${expanded ? ' expanded' : ''}${selected ? ' selected' : ''}`} style={{ paddingLeft: `${12 + indent * 24}px` }}>
      {isFolder ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {expanded
            ? <path d="M6 9l6 6 6-6" />
            : <path d="M9 18l6-6-6-6" />}
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></svg>
      )}
      {label}
      {resultIcon === 'success' && (
        <svg className="tt-node-result-icon" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5" style={{ width: 14, height: 14, marginLeft: 'auto' }}><path d="M20 6L9 17l-5-5" /></svg>
      )}
      {resultIcon === 'fail' && (
        <svg className="tt-node-result-icon" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2.5" style={{ width: 14, height: 14, marginLeft: 'auto' }}><path d="M18 6L6 18M6 6l12 12" /></svg>
      )}
    </div>
  )
}
