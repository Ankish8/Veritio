interface ChatMessageProps {
  from: 'user' | 'assistant'
  avatar?: string
  children?: React.ReactNode
  tags?: string[]
  typing?: boolean
}

export default function ChatMessage({ from, avatar, children, tags, typing }: ChatMessageProps) {
  const isUser = from === 'user'
  return (
    <div className={`ai-msg${isUser ? ' from-user' : ''}`}>
      <div className={`ai-av ${isUser ? 'user' : 'bot'}`}>{avatar || (isUser ? 'Y' : 'V')}</div>
      <div>
        <div className="ai-bubble">
          {typing ? (
            <div className="ai-dots"><span></span><span></span><span></span></div>
          ) : (
            <>
              {children}
              {tags && tags.length > 0 && (
                <div className="ai-tags">
                  {tags.map((tag, i) => (
                    <span key={i} className="ai-tag">{tag}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
