import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import Select from './Select'

const EMPTY = {
  date: dayjs().format('YYYY-MM-DD'),
  type: 'expense',
  category: '',
  amount: '',
  note: '',
  is_irregular: false,
}

const TYPE_OPTIONS = [
  { value: 'income', label: '수입' },
  { value: 'expense', label: '지출' },
]

export default function TransactionForm({ categories, onSubmit, onClose, initial }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setForm(initial || EMPTY) }, [initial])

  const filteredCategories = categories
    .filter((c) => c.type === form.type || c.type === 'both')
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((c) => ({ value: c.name, label: c.name }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category || !form.amount) return
    setSubmitting(true)
    try {
      await onSubmit({ ...form, amount: parseFloat(form.amount) })
      setForm(EMPTY)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{initial ? '내역 수정' : '내역 추가'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>날짜</label>
            <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} required />
          </div>
          <div className="form-row">
            <label>구분</label>
            <Select
              value={form.type}
              onChange={(v) => setForm((p) => ({ ...p, type: v, category: '' }))}
              options={TYPE_OPTIONS}
            />
          </div>
          <div className="form-row">
            <label>카테고리</label>
            <Select
              value={form.category}
              onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              options={filteredCategories}
              placeholder="선택"
            />
          </div>
          <div className="form-row">
            <label>금액 (원)</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              min="0" step="1" required placeholder="0"
            />
          </div>
          <div className="form-row">
            <label>메모</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="선택 입력"
            />
          </div>
          {form.type === 'expense' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={!!form.is_irregular}
                onChange={(e) => setForm((p) => ({ ...p, is_irregular: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>비정기 지출</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>(고정비 외 일회성 지출)</span>
            </label>
          )}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
