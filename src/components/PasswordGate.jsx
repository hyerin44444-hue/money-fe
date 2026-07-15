import { useState } from 'react'

const PASSWORD = 'tlgusaka123'
const SESSION_KEY = 'hyerin_assets_auth'

export default function PasswordGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  if (unlocked) return children

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setUnlocked(true)
    } else {
      setError(true)
      setShake(true)
      setInput('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '24px',
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 16, padding: '36px 32px',
        border: '1px solid var(--border)', maxWidth: 340, width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        animation: shake ? 'shake 0.4s ease' : undefined,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>혜린 자산</p>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>비밀번호를 입력해주세요</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="비밀번호"
            autoFocus
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 15,
              border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              outline: 'none', boxSizing: 'border-box',
              background: 'var(--bg)', color: 'var(--text-primary)',
            }}
          />
          {error && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>
              비밀번호가 올바르지 않습니다.
            </p>
          )}
          <button type="submit" className="btn primary" style={{ width: '100%', padding: '10px', fontSize: 14 }}>
            확인
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
