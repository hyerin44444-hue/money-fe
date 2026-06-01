import { useState, useEffect } from 'react'
import { getMemos, createMemo, updateMemo, deleteMemo } from '../api/client'

export default function MonthMemo({ year, month }) {
  const [memos, setMemos] = useState([])
  const [input, setInput] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetch = async () => {
    const res = await getMemos(year, month)
    setMemos(res.data)
  }

  useEffect(() => { fetch() }, [year, month])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    setSubmitting(true)
    try {
      await createMemo({ year, month, text: input.trim(), done: false })
      setInput('')
      await fetch()
    } finally { setSubmitting(false) }
  }

  const handleToggle = async (memo) => {
    await updateMemo(memo.id, { done: !memo.done })
    await fetch()
  }

  const handleDelete = async (id) => {
    await deleteMemo(id)
    await fetch()
  }

  const done = memos.filter((m) => m.done)
  const todo = memos.filter((m) => !m.done)

  return (
    <div className="card card-section">
      <h2 style={{ margin: '0 0 14px', fontSize: 16 }}>📝 이번달 메모</h2>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메모 또는 할 일 입력..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, outline: 'none' }}
        />
        <button type="submit" className="btn primary" disabled={submitting} style={{ flexShrink: 0 }}>추가</button>
      </form>

      {memos.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '12px 0' }}>이번달 메모가 없어요.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {todo.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={false} onChange={() => handleToggle(m)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{m.text}</span>
            <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
          </div>
        ))}

        {done.length > 0 && (
          <>
            {todo.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />}
            {done.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', opacity: 0.5 }}>
                <input type="checkbox" checked={true} onChange={() => handleToggle(m)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>{m.text}</span>
                <button onClick={() => handleDelete(m.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
