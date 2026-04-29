interface LineTickerProps {
  direction?: 'left' | 'right'
}

export default function LineTicker({ direction = 'right' }: LineTickerProps) {
  return <div className={`line-ticker ${direction === 'left' ? 'ticker-left' : ''}`} />
}
