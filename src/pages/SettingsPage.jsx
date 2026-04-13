import { useState, useEffect } from 'react'
import { getCategories, createCategory, deleteCategory, reorderCategories } from '../api/client'
import Select from '../components/Select'

export default function SettingsPage() {
  const [categories, setCategories] = useState([])
  const [catForm, setCatForm] = useState({ name: '', type: 'expense' })
  const [catError, setCatError] = useState('')
  const [submittingCat, setSubmittingCat] = useState(false)

  const fetchAll = async () => {
    const catRes = await getCategories()
    setCategories(catRes.data)
  }

  useEffect(() => { fetchAll() }, [])

  const handleAddCat = async (e) => {
    e.preventDefault()
    if (!catForm.name.trim()) return
    setCatError('')
    setSubmittingCat(true)
    try {
      await createCategory({ name: catForm.name.trim(), type: catForm.type })
      setCatForm({ name: '', type: 'expense' })
      await fetchAll()
    } catch (e) {
      setCatError(e.response?.data?.detail || '추가 실패')
    } finally { setSubmittingCat(false) }
  }

  const handleDeleteCat = async (name) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return
    await deleteCategory(name)
    await fetchAll()
  }

  const handleMove = async (type, index, direction) => {
    const list = categories.filter((c) => c.type === type)
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= list.length) return

    const reordered = [...list]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(newIndex, 0, moved)

    const updated = reordered.map((c, i) => ({ name: c.name, type: c.type, sort_order: i }))

    // 즉시 UI 반영
    const otherType = categories.filter((c) => c.type !== type)
    const newCategories = [
      ...otherType,
      ...updated.map((u) => ({ ...u })),
    ]
    newCategories.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'income' ? -1 : 1
      return (a.sort_order || 0) - (b.sort_order || 0)
    })
    setCategories(newCategories)

    await reorderCategories(updated)
  }

  const income = categories.filter((c) => c.type === 'income')
  const expense = categories.filter((c) => c.type === 'expense')

  const renderCategoryList = (list, type, label, badgeClass) => (
    <div className="settings-card">
      <h2 className="settings-section-title">
        {label} 카테고리 <span className="category-count">{list.length}개</span>
      </h2>
      <div className="category-list">
        {list.map((c, i) => (
          <div key={c.name} className={`category-item ${type}`}>
            <div className="category-order-buttons">
              <button
                className="btn-order"
                disabled={i === 0}
                onClick={() => handleMove(type, i, -1)}
                title="위로"
              >
                ▲
              </button>
              <button
                className="btn-order"
                disabled={i === list.length - 1}
                onClick={() => handleMove(type, i, 1)}
                title="아래로"
              >
                ▼
              </button>
            </div>
            <span className="category-name">{c.name}</span>
            <span className={`category-type-badge ${badgeClass}`}>{label}</span>
            <button className="btn-icon danger" onClick={() => handleDeleteCat(c.name)}>🗑️</button>
          </div>
        ))}
        {list.length === 0 && <p className="empty-small">{label} 카테고리가 없습니다.</p>}
      </div>
    </div>
  )

  return (
    <div className="page">

      {/* ── 카테고리 추가 ── */}
      <div className="settings-card">
        <h2 className="settings-section-title">카테고리 추가</h2>
        <form className="category-form" onSubmit={handleAddCat}>
          <div style={{ width: 110 }}>
            <Select
              value={catForm.type}
              onChange={(v) => setCatForm((p) => ({ ...p, type: v }))}
              options={[{ value: 'income', label: '수입' }, { value: 'expense', label: '지출' }]}
            />
          </div>
          <input
            type="text"
            placeholder="카테고리 이름"
            value={catForm.name}
            onChange={(e) => setCatForm((p) => ({ ...p, name: e.target.value }))}
            maxLength={20}
            style={{ width: 120 }}
          />
          <button type="submit" className="btn primary" disabled={submittingCat}>
            {submittingCat ? '...' : '+'}
          </button>
        </form>
        {catError && <p className="settings-error">{catError}</p>}
      </div>

      {/* ── 수입 카테고리 ── */}
      {renderCategoryList(income, 'income', '수입', 'income')}

      {/* ── 지출 카테고리 ── */}
      {renderCategoryList(expense, 'expense', '지출', 'expense')}
    </div>
  )
}
