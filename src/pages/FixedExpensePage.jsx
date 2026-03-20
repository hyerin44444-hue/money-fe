import { useState, useEffect } from 'react'
import {
  getCategories,
  getFixedExpenses, createFixedExpense, updateFixedExpense, deleteFixedExpense,
} from '../api/client'
import Select from '../components/Select'

export default function FixedExpensePage() {
  const [categories, setCategories] = useState([])
  const [fixedList, setFixedList] = useState([])
  const [fixedForm, setFixedForm] = useState({ name: '', amount: '', category: '', day: 1 })
  const [fixedError, setFixedError] = useState('')
  const [submittingFixed, setSubmittingFixed] = useState(false)
  const [editingFixed, setEditingFixed] = useState(null)
  const [submittingEdit, setSubmittingEdit] = useState(false)

  const fetchAll = async () => {
    const [catRes, fixRes] = await Promise.all([getCategories(), getFixedExpenses()])
    setCategories(catRes.data.filter((c) => c.type === 'expense'))
    setFixedList(fixRes.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddFixed = async (e) => {
    e.preventDefault()
    if (!fixedForm.name.trim() || !fixedForm.amount || !fixedForm.category) {
      setFixedError('모든 항목을 입력해주세요.')
      return
    }
    setFixedError('')
    setSubmittingFixed(true)
    try {
      await createFixedExpense({
        name: fixedForm.name.trim(),
        amount: parseFloat(fixedForm.amount),
        category: fixedForm.category,
        day: parseInt(fixedForm.day),
      })
      setFixedForm({ name: '', amount: '', category: '', day: 1 })
      await fetchAll()
    } catch (e) {
      setFixedError(e.response?.data?.detail || '추가 실패')
    } finally { setSubmittingFixed(false) }
  }

  const handleDeleteFixed = async (id, name) => {
    if (!confirm(`"${name}" 항목을 삭제하시겠습니까?`)) return
    await deleteFixedExpense(id)
    await fetchAll()
  }

  const handleUpdateFixed = async (e) => {
    e.preventDefault()
    if (!editingFixed.name.trim() || !editingFixed.amount || !editingFixed.category) return
    setSubmittingEdit(true)
    try {
      await updateFixedExpense(editingFixed.id, {
        name: editingFixed.name.trim(),
        amount: parseFloat(editingFixed.amount),
        category: editingFixed.category,
        day: parseInt(editingFixed.day),
      })
      setEditingFixed(null)
      await fetchAll()
    } finally { setSubmittingEdit(false) }
  }

  const totalFixed = fixedList.reduce((s, f) => s + f.amount, 0)

  return (
    <div className="page">
      <div className="settings-card">
        <h2 className="settings-section-title">
          고정비 관리
          <span className="category-count">매월 {totalFixed.toLocaleString('ko-KR')}원</span>
        </h2>
        <p className="settings-desc">매달 자동으로 나가는 항목을 등록해두면 내역에서 한번에 반영할 수 있습니다.</p>

        <form className="fixed-form" onSubmit={handleAddFixed}>
          <input
            type="text"
            placeholder="항목명 (예: 넷플릭스)"
            value={fixedForm.name}
            onChange={(e) => setFixedForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            type="number"
            placeholder="금액"
            value={fixedForm.amount}
            onChange={(e) => setFixedForm((p) => ({ ...p, amount: e.target.value }))}
            min="0"
          />
          <div style={{ width: 150 }}>
            <Select
              value={fixedForm.category}
              onChange={(v) => setFixedForm((p) => ({ ...p, category: v }))}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="카테고리"
            />
          </div>
          <div className="day-input">
            <span>매월</span>
            <input
              type="number"
              value={fixedForm.day}
              onChange={(e) => setFixedForm((p) => ({ ...p, day: e.target.value }))}
              min="1" max="28"
              style={{ width: 52 }}
            />
            <span>일</span>
          </div>
          <button type="submit" className="btn primary" disabled={submittingFixed}>
            {submittingFixed ? '추가 중...' : '+ 추가'}
          </button>
        </form>
        {fixedError && <p className="settings-error">{fixedError}</p>}

        <div className="fixed-list">
          {fixedList.length === 0 && <p className="empty-small">등록된 고정비 항목이 없습니다.</p>}
          {fixedList.map((f) => (
            <div key={f.id}>
              {editingFixed?.id === f.id ? (
                <form className="fixed-form" onSubmit={handleUpdateFixed} style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 12px' }}>
                  <input
                    type="text"
                    value={editingFixed.name}
                    onChange={(e) => setEditingFixed((p) => ({ ...p, name: e.target.value }))}
                    placeholder="항목명"
                  />
                  <input
                    type="number"
                    value={editingFixed.amount}
                    onChange={(e) => setEditingFixed((p) => ({ ...p, amount: e.target.value }))}
                    placeholder="금액"
                    min="0"
                  />
                  <div style={{ width: 150 }}>
                    <Select
                      value={editingFixed.category}
                      onChange={(v) => setEditingFixed((p) => ({ ...p, category: v }))}
                      options={categories.map((c) => ({ value: c.name, label: c.name }))}
                      placeholder="카테고리"
                    />
                  </div>
                  <div className="day-input">
                    <span>매월</span>
                    <input
                      type="number"
                      value={editingFixed.day}
                      onChange={(e) => setEditingFixed((p) => ({ ...p, day: e.target.value }))}
                      min="1" max="28"
                      style={{ width: 52 }}
                    />
                    <span>일</span>
                  </div>
                  <button type="submit" className="btn primary" disabled={submittingEdit}>
                    {submittingEdit ? '저장 중...' : '저장'}
                  </button>
                  <button type="button" className="btn secondary" onClick={() => setEditingFixed(null)}>취소</button>
                </form>
              ) : (
                <div className="fixed-item">
                  <div className="fixed-info">
                    <span className="fixed-name">{f.name}</span>
                    <span className="fixed-meta">{f.category} · 매월 {f.day}일</span>
                  </div>
                  <span className="fixed-amount">-{f.amount.toLocaleString('ko-KR')}원</span>
                  <button className="btn-icon" onClick={() => setEditingFixed({ ...f, amount: String(f.amount) })}>✏️</button>
                  <button className="btn-icon danger" onClick={() => handleDeleteFixed(f.id, f.name)}>🗑️</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
