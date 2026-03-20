import { useState, useEffect } from 'react'
import { getCategories, getBudgets, upsertBudget, deleteBudget } from '../api/client'

export default function BudgetPage() {
  const [categories, setCategories] = useState([])
  const [budgets, setBudgets] = useState({})   // { category: { id, amount } }
  const [editing, setEditing] = useState({})   // { category: inputValue }
  const [saving, setSaving] = useState({})

  const fetchAll = async () => {
    const [catRes, budRes] = await Promise.all([getCategories(), getBudgets()])
    setCategories(catRes.data.filter((c) => c.type === 'expense'))
    const map = {}
    budRes.data.forEach((b) => { map[b.category] = { id: b.id, amount: Number(b.amount) } })
    setBudgets(map)
  }

  useEffect(() => { fetchAll() }, [])

  const handleSave = async (category) => {
    const val = editing[category]
    if (val === undefined || val === '') return
    const amount = parseFloat(val)
    if (isNaN(amount) || amount < 0) return
    setSaving((p) => ({ ...p, [category]: true }))
    try {
      await upsertBudget({ category, amount })
      await fetchAll()
      setEditing((p) => { const n = { ...p }; delete n[category]; return n })
    } finally {
      setSaving((p) => { const n = { ...p }; delete n[category]; return n })
    }
  }

  const handleDelete = async (category) => {
    const b = budgets[category]
    if (!b) return
    if (!confirm(`"${category}" 예산을 삭제하시겠습니까?`)) return
    await deleteBudget(b.id)
    await fetchAll()
  }

  const totalBudget = Object.values(budgets).reduce((s, b) => s + b.amount, 0)

  return (
    <div className="page">
      <div className="settings-card">
        <h2 className="settings-section-title">
          카테고리별 예산 설정
          {totalBudget > 0 && (
            <span className="category-count">총 {totalBudget.toLocaleString()}원</span>
          )}
        </h2>
        <p className="settings-desc">카테고리별 월 예산을 설정하면 대시보드에서 남은 예산을 확인할 수 있습니다.</p>

        <div className="budget-list">
          {categories.length === 0 && (
            <p className="empty-small">지출 카테고리가 없습니다. 설정에서 카테고리를 추가해주세요.</p>
          )}
          {categories.map((c) => {
            const current = budgets[c.name]
            const inputVal = editing[c.name] ?? (current ? String(current.amount) : '')
            const isDirty = editing[c.name] !== undefined

            return (
              <div key={c.name} className="budget-row">
                <span className="budget-category">{c.name}</span>
                <div className="budget-input-wrap">
                  <input
                    type="number"
                    min="0"
                    placeholder="예산 금액"
                    value={inputVal}
                    onChange={(e) => setEditing((p) => ({ ...p, [c.name]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave(c.name)}
                  />
                  <span className="budget-unit">원</span>
                </div>
                <div className="budget-row-actions">
                  <button
                    className="btn primary"
                    style={{ padding: '4px 12px', fontSize: 13 }}
                    disabled={!isDirty || saving[c.name]}
                    onClick={() => handleSave(c.name)}
                  >
                    {saving[c.name] ? '저장 중...' : current ? '수정' : '저장'}
                  </button>
                  {current && (
                    <button
                      className="btn-icon danger"
                      onClick={() => handleDelete(c.name)}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
