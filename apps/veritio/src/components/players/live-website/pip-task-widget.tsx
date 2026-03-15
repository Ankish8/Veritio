import { useState } from 'react'
import { PostTaskQuestionsScreen } from '../shared/post-task-questions-screen'
import type { PostTaskQuestion } from '@veritio/study-types'
import type { PostTaskQuestionResponse } from '../shared/post-task-questions-screen'

export type PipState = 'ready' | 'active' | 'completed' | 'post-task-questions'
export type ConfirmAction = 'complete' | 'skip' | null

export function PipTaskWidget({
  task,
  taskIndex,
  totalTasks,
  showProgress,
  allowSkip,
  brandColor,
  logoUrl,
  websiteUrl,
  pipWindow,
  postTaskQuestions,
  onStartTask,
  onComplete,
  onContinue,
  onContinueWithResponses,
  onSkip,
}: {
  task: { title: string; instructions: string }
  taskIndex: number
  totalTasks: number
  showProgress: boolean
  allowSkip: boolean
  brandColor?: string
  logoUrl?: string
  websiteUrl: string
  pipWindow?: Window | null
  postTaskQuestions: PostTaskQuestion[]
  onStartTask: () => void
  onComplete: () => void
  onContinue: () => void
  onContinueWithResponses: (responses: PostTaskQuestionResponse[]) => void
  onSkip: () => void
}) {
  const [pipState, setPipState] = useState<PipState>('ready')
  const [minimized, setMinimized] = useState(false)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const brand = brandColor || '#0f172a'

  const handleStart = () => {
    setPipState('active')
    onStartTask()
  }

  const handleConfirmedComplete = () => {
    setConfirmAction(null)
    onComplete()
    if (postTaskQuestions.length > 0) {
      setPipState('post-task-questions')
      try {
        pipWindow?.resizeTo(480, 680)
        setTimeout(() => { try { pipWindow?.resizeTo(480, 680) } catch {} }, 100)
      } catch {}
    } else {
      setPipState('completed')
    }
  }

  const handleConfirmedSkip = () => {
    setConfirmAction(null)
    onSkip()
  }

  const handleMinimize = () => {
    setMinimized(true)
    try {
      pipWindow?.resizeTo(340, 52)
      // Move minimized bar to bottom-right edge
      setTimeout(() => {
        try {
          const scr = window.screen as any
          const x = (scr.availLeft ?? 0) + window.screen.availWidth - (pipWindow?.outerWidth || 340)
          const y = (scr.availTop ?? 0) + window.screen.availHeight - (pipWindow?.outerHeight || 80)
          pipWindow?.moveTo(x, y)
        } catch {}
      }, 100)
    } catch {}
  }

  const handleExpand = () => {
    setMinimized(false)
    try {
      pipWindow?.resizeTo(380, 480)
      // Re-assert size after a tick (Chrome PiP session memory)
      setTimeout(() => { try { pipWindow?.resizeTo(380, 480) } catch {} }, 100)
    } catch {}
  }

  const btn = (bg: string, fg: string, small?: boolean): React.CSSProperties => ({
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: small ? '7px 14px' : '10px 16px',
    borderRadius: 8,
    fontSize: small ? 13 : 14,
    fontWeight: 500,
    color: fg,
    backgroundColor: bg,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
  })

  // Minimized view — compact single-row bar
  if (minimized) {
    return (
      <div style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 18, width: 18, borderRadius: 4, objectFit: 'contain' }} />
          ) : (
            <div style={{ height: 18, width: 18, borderRadius: 4, backgroundColor: brand }} />
          )}
          {showProgress && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' as const }}>
              Task {taskIndex + 1}/{totalTasks}
            </span>
          )}
        </div>
        <button
          onClick={handleExpand}
          style={{
            background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
            padding: '4px 12px', borderRadius: 6,
            color: '#64748b', fontSize: 13, fontWeight: 500, lineHeight: '1.4',
            whiteSpace: 'nowrap' as const,
          }}
          title="Show task instructions"
        >
          Show task
        </button>
      </div>
    )
  }

  // Post-task questions — PTQ screen takes full PIP space
  if (pipState === 'post-task-questions') {
    return (
      <div style={{
        height: '100vh', overflow: 'auto',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#fff',
      }}>
        <PostTaskQuestionsScreen
          questions={postTaskQuestions}
          onComplete={onContinueWithResponses}
          taskNumber={taskIndex + 1}
          pageMode="all_on_one"
          title="Follow-up questions"
          subtitle=""
        />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#fff', color: '#1e293b',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" style={{ height: 20, width: 20, borderRadius: 4, objectFit: 'contain' }} />
          ) : (
            <div style={{ height: 20, width: 20, borderRadius: 4, backgroundColor: brand }} />
          )}
          {showProgress && (
            <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>
              Task {taskIndex + 1} <span style={{ color: '#94a3b8' }}>of {totalTasks}</span>
            </span>
          )}
        </div>
        {pipState === 'active' && (
          <button
            onClick={handleMinimize}
            style={{
              background: 'none', border: '1px solid #e2e8f0', cursor: 'pointer',
              padding: '3px 10px', borderRadius: 6,
              color: '#64748b', fontSize: 12, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
            title="Minimize"
          >
            &#x25BE; Hide
          </button>
        )}
      </div>

      {/* Content — scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {pipState === 'ready' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: '#1e293b', margin: '0 0 6px' }}>
                {task.title || `Task ${taskIndex + 1}`}
              </h2>
              {task.instructions && (
                <div
                  className="pip-instructions"
                  style={{ fontSize: 14, lineHeight: 1.6, color: '#64748b' }}
                  dangerouslySetInnerHTML={{ __html: task.instructions }}
                />
              )}
            </div>

            {/* Spacer pushes "How it works" to the bottom */}
            <div style={{ flex: 1 }} />

            {/* How it works hint — first task only */}
            {taskIndex === 0 && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
                fontSize: 12, lineHeight: 1.6, color: '#64748b',
              }}>
                <div style={{ fontWeight: 600, color: '#475569', marginBottom: 3 }}>How it works</div>
                <div>1. Click <strong style={{ color: '#1e293b' }}>Open website</strong> below</div>
                <div>2. Complete the task on the website</div>
                <div>3. Return here and mark as complete</div>
              </div>
            )}
          </div>
        )}
        {pipState === 'active' && (
          <>
            <h2 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: '#1e293b', margin: '0 0 6px' }}>
              {task.title || `Task ${taskIndex + 1}`}
            </h2>
            {task.instructions && (
              <div
                className="pip-instructions"
                style={{ fontSize: 13, lineHeight: 1.6, color: '#64748b' }}
                dangerouslySetInnerHTML={{ __html: task.instructions }}
              />
            )}
          </>
        )}
        {pipState === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', margin: 0 }}>Task finished!</h2>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Click Continue to see what&apos;s next</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
        display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {pipState === 'ready' && (
          <>
            {/* <a> tag — fresh user activation from this click opens the website
                in a new tab without being popup-blocked. requestWindow() already
                consumed the activation from the previous click. */}
            <a href={websiteUrl} target="_blank" rel="noopener noreferrer" onClick={handleStart} style={btn(brand, '#fff')}>
              Open website
            </a>
            {allowSkip && (
              <button onClick={() => setConfirmAction('skip')} style={btn('transparent', '#64748b', true)}>Skip task</button>
            )}
          </>
        )}
        {pipState === 'active' && (
          <>
            <button onClick={() => setConfirmAction('complete')} style={btn(brand, '#fff')}>Mark as complete</button>
            {allowSkip && (
              <button onClick={() => setConfirmAction('skip')} style={btn('transparent', '#64748b', true)}>Skip task</button>
            )}
          </>
        )}
        {pipState === 'completed' && (
          <button onClick={onContinue} style={btn(brand, '#fff')}>Continue</button>
        )}
      </div>

      {/* Confirmation overlay */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50, padding: 16,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 12, padding: '20px 24px',
            maxWidth: 320, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', margin: '0 0 6px' }}>
              {confirmAction === 'complete' ? 'Mark task as complete?' : 'Skip this task?'}
            </h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
              {confirmAction === 'complete'
                ? "Confirm that you've finished this task on the website."
                : "Are you sure? You won't be able to come back to it."}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={confirmAction === 'complete' ? handleConfirmedComplete : handleConfirmedSkip}
                style={btn(confirmAction === 'complete' ? brand : '#ef4444', '#fff')}
              >
                {confirmAction === 'complete' ? 'Yes, mark complete' : 'Yes, skip task'}
              </button>
              <button onClick={() => setConfirmAction(null)} style={btn('transparent', '#64748b', true)}>
                Go back
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
