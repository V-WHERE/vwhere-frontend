import { useState } from 'react'
import './CombinationShareCard.css'

type CopyState = { text: string; status: 'pending' | 'success' | 'error' }

export function CombinationShareCard({ text }: { text: string }) {
  const [copyState, setCopyState] = useState<CopyState | null>(null)
  // A changed selection needs a fresh copy; an earlier success must not label it copied.
  const status = copyState?.text === text ? copyState.status : 'idle'
  const copied = status === 'success'
  const copy = async () => {
    setCopyState({ text, status: 'pending' })
    try {
      await navigator.clipboard.writeText(text)
      setCopyState({ text, status: 'success' })
    } catch {
      setCopyState({ text, status: 'error' })
    }
  }

  return (
    <section className={`combination-share${copied ? ' is-copied' : ''}`} aria-label="강좌 조합 공유">
      <div className="combination-share__main">
        <span className="combination-share__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3m-4 4 4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
        </span>
        <div className="combination-share__copy">
          <h3>내 강좌 조합 공유</h3>
          <p>강좌·시설·가격·자료월을 한 번에</p>
        </div>
        <button type="button" className="combination-share__button" onClick={() => void copy()} disabled={status === 'pending'} aria-label={copied ? '강좌 조합 다시 복사' : '강좌 조합 복사'}>
          <CopyIcon checked={copied} />
          <span>{copied ? '복사 완료' : status === 'pending' ? '복사 중…' : '조합 복사'}</span>
        </button>
      </div>
      <p className="combination-share__feedback" role="status" aria-live="polite" aria-atomic="true">
        <span className="combination-share__feedback-icon" aria-hidden="true">{copied ? '✓' : status === 'error' ? '!' : '↗'}</span>
        <span>{copied ? '복사했어요. 원하는 대화창에 붙여넣어 주세요.' : status === 'error' ? '자동 복사가 안 되면 아래 내용을 직접 복사해 주세요.' : '복사한 조합을 카카오톡이나 메시지로 보내보세요.'}</span>
      </p>
      {status === 'error' && (
        <label className="combination-share__fallback">공유할 내용
          <textarea readOnly value={text} onFocus={event => event.target.select()} />
        </label>
      )}
    </section>
  )
}

function CopyIcon({ checked }: { checked: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {checked ? <path d="m4 10 4 4 8-8" /> : <><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M12 4V3H3v9h1" /></>}
  </svg>
}
